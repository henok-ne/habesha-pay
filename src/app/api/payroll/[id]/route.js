import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';

import User from '@/lib/models/User';
import PayrollRun from '@/lib/models/PayrollRun';
import Payslip from '@/lib/models/Payslip';
import Employee from '@/lib/models/Employee';
import OvertimeEntry from '@/lib/models/OvertimeEntry';
import AuditLog from '@/lib/models/AuditLog';

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

function formatPayslip(slip, employee) {
  return {
    id: String(slip._id),
    employee_id: String(slip.employeeId),

    basic_salary: slip.basicSalary,
    transport_allowance: slip.transportAllowance,
    housing_allowance: slip.housingAllowance,
    other_allowance: slip.otherAllowance,

    overtime_pay: slip.overtimePay,

    gross_salary: slip.grossSalary,
    taxable_income: slip.taxableIncome,
    income_tax: slip.incomeTax,

    pension_employee: slip.pensionEmployee,
    pension_employer: slip.pensionEmployer,

    other_deductions: slip.otherDeductions,
    net_pay: slip.netSalary,

    employee: employee
      ? {
          full_name: employee.fullName,
          employee_code: employee.employeeCode,
          position: employee.position,
        }
      : null,
  };
}

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const run = await PayrollRun.findOne({
      _id: params.id,
      companyId: user.companyId,
    }).lean();

    if (!run) {
      return NextResponse.json(
        { error: 'Payroll run not found.' },
        { status: 404 }
      );
    }

    const slips = await Payslip.find({
      payrollRunId: run._id,
      companyId: user.companyId,
    })
      .sort({ createdAt: 1 })
      .lean();

    const employeeIds = slips.map(
      (slip) => slip.employeeId
    );

    const employees = await Employee.find({
      _id: { $in: employeeIds },
      companyId: user.companyId,
    }).lean();

    const employeeMap = {};

    for (const employee of employees) {
      employeeMap[String(employee._id)] =
        employee;
    }

    const formattedPayslips = slips.map(
      (slip) =>
        formatPayslip(
          slip,
          employeeMap[
            String(slip.employeeId)
          ]
        )
    );

    return NextResponse.json({
      run: {
        id: String(run._id),
        period_month: run.periodMonth,
        period_year: run.periodYear,
        status: run.status,
        total_gross: run.totalGross,
        total_net: run.totalNet,
        total_tax: run.totalTax,
        total_pension: run.totalPension,
        created_by: run.createdBy
          ? String(run.createdBy)
          : null,
        run_date: run.runDate,
        created_at: run.createdAt,
        finalized_at: run.finalizedAt,
      },

      payslips: formattedPayslips,
    });
  } catch (error) {
    console.error(
      'GET /api/payroll/[id] error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to load payroll run.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const action = body.action;

    const run = await PayrollRun.findOne({
      _id: params.id,
      companyId: user.companyId,
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Payroll run not found.' },
        { status: 404 }
      );
    }

    if (action === 'finalize') {
      if (run.status !== 'draft') {
        return NextResponse.json(
          {
            error:
              'Only draft payroll runs can be finalized.',
          },
          { status: 400 }
        );
      }

      const payslipCount =
        await Payslip.countDocuments({
          payrollRunId: run._id,
          companyId: user.companyId,
        });

      if (payslipCount === 0) {
        return NextResponse.json(
          {
            error:
              'This payroll run has no payslips.',
          },
          { status: 400 }
        );
      }

      run.status = 'finalized';
      run.finalizedAt = new Date();

      await run.save();

      /*
       * Audit log is optional. If your AuditLog model
       * exists, create the record.
       */
      if (AuditLog) {
        try {
          await AuditLog.create({
            companyId: user.companyId,
            action: 'payroll.finalize',
            entityType: 'payroll_runs',
            entityId: run._id,
          });
        } catch (auditError) {
          console.error(
            'Audit log error:',
            auditError
          );
        }
      }

      return NextResponse.json({
        message: 'Payroll finalized successfully.',
      });
    }

    if (action === 'paid') {
      if (run.status !== 'finalized') {
        return NextResponse.json(
          {
            error:
              'Only finalized payroll runs can be marked as paid.',
          },
          { status: 400 }
        );
      }

      run.status = 'paid';

      await run.save();

      return NextResponse.json({
        message: 'Payroll marked as paid.',
      });
    }

    return NextResponse.json(
      { error: 'Invalid payroll action.' },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      'PATCH /api/payroll/[id] error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to update payroll run.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const run = await PayrollRun.findOne({
      _id: params.id,
      companyId: user.companyId,
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Payroll run not found.' },
        { status: 404 }
      );
    }

    if (run.status !== 'draft') {
      return NextResponse.json(
        {
          error:
            'Only draft payroll runs can be deleted.',
        },
        { status: 400 }
      );
    }

    /*
     * Find overtime entries belonging to this run
     * and return them to approved/unassigned.
     */
    await OvertimeEntry.updateMany(
      {
        payrollRunId: run._id,
        companyId: user.companyId,
      },
      {
        $set: {
          status: 'approved',
          payrollRunId: null,
        },
      }
    );

    /*
     * Delete payslips first.
     */
    await Payslip.deleteMany({
      payrollRunId: run._id,
      companyId: user.companyId,
    });

    /*
     * Delete payroll run.
     */
    await PayrollRun.deleteOne({
      _id: run._id,
      companyId: user.companyId,
    });

    return NextResponse.json({
      message: 'Payroll run deleted successfully.',
    });
  } catch (error) {
    console.error(
      'DELETE /api/payroll/[id] error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to delete payroll run.',
      },
      { status: 500 }
    );
  }
}