import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import Employee from '@/lib/models/Employee';
import OvertimeEntry from '@/lib/models/OvertimeEntry';
import PayrollRun from '@/lib/models/PayrollRun';
import Payslip from '@/lib/models/Payslip';

import {
  calculatePayslip,
  calculateOvertimePay,
} from '@/lib/payrollCalc';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  await connectDB();

  let user = null;

  if (session.user.id) {
    user = await User.findById(session.user.id);
  }

  if (!user && session.user.email) {
    user = await User.findOne({
      email: session.user.email.toLowerCase(),
    });
  }

  return user;
}

/*
|--------------------------------------------------------------------------
| GET /api/payroll
|--------------------------------------------------------------------------
| Returns payroll runs for the currently authenticated user's company.
|
| ?preview=true&month=9&year=2026
| returns active employees + approved overtime for payroll preview.
|--------------------------------------------------------------------------
*/

export async function GET(request) {
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
        { error: 'User is not associated with a company.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const preview = searchParams.get('preview') === 'true';

    if (preview) {
      const month = Number(searchParams.get('month'));
      const year = Number(searchParams.get('year'));

      if (!month || month < 1 || month > 12 || !year) {
        return NextResponse.json(
          { error: 'Valid month and year are required.' },
          { status: 400 }
        );
      }

      const employees = await Employee.find({
        companyId: user.companyId,
        status: 'active',
      })
        .sort({ createdAt: -1 })
        .lean();

      const overtimeEntries = await OvertimeEntry.find({
        companyId: user.companyId,
        status: 'approved',
        $or: [
          { payrollRunId: null },
          { payrollRunId: { $exists: false } },
        ],
      })
        .sort({ workDate: 1 })
        .lean();

      const overtimeByEmployee = {};

      for (const entry of overtimeEntries) {
        const employeeId = String(entry.employeeId);

        if (!overtimeByEmployee[employeeId]) {
          overtimeByEmployee[employeeId] = [];
        }

        overtimeByEmployee[employeeId].push({
          ...entry,
          id: String(entry._id),
        });
      }

      const formattedEmployees = employees.map((employee) => ({
        ...employee,
        id: String(employee._id),
        _id: undefined,
        companyId: String(employee.companyId),
      }));

      return NextResponse.json({
        employees: formattedEmployees,
        overtimeByEmployee,
      });
    }

    const runs = await PayrollRun.find({
      companyId: user.companyId,
    })
      .sort({
        periodYear: -1,
        periodMonth: -1,
      })
      .lean();

    const formattedRuns = runs.map((run) => ({
      id: String(run._id),

      period_month: run.periodMonth,
      period_year: run.periodYear,

      status: run.status,

      total_gross: run.totalGross || 0,
      total_net: run.totalNet || 0,
      total_tax: run.totalTax || 0,
      total_pension: run.totalPension || 0,

      created_by: run.createdBy
        ? String(run.createdBy)
        : null,

      run_date: run.runDate,
      created_at: run.createdAt,
      finalized_at: run.finalizedAt,
    }));

    return NextResponse.json({
      runs: formattedRuns,
    });
  } catch (error) {
    console.error('GET /api/payroll error:', error);

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to load payroll data.',
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST /api/payroll
|--------------------------------------------------------------------------
| Creates:
|   1. PayrollRun
|   2. Payslips
|   3. Marks used overtime as paid
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  let createdRun = null;
  let createdPayslips = [];

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
        { error: 'User is not associated with a company.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const periodMonth = Number(body.periodMonth);
    const periodYear = Number(body.periodYear);

    if (!periodMonth || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json(
        { error: 'Invalid payroll month.' },
        { status: 400 }
      );
    }

    if (!periodYear || periodYear < 2000) {
      return NextResponse.json(
        { error: 'Invalid payroll year.' },
        { status: 400 }
      );
    }

    await connectDB();

    /*
     * Prevent duplicate payroll periods.
     */
    const existingRun = await PayrollRun.findOne({
      companyId: user.companyId,
      periodMonth,
      periodYear,
    });

    if (existingRun) {
      return NextResponse.json(
        {
          error:
            'A payroll run for this period already exists.',
        },
        { status: 409 }
      );
    }

    /*
     * Get active employees.
     */
    const employees = await Employee.find({
      companyId: user.companyId,
      status: 'active',
    }).lean();

    if (employees.length === 0) {
      return NextResponse.json(
        {
          error:
            'No active employees to run payroll for.',
        },
        { status: 400 }
      );
    }

    /*
     * Get approved overtime that has not already
     * been assigned to a payroll run.
     */
    const overtimeEntries = await OvertimeEntry.find({
      companyId: user.companyId,
      status: 'approved',
      $or: [
        { payrollRunId: null },
        { payrollRunId: { $exists: false } },
      ],
    }).lean();

    const overtimeByEmployee = {};

    for (const entry of overtimeEntries) {
      const employeeId = String(entry.employeeId);

      if (!overtimeByEmployee[employeeId]) {
        overtimeByEmployee[employeeId] = [];
      }

      overtimeByEmployee[employeeId].push(entry);
    }

    /*
     * Calculate payroll.
     *
     * IMPORTANT:
     * calculatePayslip() returns snake_case fields.
     * We explicitly map them below.
     */
    const calculatedRows = employees.map((employee) => {
      const employeeId = String(employee._id);

      const otEntries =
        overtimeByEmployee[employeeId] || [];

      const overtimePay = otEntries.reduce(
        (sum, entry) =>
          sum +
          calculateOvertimePay(
            employee.basicSalary,
            entry.hours,
            entry.otType
          ),
        0
      );

      const calc = calculatePayslip({
        basicSalary: employee.basicSalary,
        transportAllowance:
          employee.transportAllowance,
        housingAllowance:
          employee.housingAllowance,
        otherAllowance:
          employee.otherAllowance,
        overtimePay,
      });

      return {
        employee,
        otEntries,

        // Explicit mapping from calculatePayslip()
        basicSalary: calc.basic_salary,
        transportAllowance:
          calc.transport_allowance,
        housingAllowance:
          calc.housing_allowance,
        otherAllowance:
          calc.other_allowance,
        overtimePay:
          calc.overtime_pay,

        grossSalary: calc.gross_salary,
        taxableIncome: calc.taxable_income,
        incomeTax: calc.income_tax,

        pensionEmployee:
          calc.pension_employee,
        pensionEmployer:
          calc.pension_employer,

        otherDeductions:
          calc.other_deductions,

        netPay: calc.net_pay,
      };
    });

    /*
     * Calculate payroll totals.
     */
    const totals = calculatedRows.reduce(
      (acc, row) => ({
        gross:
          acc.gross + Number(row.grossSalary || 0),

        tax:
          acc.tax + Number(row.incomeTax || 0),

        pension:
          acc.pension +
          Number(row.pensionEmployee || 0),

        net:
          acc.net + Number(row.netPay || 0),
      }),
      {
        gross: 0,
        tax: 0,
        pension: 0,
        net: 0,
      }
    );

    /*
     * Create payroll run.
     */
    createdRun = await PayrollRun.create({
      companyId: user.companyId,

      periodMonth,
      periodYear,

      status: 'draft',

      totalGross: round2(totals.gross),
      totalNet: round2(totals.net),
      totalTax: round2(totals.tax),
      totalPension: round2(totals.pension),

      createdBy: user._id,
      runDate: new Date(),
    });

    /*
     * Create payslips.
     *
     * These names MUST match Payslip.js.
     */
    const payslipRows = calculatedRows.map((row) => ({
      payrollRunId: createdRun._id,
      employeeId: row.employee._id,
      companyId: user.companyId,

      basicSalary: row.basicSalary,

      transportAllowance:
        row.transportAllowance,

      housingAllowance:
        row.housingAllowance,

      otherAllowance:
        row.otherAllowance,

      overtimePay:
        row.overtimePay,

      grossSalary:
        row.grossSalary,

      taxableIncome:
        row.taxableIncome,

      incomeTax:
        row.incomeTax,

      pensionEmployee:
        row.pensionEmployee,

      pensionEmployer:
        row.pensionEmployer,

      otherDeductions:
        row.otherDeductions,

      // Payslip model will use netSalary
      netSalary:
        row.netPay,
    }));

    createdPayslips =
      await Payslip.insertMany(payslipRows);

    /*
     * Mark overtime used by this payroll run as paid.
     */
    const overtimeIds =
      calculatedRows.flatMap((row) =>
        row.otEntries.map((entry) => entry._id)
      );

    if (overtimeIds.length > 0) {
      await OvertimeEntry.updateMany(
        {
          _id: { $in: overtimeIds },
          companyId: user.companyId,
        },
        {
          $set: {
            status: 'paid',
            payrollRunId: createdRun._id,
          },
        }
      );
    }

    return NextResponse.json(
      {
        message:
          'Payroll run created successfully.',

        run: {
          id: String(createdRun._id),

          period_month:
            createdRun.periodMonth,

          period_year:
            createdRun.periodYear,

          status:
            createdRun.status,

          total_gross:
            createdRun.totalGross,

          total_net:
            createdRun.totalNet,

          total_tax:
            createdRun.totalTax,

          total_pension:
            createdRun.totalPension,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'POST /api/payroll error:',
      error
    );

    /*
     * Cleanup if something fails after the payroll
     * run has already been created.
     */
    try {
      if (createdPayslips.length > 0) {
        await Payslip.deleteMany({
          _id: {
            $in: createdPayslips.map(
              (payslip) => payslip._id
            ),
          },
        });
      }

      if (createdRun?._id) {
        await PayrollRun.deleteOne({
          _id: createdRun._id,
        });
      }
    } catch (cleanupError) {
      console.error(
        'Payroll cleanup error:',
        cleanupError
      );
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to create payroll run.',
      },
      { status: 500 }
    );
  }
}