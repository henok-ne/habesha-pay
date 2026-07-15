'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollRunDetailPage() {
  const { runId } = useParams();
  const router = useRouter();
  const { companyId } = useCompany();
  const [run, setRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !runId) return;
    const [{ data: runData }, { data: slips }] = await Promise.all([
      supabase.from('payroll_runs').select('*').eq('id', runId).eq('company_id', companyId).single(),
      supabase
        .from('payslips')
        .select('*, employees(full_name, employee_code, position)')
        .eq('payroll_run_id', runId)
        .order('created_at', { ascending: true }),
    ]);
    setRun(runData);
    setPayslips(slips || []);
    setLoading(false);
  }, [companyId, runId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFinalize() {
    setError('');
    if (payslips.length === 0) {
      setError('This run has no payslips — delete it and create a new run instead of finalizing an empty one.');
      return;
    }
    if (!window.confirm(`Finalize payroll for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year}? There's no "undo" button for this in the app — you'd need to fix it directly in Supabase.`)) {
      return;
    }
    setUpdating(true);
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ status: 'finalized', finalized_at: new Date().toISOString() })
      .eq('id', runId)
      .eq('company_id', companyId);
    setUpdating(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.from('audit_log').insert({
      company_id: companyId,
      action: 'payroll.finalize',
      entity_type: 'payroll_runs',
      entity_id: runId,
    });

    load();
  }

  async function handleMarkPaid() {
    setError('');
    if (!window.confirm('Mark this run as paid? Only do this once salaries have actually been transferred.')) {
      return;
    }
    setUpdating(true);
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({ status: 'paid' })
      .eq('id', runId)
      .eq('company_id', companyId);
    setUpdating(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  }

  async function handleDeleteRun() {
    setError('');
    if (!window.confirm(`Delete this draft run for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year}? This removes its ${payslips.length} payslip(s) and can't be undone — the period becomes available to run again afterward.`)) {
      return;
    }
    setUpdating(true);

    // overtime_entries -> payroll_runs has no ON DELETE CASCADE (on
    // purpose — an overtime entry shouldn't vanish just because a run
    // did), so it has to be freed explicitly or the delete below fails
    // with a foreign-key violation.
    await supabase
      .from('overtime_entries')
      .update({ status: 'approved', payroll_run_id: null })
      .eq('payroll_run_id', runId)
      .eq('company_id', companyId);

    const { error: deleteError } = await supabase
      .from('payroll_runs')
      .delete()
      .eq('id', runId)
      .eq('company_id', companyId);

    setUpdating(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push('/dashboard/payroll');
  }

  if (loading || !run) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Payroll run</span>
          <h1>{MONTH_NAMES[run.period_month - 1]} {run.period_year}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge badge-${run.status}`}>{run.status}</span>
          <Link href={`/dashboard/payroll/${runId}/erca`} className="btn btn-secondary">
            ERCA report
          </Link>
          {run.status === 'draft' && (
            <>
              <button className="btn btn-danger" onClick={handleDeleteRun} disabled={updating}>
                Delete run
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={updating || payslips.length === 0}
                title={payslips.length === 0 ? 'No payslips to finalize' : undefined}
              >
                {updating ? 'Finalizing…' : 'Finalize run'}
              </button>
            </>
          )}
          {run.status === 'finalized' && (
            <button className="btn btn-primary" onClick={handleMarkPaid} disabled={updating}>
              {updating ? 'Updating…' : 'Mark as paid'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-tile">
          <span className="stat-label">Gross total</span>
          <span className="stat-value" style={{ fontSize: 20 }}>{formatETB(run.total_gross)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Income tax</span>
          <span className="stat-value" style={{ fontSize: 20 }}>{formatETB(run.total_tax)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Pension (employee)</span>
          <span className="stat-value" style={{ fontSize: 20 }}>{formatETB(run.total_pension)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Net total</span>
          <span className="stat-value" style={{ fontSize: 20 }}>{formatETB(run.total_net)}</span>
        </div>
      </div>

      {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card">
        <h2 className="card-title">Payslips ({payslips.length})</h2>
        <div className="table-scroll">
<table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Gross</th>
              <th>Tax</th>
              <th>Net pay</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((slip) => (
              <tr key={slip.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{slip.employees?.full_name}</div>
                  <div style={{ fontSize: 12, color: '#6b6355' }}>{slip.employees?.position}</div>
                </td>
                <td className="font-num">{formatETB(slip.gross_salary)}</td>
                <td className="font-num">{formatETB(slip.income_tax)}</td>
                <td className="font-num" style={{ fontWeight: 600 }}>{formatETB(slip.net_pay)}</td>
                <td>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 13 }}
                    onClick={() => router.push(`/dashboard/payroll/${runId}/payslip/${slip.employee_id}`)}
                  >
                    View payslip
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}
