'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PayrollListPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPayroll() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/payroll', {
          method: 'GET',
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load payroll.'
          );
        }

        setRuns(data.runs || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load payroll.');
      } finally {
        setLoading(false);
      }
    }

    loadPayroll();
  }, []);

  if (loading) {
    return (
      <p
        className="font-num"
        style={{ color: '#6b6355' }}
      >
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <div>
            <span className="page-eyebrow">Finance</span>
            <h1>Payroll</h1>
          </div>

          <Link
            href="/dashboard/payroll/new"
            className="btn btn-primary"
          >
            Run payroll
          </Link>
        </div>

        <div className="card">
          <p className="field-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1>Payroll</h1>
        </div>

        <Link
          href="/dashboard/payroll/new"
          className="btn btn-primary"
        >
          Run payroll
        </Link>
      </div>

      <div className="card">
        {runs.length === 0 ? (
          <div className="empty-state">
            <h3>No payroll runs yet</h3>
            <p>
              Start your first payroll run to generate
              payslips for your team.
            </p>
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
                    <td>
                      {MONTH_NAMES[run.period_month - 1]}{' '}
                      {run.period_year}
                    </td>

                    <td className="font-num">
                      {formatETB(run.total_gross)}
                    </td>

                    <td className="font-num">
                      {formatETB(run.total_tax)}
                    </td>

                    <td className="font-num">
                      {formatETB(run.total_pension)}
                    </td>

                    <td
                      className="font-num"
                      style={{ fontWeight: 600 }}
                    >
                      {formatETB(run.total_net)}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${run.status}`}
                      >
                        {run.status}
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/dashboard/payroll/${run.id}`}
                        className="btn btn-ghost"
                        style={{
                          padding: '4px 10px',
                          fontSize: 13,
                        }}
                      >
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