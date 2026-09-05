import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Employee from '@/lib/models/Employee';
import LeaveRequest from '@/lib/models/LeaveRequest';

async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await connectDB();

  const user = await User.findById(session.user.id);

  return user;
}

// GET — Load employees and leave requests
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'Company not found.' },
        { status: 403 }
      );
    }

    const companyId = user.companyId;

    const [employees, requests] = await Promise.all([
      Employee.find({
        companyId,
        status: 'active',
      })
        .select('_id fullName employeeCode position')
        .sort({ fullName: 1 })
        .lean(),

      LeaveRequest.find({
        companyId,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const employeeMap = {};

    for (const employee of employees) {
      employeeMap[String(employee._id)] = employee;
    }

    const formattedEmployees = employees.map((employee) => ({
      id: String(employee._id),
      full_name: employee.fullName,
      employee_code: employee.employeeCode,
      position: employee.position,
    }));

    const formattedRequests = requests.map((request) => {
      const employee =
        employeeMap[String(request.employeeId)];

      return {
        id: String(request._id),
        employee_id: String(request.employeeId),

        leave_type: request.leaveType,

        start_date: request.startDate
          ? request.startDate.toISOString().split('T')[0]
          : null,

        end_date: request.endDate
          ? request.endDate.toISOString().split('T')[0]
          : null,

        days_requested: request.daysRequested,

        reason: request.reason || null,

        status: request.status,

        reviewed_by: request.reviewedBy
          ? String(request.reviewedBy)
          : null,

        reviewed_at: request.reviewedAt || null,

        review_comment:
          request.reviewComment || null,

        created_at: request.createdAt,

        employees: employee
          ? {
              full_name: employee.fullName,
            }
          : null,
      };
    });

    return NextResponse.json({
      employees: formattedEmployees,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('GET /api/leave error:', error);

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to load leave requests.',
      },
      { status: 500 }
    );
  }
}

// POST — Create a leave request
export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'Company not found.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
    } = body;

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Select an employee.' },
        { status: 400 }
      );
    }

    if (!leave_type) {
      return NextResponse.json(
        { error: 'Select a leave type.' },
        { status: 400 }
      );
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        {
          error:
            'Select both start and end dates.',
        },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        { error: 'Invalid leave dates.' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        {
          error:
            'End date must be after start date.',
        },
        { status: 400 }
      );
    }

    // Make sure employee belongs to this company
    const employee = await Employee.findOne({
      _id: employee_id,
      companyId: user.companyId,
      status: 'active',
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found.' },
        { status: 404 }
      );
    }

    // Calculate inclusive number of days
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const daysRequested =
      Math.floor(
        (endDate - startDate) /
          millisecondsPerDay
      ) + 1;

    const leaveRequest =
      await LeaveRequest.create({
        companyId: user.companyId,
        employeeId: employee._id,
        leaveType: leave_type,
        startDate,
        endDate,
        daysRequested,
        reason: reason?.trim() || undefined,
        status: 'pending',
      });

    return NextResponse.json(
      {
        message:
          'Leave request created successfully.',
        request: {
          id: String(leaveRequest._id),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/leave error:', error);

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to create leave request.',
      },
      { status: 500 }
    );
  }
}

// PATCH — Approve or reject a leave request
export async function PATCH(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'Company not found.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      id,
      status,
      review_comment,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave request ID is required.' },
        { status: 400 }
      );
    }

    if (
      status !== 'approved' &&
      status !== 'rejected' &&
      status !== 'cancelled'
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid leave status.',
        },
        { status: 400 }
      );
    }

    const leaveRequest =
      await LeaveRequest.findOne({
        _id: id,
        companyId: user.companyId,
      });

    if (!leaveRequest) {
      return NextResponse.json(
        {
          error:
            'Leave request not found.',
        },
        { status: 404 }
      );
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            'Only pending leave requests can be reviewed.',
        },
        { status: 400 }
      );
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = user._id;
    leaveRequest.reviewedAt = new Date();

    if (review_comment) {
      leaveRequest.reviewComment =
        review_comment.trim();
    }

    await leaveRequest.save();

    return NextResponse.json({
      message:
        `Leave request ${status} successfully.`,
    });
  } catch (error) {
    console.error('PATCH /api/leave error:', error);

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to review leave request.',
      },
      { status: 500 }
    );
  }
}