import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import Employee from '@/lib/models/Employee';
import PayrollRun from '@/lib/models/PayrollRun';
import Payslip from '@/lib/models/Payslip';

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

    const { id: runId, employeeId } = await params;

    // Get logged-in user
    const user = await User.findById(session.user.id).lean();

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: 'User company not found' },
        { status: 403 }
      );
    }

    const companyId = user.companyId;

    // Get payroll run belonging to user's company
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

    // Get employee belonging to user's company
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    }).lean();

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Get payslip for this employee and payroll run
    const payslip = await Payslip.findOne({
      payrollRunId: runId,
      employeeId,
      companyId,
    }).lean();

    if (!payslip) {
      return NextResponse.json(
        { error: 'Payslip not found' },
        { status: 404 }
      );
    }

    // Get company information
    const company = await Company.findById(companyId).lean();

    return NextResponse.json({
      payslip: {
        id: payslip._id.toString(),

        basic_salary: payslip.basicSalary || 0,
        transport_allowance: payslip.transportAllowance || 0,
        housing_allowance: payslip.housingAllowance || 0,
        other_allowance: payslip.otherAllowance || 0,
        overtime_pay: payslip.overtimePay || 0,

        gross_salary: payslip.grossSalary || 0,
        taxable_income: payslip.taxableIncome || 0,

        income_tax: payslip.incomeTax || 0,
        pension_employee: payslip.pensionEmployee || 0,
        pension_employer: payslip.pensionEmployer || 0,
        other_deductions: payslip.otherDeductions || 0,

       net_pay: payslip.netSalary || 0,
      },

      employee: {
        id: employee._id.toString(),
        full_name: employee.fullName,
        employee_code: employee.employeeCode,
        position: employee.position,
        bank_account: employee.bankAccount,
      },

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
            address: company.address,
            tin: company.tin,
          }
        : null,
    });
  } catch (error) {
    console.error('Payslip API error:', error);

    return NextResponse.json(
      { error: 'Failed to load payslip' },
      { status: 500 }
    );
  }
}