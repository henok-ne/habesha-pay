'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';

export default function DashboardOverview() {
  const { companyId, profile, loading: companyLoading } = useCompany();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingLeave, setPendingLeave] = useState([]);

  useEffect(() => {
    if (!companyId) return;

    async function load() {
      const [
        { count: employeeCount },
        { count: contractorCount },
        { data: lastRun },
        { data: pendingLeaveRows },
        { count: pendingOvertimeCount },
      ] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
        supabase.from('contractors').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
        supabase
          .from('payroll_runs')
          .select('*')
          .eq('company_id', companyId)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('leave_requests')
          .select('*, employees(full_name)')
          .eq('company_id', companyId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('overtime_entries').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
      ]);

      setStats({
        employeeCount: employeeCount || 0,
        contractorCount: contractorCount || 0,
        lastRun,
        pendingOvertimeCount: pendingOvertimeCount || 0,
      });
      setPendingLeave(pendingLeaveRows || []);
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
          <span className="page-eyebrow">Overview</span>
          <h1>Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
        </div>
        <Link href="/dashboard/payroll/new" className="btn btn-primary">
          Run payroll
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="stat-tile">
          <span className="stat-label">Active employees</span>
          <span className="stat-value">{stats.employeeCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Active contractors</span>
          <span className="stat-value">{stats.contractorCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Pending overtime entries</span>
          <span className="stat-value">{stats.pendingOvertimeCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Last payroll net total</span>
          <span className="stat-value" style={{ fontSize: 20 }}>
            {stats.lastRun ? formatETB(stats.lastRun.total_net) : '—'}
          </span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Pending leave requests</h2>
        {pendingLeave.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing waiting on you</h3>
            <p>New leave requests will show up here for review.</p>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingLeave.map((req) => (
                <tr key={req.id}>
                  <td>{req.employees?.full_name || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{req.leave_type}</td>
                  <td>
                    {req.start_date} → {req.end_date}
                  </td>
                  <td className="font-num">{req.days_requested}</td>
                  <td>
                    <Link href="/dashboard/leave" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>
                      Review
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
