'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollListPage() {
  const { companyId, loading: companyLoading } = useCompany();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      const { data } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      setRuns(data || []);
      setLoading(false);
    }
    load();
  }, [companyId]);

  if (companyLoading || loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1>Payroll</h1>
        </div>
        <Link href="/dashboard/payroll/new" className="btn btn-primary">
          Run payroll
        </Link>
      </div>

      <div className="card">
        {runs.length === 0 ? (
          <div className="empty-state">
            <h3>No payroll runs yet</h3>
            <p>Start your first payroll run to generate payslips for your team.</p>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Gross</th>
                <th>Tax</th>
                <th>Pension</th>
                <th>Net</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{MONTH_NAMES[run.period_month - 1]} {run.period_year}</td>
                  <td className="font-num">{formatETB(run.total_gross)}</td>
                  <td className="font-num">{formatETB(run.total_tax)}</td>
                  <td className="font-num">{formatETB(run.total_pension)}</td>
                  <td className="font-num" style={{ fontWeight: 600 }}>{formatETB(run.total_net)}</td>
                  <td>
                    <span className={`badge badge-${run.status}`}>{run.status}</span>
                  </td>
                  <td>
                    <Link href={`/dashboard/payroll/${run.id}`} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </div>
    </div>
  );
}
