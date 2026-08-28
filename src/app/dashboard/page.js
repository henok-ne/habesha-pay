'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';

export default function DashboardOverview() {
  const { profile, loading: companyLoading } = useCompany();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyLoading) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/dashboard', {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to load dashboard data.'
          );
        }

        setStats(result.stats);
        setPendingLeave(result.pendingLeave || []);
      } catch (err) {
        console.error('Dashboard loading error:', err);
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [companyLoading]);

  if (companyLoading || loading) {
    return (
      <p className="font-num" style={{ color: '#6b6355' }}>
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="card-title">Unable to load dashboard</h2>

        <p style={{ color: '#b42318', marginBottom: 16 }}>
          {error}
        </p>

        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Overview</span>

          <h1>
            Welcome back
            {profile?.full_name
              ? `, ${profile.full_name.split(' ')[0]}`
              : ''}
          </h1>
        </div>

        <Link
          href="/dashboard/payroll/new"
          className="btn btn-primary"
        >
          Run payroll
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div className="stat-tile">
          <span className="stat-label">
            Active employees
          </span>

          <span className="stat-value">
            {stats?.employeeCount || 0}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Active contractors
          </span>

          <span className="stat-value">
            {stats?.contractorCount || 0}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Pending overtime entries
          </span>

          <span className="stat-value">
            {stats?.pendingOvertimeCount || 0}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Last payroll net total
          </span>

          <span
            className="stat-value"
            style={{ fontSize: 20 }}
          >
            {stats?.lastRun
              ? formatETB(stats.lastRun.totalNet)
              : '—'}
          </span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          Pending leave requests
        </h2>

        {pendingLeave.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing waiting on you</h3>

            <p>
              New leave requests will show up here for review.
            </p>
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
                    <td>
                      {req.employees?.full_name || '—'}
                    </td>

                    <td
                      style={{
                        textTransform: 'capitalize',
                      }}
                    >
                      {req.leave_type}
                    </td>

                    <td>
                      {req.start_date
                        ? new Date(
                            req.start_date
                          ).toLocaleDateString()
                        : '—'}{' '}
                      →{' '}
                      {req.end_date
                        ? new Date(
                            req.end_date
                          ).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="font-num">
                      {req.days_requested}
                    </td>

                    <td>
                      <Link
                        href="/dashboard/leave"
                        className="btn btn-ghost"
                        style={{
                          padding: '4px 10px',
                          fontSize: 13,
                        }}
                      >
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