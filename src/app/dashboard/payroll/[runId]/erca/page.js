'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';
import { sanitizeCSVCell } from '@/lib/sanitize';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ErcaReportPage() {
  const { runId } = useParams();
  const router = useRouter();
  const { companyId, company } = useCompany();
  const [run, setRun] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      const [{ data: runData }, { data: slips }] = await Promise.all([
        supabase.from('payroll_runs').select('*').eq('id', runId).eq('company_id', companyId).single(),
        supabase
          .from('payslips')
          .select('*, employees(full_name, employee_code, tin)')
          .eq('payroll_run_id', runId)
          .order('created_at', { ascending: true }),
      ]);
      setRun(runData);
      setRows(slips || []);
      setLoading(false);
    }
    load();
  }, [companyId, runId]);

  function handleExportCSV() {
    const header = ['Employee Code', 'Full Name', 'TIN', 'Taxable Income', 'Income Tax', 'Pension Employee', 'Pension Employer'];
    const lines = rows.map((r) => [
      r.employees?.employee_code || '',
      r.employees?.full_name || '',
      r.employees?.tin || '',
      r.taxable_income,
      r.income_tax,
      r.pension_employee,
      r.pension_employer,
    ]);
    const csv = [header, ...lines].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erca-report-${run.period_year}-${String(run.period_month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !run) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      taxable: acc.taxable + Number(r.taxable_income),
      tax: acc.tax + Number(r.income_tax),
      pensionEmp: acc.pensionEmp + Number(r.pension_employee),
      pensionEmployer: acc.pensionEmployer + Number(r.pension_employer),
    }),
    { taxable: 0, tax: 0, pensionEmp: 0, pensionEmployer: 0 }
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">ERCA report</span>
          <h1>{MONTH_NAMES[run.period_month - 1]} {run.period_year}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Filing summary</h2>
        <p style={{ fontSize: 13, color: '#6b6355', marginBottom: 16 }}>
          {company?.name} · TIN: {company?.tin || '—'} · This summary reflects the payroll calculations recorded in
          EthioPayroll for this period. Verify figures against the current ERCA directive before filing.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="stat-tile">
            <span className="stat-label">Total taxable income</span>
            <span className="stat-value" style={{ fontSize: 18 }}>{formatETB(totals.taxable)}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Total income tax due</span>
            <span className="stat-value" style={{ fontSize: 18 }}>{formatETB(totals.tax)}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Pension (employee 7%)</span>
            <span className="stat-value" style={{ fontSize: 18 }}>{formatETB(totals.pensionEmp)}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Pension (employer 11%)</span>
            <span className="stat-value" style={{ fontSize: 18 }}>{formatETB(totals.pensionEmployer)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Per-employee breakdown</h2>
        <div className="table-scroll">
<table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>TIN</th>
              <th>Taxable income</th>
              <th>Income tax</th>
              <th>Pension (7%)</th>
              <th>Pension (11%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.employees?.full_name}</td>
                <td className="font-num">{r.employees?.tin || '—'}</td>
                <td className="font-num">{formatETB(r.taxable_income)}</td>
                <td className="font-num">{formatETB(r.income_tax)}</td>
                <td className="font-num">{formatETB(r.pension_employee)}</td>
                <td className="font-num">{formatETB(r.pension_employer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}

function csvEscape(value) {
  const str = sanitizeCSVCell(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
