import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Employee from '@/lib/models/Employee';
import Contractor from '@/lib/models/Contractor';
import PayrollRun from '@/lib/models/PayrollRun';
import LeaveRequest from '@/lib/models/LeaveRequest';
import OvertimeEntry from '@/lib/models/OvertimeEntry';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated.' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id)
      .select('companyId')
      .lean();

    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, message: 'User is not associated with a company.' },
        { status: 404 }
      );
    }

    const companyId = user.companyId;

    const [
      employeeCount,
      contractorCount,
      lastRun,
      pendingLeaveRows,
      pendingOvertimeCount,
    ] = await Promise.all([
      Employee.countDocuments({
        companyId,
        status: 'active',
      }),

      Contractor.countDocuments({
        companyId,
        status: 'active',
      }),

      PayrollRun.findOne({
        companyId,
      })
        .sort({
          periodYear: -1,
          periodMonth: -1,
        })
        .lean(),

      LeaveRequest.find({
        companyId,
        status: 'pending',
      })
        .populate('employeeId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      OvertimeEntry.countDocuments({
        companyId,
        status: 'pending',
      }),
    ]);

    const pendingLeave = pendingLeaveRows.map((request) => ({
      id: request._id.toString(),
      leave_type: request.leaveType,
      start_date: request.startDate,
      end_date: request.endDate,
      days_requested: request.daysRequested,
      employees: request.employeeId
        ? {
            full_name: request.employeeId.fullName,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,

      stats: {
        employeeCount,
        contractorCount,
        pendingOvertimeCount,
        lastRun: lastRun
          ? {
              id: lastRun._id.toString(),
              periodYear: lastRun.periodYear,
              periodMonth: lastRun.periodMonth,
              totalNet: lastRun.totalNet,
              status: lastRun.status,
            }
          : null,
      },

      pendingLeave,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load dashboard data.',
      },
      { status: 500 }
    );
  }
}