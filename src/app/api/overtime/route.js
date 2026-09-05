import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import Employee from '@/lib/models/Employee';
import OvertimeEntry from '@/lib/models/OvertimeEntry';


// =====================================================
// GET
// Load active employees + overtime entries
// =====================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    // Get active employees
    const employees = await Employee.find({
      companyId,
      status: 'active',
    })
      .select(
        '_id fullName employeeCode position basicSalary'
      )
      .sort({ fullName: 1 })
      .lean();

    // Get overtime entries
    const overtimeEntries = await OvertimeEntry.find({
      companyId,
    })
      .populate(
        'employeeId',
        'fullName employeeCode position basicSalary'
      )
      .populate('approvedBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Format employees for the frontend
    const formattedEmployees = employees.map((employee) => ({
      id: employee._id.toString(),
      full_name: employee.fullName,
      employee_code: employee.employeeCode,
      position: employee.position || '',
      basic_salary: employee.basicSalary || 0,
    }));

    // Format overtime entries to match the old frontend
    const formattedEntries = overtimeEntries.map((entry) => ({
      id: entry._id.toString(),

      employee_id: entry.employeeId?._id?.toString() || '',
      employee_name: entry.employeeId?.fullName || 'Unknown Employee',
      employee_code: entry.employeeId?.employeeCode || '',
      basic_salary: entry.employeeId?.basicSalary || 0,

      work_date: entry.date
        ? new Date(entry.date).toISOString().split('T')[0]
        : '',

      hours: entry.hours || 0,
      rate_multiplier: entry.rate || 1,

      amount: entry.amount || 0,

      // Your MongoDB model calls these "reason"
      note: entry.reason || '',

      status: entry.status,

      approved_by: entry.approvedBy?._id?.toString() || null,
      approved_at: entry.approvedAt || null,

      created_at: entry.createdAt,
    }));

    return NextResponse.json({
      employees: formattedEmployees,
      entries: formattedEntries,
    });
  } catch (error) {
    console.error('GET /api/overtime error:', error);

    return NextResponse.json(
      { error: 'Failed to load overtime data' },
      { status: 500 }
    );
  }
}


// =====================================================
// POST
// Create a new overtime entry
// =====================================================
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    const body = await request.json();

    const {
      employee_id,
      work_date,
      hours,
      rate_multiplier,
      note,
    } = body;

    // -----------------------------
    // Validation
    // -----------------------------
    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee is required' },
        { status: 400 }
      );
    }

    if (!work_date) {
      return NextResponse.json(
        { error: 'Work date is required' },
        { status: 400 }
      );
    }

    const numericHours = Number(hours);

    if (
      !Number.isFinite(numericHours) ||
      numericHours <= 0
    ) {
      return NextResponse.json(
        { error: 'Hours must be greater than 0' },
        { status: 400 }
      );
    }

    const numericRate = Number(rate_multiplier);

    if (
      !Number.isFinite(numericRate) ||
      numericRate <= 0
    ) {
      return NextResponse.json(
        { error: 'Rate multiplier must be greater than 0' },
        { status: 400 }
      );
    }

    // -----------------------------
    // Verify employee belongs
    // to this company
    // -----------------------------
    const employee = await Employee.findOne({
      _id: employee_id,
      companyId,
      status: 'active',
    }).lean();

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // -----------------------------
    // Calculate overtime amount
    //
    // Hourly rate = monthly salary / 160
    //
    // amount = hourly rate × hours × multiplier
    // -----------------------------
    const hourlyRate =
      Number(employee.basicSalary || 0) / 160;

    const amount =
      hourlyRate *
      numericHours *
      numericRate;

    // -----------------------------
    // Create overtime entry
    // -----------------------------
    const overtimeEntry = await OvertimeEntry.create({
      companyId,
      employeeId: employee._id,

      date: new Date(work_date),

      hours: numericHours,

      rate: numericRate,

      amount: Math.round(amount * 100) / 100,

      reason:
        typeof note === 'string'
          ? note.trim()
          : '',

      status: 'pending',
    });

    return NextResponse.json(
      {
        message: 'Overtime entry created successfully',
        entry: {
          id: overtimeEntry._id.toString(),
          employee_id: employee._id.toString(),
          work_date: work_date,
          hours: overtimeEntry.hours,
          rate_multiplier: overtimeEntry.rate,
          amount: overtimeEntry.amount,
          note: overtimeEntry.reason || '',
          status: overtimeEntry.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/overtime error:', error);

    return NextResponse.json(
      { error: 'Failed to create overtime entry' },
      { status: 500 }
    );
  }
}


// =====================================================
// PATCH
// Approve / reject overtime
// =====================================================
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const companyId = session.user.companyId;

    const body = await request.json();

    const {
      id,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Overtime entry ID is required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        {
          error:
            'Status must be approved or rejected',
        },
        { status: 400 }
      );
    }

    // Find overtime entry belonging
    // to the current company
    const overtimeEntry =
      await OvertimeEntry.findOne({
        _id: id,
        companyId,
      });

    if (!overtimeEntry) {
      return NextResponse.json(
        { error: 'Overtime entry not found' },
        { status: 404 }
      );
    }

    // Only pending entries can be reviewed
    if (overtimeEntry.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            'Only pending overtime entries can be reviewed',
        },
        { status: 400 }
      );
    }

    overtimeEntry.status = status;

    if (status === 'approved') {
      overtimeEntry.approvedBy =
        session.user.id || null;

      overtimeEntry.approvedAt = new Date();
    } else {
      overtimeEntry.approvedBy = undefined;
      overtimeEntry.approvedAt = undefined;
    }

    await overtimeEntry.save();

    return NextResponse.json({
      message: `Overtime ${status} successfully`,
      entry: {
        id: overtimeEntry._id.toString(),
        status: overtimeEntry.status,
        approved_at: overtimeEntry.approvedAt || null,
      },
    });
  } catch (error) {
    console.error('PATCH /api/overtime error:', error);

    return NextResponse.json(
      { error: 'Failed to update overtime entry' },
      { status: 500 }
    );
  }
}