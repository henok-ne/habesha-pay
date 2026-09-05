'use client';

import { useEffect, useState } from 'react';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function ReportsPage() {
  const [runs, setRuns] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/reports');

        if (!response.ok) {
          throw new Error('Failed to load reports');
        }

        const data = await response.json();

        setRuns(data.runs || []);
        setDepartmentBreakdown(data.departmentBreakdown || []);
      } catch (err) {
        console.error('Reports loading error:', err);
        setError('Unable to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) {
    return (
      <p className="font-num" style={{ color: '#6b6355' }}>
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
      </div>
    );
  }

  const maxNet = Math.max(
    ...runs.map((run) => Number(run.total_net) || 0),
    1
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1>Reports</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Net payroll by month</h2>

        {runs.length === 0 ? (
          <div className="empty-state">
            <h3>No payroll history yet</h3>
            <p>Run payroll a few times to see trends here.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              height: 200,
              paddingTop: 16,
            }}
          >
            {runs.map((run) => (
              <div
                key={run.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  className="font-num"
                  style={{
                    fontSize: 10,
                    color: '#6b6355',
                  }}
                >
                  {formatETB(run.total_net).replace('ETB ', '')}
                </span>

                <div
                  style={{
                    width: '100%',
                    maxWidth: 42,
                    height: `${Math.max(
                      (Number(run.total_net) / maxNet) * 140,
                      4
                    )}px`,
                    background: 'var(--forest)',
                    borderRadius: '3px 3px 0 0',
                  }}
                  title={formatETB(run.total_net)}
                />

                <span
                  className="font-num"
                  style={{
                    fontSize: 11,
                    color: '#6b6355',
                  }}
                >
                  {MONTH_NAMES[run.period_month - 1]}{' '}
                  {String(run.period_year).slice(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">
          Headcount & salary by department
        </h2>

        {departmentBreakdown.length === 0 ? (
          <div className="empty-state">
            <h3>No employees yet</h3>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Headcount</th>
                  <th>Total basic salary</th>
                </tr>
              </thead>

              <tbody>
                {departmentBreakdown.map((row) => (
                  <tr key={row.department}>
                    <td>{row.department}</td>

                    <td className="font-num">
                      {row.count}
                    </td>

                    <td className="font-num">
                      {formatETB(row.totalSalary)}
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