import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Employee from '@/lib/models/Employee';
import Payslip from '@/lib/models/Payslip';

export async function GET(request, { params }) {
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
        {
          success: false,
          message: 'User is not associated with a company.',
        },
        { status: 404 }
      );
    }

    const { id } = await params;

    const employee = await Employee.findOne({
      _id: id,
      companyId: user.companyId,
    }).lean();

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found.',
        },
        { status: 404 }
      );
    }

    const payslips = await Payslip.find({
      employeeId: employee._id,
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    return NextResponse.json({
      success: true,
      employee: {
        id: employee._id.toString(),

        full_name: employee.fullName,
        employee_code: employee.employeeCode,

        email: employee.email || '',
        phone: employee.phone || '',
        tin: employee.tin || '',

        position: employee.position || '',
        department: employee.department || '',
        employment_type: employee.employmentType || '',

        start_date: employee.startDate || null,

        basic_salary: employee.basicSalary || 0,
        transport_allowance: employee.transportAllowance || 0,
        housing_allowance: employee.housingAllowance || 0,
        other_allowance: employee.otherAllowance || 0,

        bank_name: employee.bankName || '',
        bank_account: employee.bankAccount || '',
        pension_number: employee.pensionNumber || '',

        status: employee.status,

        created_at: employee.createdAt,
        updated_at: employee.updatedAt,
      },

      payslips: payslips.map((slip) => ({
        id: slip._id.toString(),
        payroll_run_id: slip.payrollRunId?.toString(),

        gross_salary: slip.grossSalary || 0,
        net_pay: slip.netPay || 0,

        period_month: slip.periodMonth,
        period_year: slip.periodYear,

        payroll_status: slip.status || null,

        created_at: slip.createdAt,
      })),
    });
  } catch (error) {
    console.error('Employee GET error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load employee.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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
      .select('companyId role')
      .lean();

    if (!user?.companyId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User is not associated with a company.',
        },
        { status: 404 }
      );
    }

    if (user.role === 'viewer') {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to edit employees.',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const update = {};

    if (body.fullName !== undefined) {
      update.fullName = String(body.fullName).trim();
    }

    if (body.position !== undefined) {
      update.position = body.position || undefined;
    }

    if (body.department !== undefined) {
      update.department = body.department || undefined;
    }

    if (body.status !== undefined) {
      update.status = body.status;
    }

    if (body.basicSalary !== undefined) {
      update.basicSalary = Number(body.basicSalary);
    }

    if (body.transportAllowance !== undefined) {
      update.transportAllowance = Number(body.transportAllowance);
    }

    if (body.housingAllowance !== undefined) {
      update.housingAllowance = Number(body.housingAllowance);
    }

    if (body.otherAllowance !== undefined) {
      update.otherAllowance = Number(body.otherAllowance);
    }

    const employee = await Employee.findOneAndUpdate(
      {
        _id: id,
        companyId: user.companyId,
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully.',
      employee: {
        id: employee._id.toString(),
        full_name: employee.fullName,
        employee_code: employee.employeeCode,
        status: employee.status,
      },
    });
  } catch (error) {
    console.error('Employee PATCH error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to update employee.',
      },
      { status: 500 }
    );
  }
}