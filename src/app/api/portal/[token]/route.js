import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import Employee from '@/lib/models/Employee';
import Company from '@/lib/models/Company';
import PortalToken from '@/lib/models/PortalToken';
import Payslip from '@/lib/models/Payslip';
import PayrollRun from '@/lib/models/PayrollRun';
import LeaveRequest from '@/lib/models/LeaveRequest';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { token } = await params;

    // Validate token
    if (!token || typeof token !== 'string' || token.length < 20) {
      return NextResponse.json(
        { error: 'Invalid access link.' },
        { status: 400 }
      );
    }

    // Find portal token in MongoDB
    const tokenRow = await PortalToken.findOne({ token });

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'This link is invalid or has already been used.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(tokenRow.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error:
            'This link has expired. Ask your employer for a new one.',
        },
        { status: 410 }
      );
    }

    // Find employee and company
    const [employee, company] = await Promise.all([
      Employee.findById(tokenRow.employeeId).lean(),
      Company.findById(tokenRow.companyId).lean(),
    ]);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee associated with this link was not found.' },
        { status: 404 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company associated with this link was not found.' },
        { status: 404 }
      );
    }

    // Get payslips
    const payslips = await Payslip.find({
      employeeId: tokenRow.employeeId,
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Get payroll runs for those payslips
    const payrollRunIds = payslips
      .map((slip) => slip.payrollRunId)
      .filter(Boolean);

    const payrollRuns = await PayrollRun.find({
      _id: { $in: payrollRunIds },
    }).lean();

    // Create lookup map for payroll runs
    const payrollRunMap = new Map(
      payrollRuns.map((run) => [
        String(run._id),
        run,
      ])
    );

    // Convert payslips to the structure expected by the portal page
    const formattedPayslips = payslips.map((slip) => {
      const payrollRun = payrollRunMap.get(
        String(slip.payrollRunId)
      );

      return {
        ...slip,
        id: String(slip._id),

        payroll_runs: payrollRun
          ? {
              period_month: payrollRun.periodMonth,
              period_year: payrollRun.periodYear,
              status: payrollRun.status,
            }
          : null,
      };
    });

    // Get leave requests
    const leaveRequests = await LeaveRequest.find({
      employeeId: tokenRow.employeeId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Convert leave requests to the structure expected by the portal page
    const formattedLeaveRequests = leaveRequests.map((request) => ({
      ...request,
      id: String(request._id),

      leave_type: request.leaveType,
      start_date: request.startDate,
      end_date: request.endDate,
      days_requested: request.daysRequested,
    }));

    // Record when the portal link was accessed.
    // This does NOT invalidate the link.
    await PortalToken.updateOne(
      { token },
      {
        $set: {
          usedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      employee: {
        full_name: employee.fullName,
        employee_code: employee.employeeCode,
        position: employee.position,
        department: employee.department,
      },

      company: {
        name: company.name,
        address: company.address,
        tin: company.tin,
      },

      payslips: formattedPayslips,

      leaveRequests: formattedLeaveRequests,

      expiresAt: tokenRow.expiresAt,
    });
  } catch (error) {
    console.error('Portal API error:', error);

    return NextResponse.json(
      {
        error: 'Unable to load the employee portal.',
      },
      { status: 500 }
    );
  }
}