'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { calculatePayslip, calculateOvertimePay, formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function NewPayrollRunPage() {
  const router = useRouter();
  const { companyId, profile } = useCompany();
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [overtimeByEmployee, setOvertimeByEmployee] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      const [{ data: emps }, { data: pendingOT }] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', companyId).eq('status', 'active'),
        supabase.from('overtime_entries').select('*').eq('company_id', companyId).eq('status', 'approved').is('payroll_run_id', null),
      ]);
      setEmployees(emps || []);

      const grouped = {};
      for (const entry of pendingOT || []) {
        if (!grouped[entry.employee_id]) grouped[entry.employee_id] = [];
        grouped[entry.employee_id].push(entry);
      }
      setOvertimeByEmployee(grouped);
      setLoading(false);
    }
    load();
  }, [companyId]);

  const preview = employees.map((emp) => {
    const otEntries = overtimeByEmployee[emp.id] || [];
    const overtimePay = otEntries.reduce(
      (sum, entry) => sum + calculateOvertimePay(emp.basic_salary, entry.hours, entry.ot_type),
      0
    );
    const calc = calculatePayslip({
      basicSalary: emp.basic_salary,
      transportAllowance: emp.transport_allowance,
      housingAllowance: emp.housing_allowance,
      otherAllowance: emp.other_allowance,
      overtimePay,
    });
    return { employee: emp, otEntries, ...calc };
  });

  const totals = preview.reduce(
    (acc, row) => ({
      gross: acc.gross + row.gross_salary,
      tax: acc.tax + row.income_tax,
      pension: acc.pension + row.pension_employee,
      net: acc.net + row.net_pay,
    }),
    { gross: 0, tax: 0, pension: 0, net: 0 }
  );

  async function handleCreateRun() {
    setError('');
    if (preview.length === 0) {
      setError('No active employees to run payroll for.');
      return;
    }
    setSaving(true);

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        company_id: companyId,
        period_month: periodMonth,
        period_year: periodYear,
        status: 'draft',
        total_gross: round2(totals.gross),
        total_net: round2(totals.net),
        total_tax: round2(totals.tax),
        total_pension: round2(totals.pension),
        created_by: profile?.id,
      })
      .select()
      .single();

    if (runError) {
      setSaving(false);
      setError(
        runError.code === '23505'
          ? 'A payroll run for this period already exists.'
          : runError.message
      );
      return;
    }

    const payslipRows = preview.map((row) => ({
      payroll_run_id: run.id,
      employee_id: row.employee.id,
      company_id: companyId,
      basic_salary: row.basic_salary,
      transport_allowance: row.transport_allowance,
      housing_allowance: row.housing_allowance,
      other_allowance: row.other_allowance,
      overtime_pay: row.overtime_pay,
      gross_salary: row.gross_salary,
      taxable_income: row.taxable_income,
      income_tax: row.income_tax,
      pension_employee: row.pension_employee,
      pension_employer: row.pension_employer,
      other_deductions: row.other_deductions,
      net_pay: row.net_pay,
    }));

    const { error: payslipError } = await supabase.from('payslips').insert(payslipRows);

    if (payslipError) {
      // Supabase JS can't wrap the two inserts in one transaction, so if
      // payslips fail after the run row was already created, clean that
      // row back up ourselves — otherwise it sits there forever as an
      // empty 'draft' run, and the unique (company, month, year)
      // constraint means this exact period could never be tried again.
      const { error: cleanupError } = await supabase.from('payroll_runs').delete().eq('id', run.id);
      setSaving(false);
      setError(
        cleanupError
          ? `Payslips failed (${payslipError.message}), and the run couldn't be cleaned up automatically (${cleanupError.message}). Open the run and delete it manually before retrying.`
          : `Payslips failed: ${payslipError.message}. Nothing was saved — you can fix the issue and try again.`
      );
      return;
    }

    // Mark the overtime entries used in this run as paid and tie them to the run.
    const usedOvertimeIds = preview.flatMap((row) => row.otEntries.map((e) => e.id));
    if (usedOvertimeIds.length > 0) {
      await supabase
        .from('overtime_entries')
        .update({ status: 'paid', payroll_run_id: run.id })
        .in('id', usedOvertimeIds);
    }

    setSaving(false);
    router.push(`/dashboard/payroll/${run.id}`);
  }

  if (loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1>Run payroll</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Period</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Month</label>
            <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Year</label>
            <input type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} style={{ width: 100 }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Preview — {preview.length} active employees</h2>
        {preview.length === 0 ? (
          <div className="empty-state">
            <h3>No active employees</h3>
            <p>Add employees before running payroll.</p>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Gross</th>
                <th>Tax</th>
                <th>Pension (employee)</th>
                <th>Overtime</th>
                <th>Net pay</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.employee.id}>
                  <td>{row.employee.full_name}</td>
                  <td className="font-num">{formatETB(row.gross_salary)}</td>
                  <td className="font-num">{formatETB(row.income_tax)}</td>
                  <td className="font-num">{formatETB(row.pension_employee)}</td>
                  <td className="font-num">{formatETB(row.overtime_pay)}</td>
                  <td className="font-num" style={{ fontWeight: 600 }}>{formatETB(row.net_pay)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Totals</td>
                <td className="font-num" style={{ fontWeight: 700 }}>{formatETB(totals.gross)}</td>
                <td className="font-num" style={{ fontWeight: 700 }}>{formatETB(totals.tax)}</td>
                <td className="font-num" style={{ fontWeight: 700 }}>{formatETB(totals.pension)}</td>
                <td></td>
                <td className="font-num" style={{ fontWeight: 700 }}>{formatETB(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
</div>
        )}
      </div>

      {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleCreateRun} disabled={saving || preview.length === 0}>
          {saving ? 'Creating run…' : 'Create payroll run'}
        </button>
        <button className="btn btn-secondary" onClick={() => router.push('/dashboard/payroll')}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
