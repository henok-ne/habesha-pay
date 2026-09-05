import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import PayrollRun from '@/lib/models/PayrollRun';
import Employee from '@/lib/models/Employee';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const companyId = session.user.companyId;

    await connectDB();

    const [payrollRuns, employees] = await Promise.all([
      PayrollRun.find({ companyId })
        .sort({ periodYear: -1, periodMonth: -1 })
        .limit(12)
        .lean(),

      Employee.find({
        companyId,
        status: 'active',
      })
        .select('department basicSalary')
        .lean(),
    ]);

    const runs = payrollRuns
      .map((run) => ({
        id: run._id.toString(),
        period_year: run.periodYear,
        period_month: run.periodMonth,
        total_net: Number(run.totalNet) || 0,
      }))
      .reverse();

    const grouped = {};

    for (const employee of employees) {
      const department = employee.department || 'Unassigned';

      if (!grouped[department]) {
        grouped[department] = {
          department,
          count: 0,
          totalSalary: 0,
        };
      }

      grouped[department].count += 1;
      grouped[department].totalSalary +=
        Number(employee.basicSalary) || 0;
    }

    const departmentBreakdown = Object.values(grouped).sort(
      (a, b) => b.totalSalary - a.totalSalary
    );

    return NextResponse.json({
      runs,
      departmentBreakdown,
    });
  } catch (error) {
    console.error('Reports API error:', error);

    return NextResponse.json(
      { error: 'Failed to load reports' },
      { status: 500 }
    );
  }
}