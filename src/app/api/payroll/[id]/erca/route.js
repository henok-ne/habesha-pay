import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import PayrollRun from '@/lib/models/PayrollRun';
import Payslip from '@/lib/models/Payslip';
import Employee from '@/lib/models/Employee';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id: runId } = await params;

    // Get logged-in user
    const user = await User.findById(session.user.id).lean();

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: 'User company not found' },
        { status: 403 }
      );
    }

    const companyId = user.companyId;

    // Get payroll run
    const run = await PayrollRun.findOne({
      _id: runId,
      companyId,
    }).lean();

    if (!run) {
      return NextResponse.json(
        { error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    // Get payslips
    const slips = await Payslip.find({
      payrollRunId: runId,
      companyId,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Get employees
    const employeeIds = slips.map((slip) => slip.employeeId);

    const employees = await Employee.find({
      _id: { $in: employeeIds },
      companyId,
    }).lean();

    const employeeMap = new Map(
      employees.map((employee) => [
        employee._id.toString(),
        employee,
      ])
    );

    // Get company
    const company = await Company.findById(companyId).lean();

    // Format response for existing ERCA page
    const rows = slips.map((slip) => {
      const employee = employeeMap.get(
        slip.employeeId.toString()
      );

      return {
        id: slip._id.toString(),

        employee: {
          full_name: employee?.fullName || '',
          employee_code: employee?.employeeCode || '',
          tin: employee?.tin || '',
        },

        taxable_income: slip.taxableIncome || 0,
        income_tax: slip.incomeTax || 0,
        pension_employee: slip.pensionEmployee || 0,
        pension_employer: slip.pensionEmployer || 0,
      };
    });

    return NextResponse.json({
      run: {
        id: run._id.toString(),
        period_month: run.periodMonth,
        period_year: run.periodYear,
        status: run.status,
      },

      company: company
        ? {
            id: company._id.toString(),
            name: company.name,
            tin: company.tin,
          }
        : null,

      rows,
    });
  } catch (error) {
    console.error('ERCA report API error:', error);

    return NextResponse.json(
      { error: 'Failed to load ERCA report' },
      { status: 500 }
    );
  }
}