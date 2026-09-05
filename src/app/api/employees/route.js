import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Employee from '@/lib/models/Employee';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated.',
        },
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

    const employees = await Employee.find({
      companyId: user.companyId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedEmployees = employees.map((employee) => ({
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

      basic_salary: employee.basicSalary,

      transport_allowance: employee.transportAllowance || 0,
      housing_allowance: employee.housingAllowance || 0,
      other_allowance: employee.otherAllowance || 0,

      bank_name: employee.bankName || '',
      bank_account: employee.bankAccount || '',
      pension_number: employee.pensionNumber || '',

      status: employee.status,

      created_at: employee.createdAt,
      updated_at: employee.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      employees: formattedEmployees,
    });
  } catch (error) {
    console.error('Employees GET error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load employees.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated.',
        },
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

    const body = await request.json();

    if (!body.fullName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Full name is required.',
        },
        { status: 400 }
      );
    }

    if (
      body.basicSalary === undefined ||
      body.basicSalary === null ||
      Number.isNaN(Number(body.basicSalary))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Basic salary is required.',
        },
        { status: 400 }
      );
    }

    const employee = await Employee.create({
      companyId: user.companyId,

      employeeCode: body.employeeCode || undefined,
      fullName: body.fullName,

      email: body.email || undefined,
      phone: body.phone || undefined,
      tin: body.tin || undefined,

      position: body.position || undefined,
      department: body.department || undefined,
      employmentType: body.employmentType || 'permanent',

      startDate: body.startDate || undefined,

      basicSalary: Number(body.basicSalary),

      transportAllowance: Number(body.transportAllowance || 0),
      housingAllowance: Number(body.housingAllowance || 0),
      otherAllowance: Number(body.otherAllowance || 0),

      bankName: body.bankName || undefined,
      bankAccount: body.bankAccount || undefined,

      pensionNumber: body.pensionNumber || undefined,

      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Employee created successfully.',
        employee: {
          id: employee._id.toString(),
          fullName: employee.fullName,
          employeeCode: employee.employeeCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Employees POST error:', error);

    // Handle duplicate employee code
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            'An employee with this employee code already exists.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to create employee.',
      },
      { status: 500 }
    );
  }
}