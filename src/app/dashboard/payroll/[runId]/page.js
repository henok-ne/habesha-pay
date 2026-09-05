'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function PayrollRunDetailPage() {
  const { runId } = useParams();
  const router = useRouter();

  const [run, setRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!runId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/payroll/${runId}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load payroll run.'
        );
      }

      setRun(data.run);
      setPayslips(data.payslips || []);
    } catch (err) {
      console.error(err);

      setError(
        err.message || 'Failed to load payroll run.'
      );
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFinalize() {
    setError('');

    if (payslips.length === 0) {
      setError(
        'This run has no payslips — delete it and create a new run instead of finalizing an empty one.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Finalize payroll for ${
        MONTH_NAMES[run.period_month - 1]
      } ${run.period_year}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch(
        `/api/payroll/${runId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'finalize',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to finalize payroll.'
        );
      }

      await load();
    } catch (err) {
      console.error(err);

      setError(
        err.message || 'Failed to finalize payroll.'
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkPaid() {
    setError('');

    const confirmed = window.confirm(
      'Mark this run as paid? Only do this once salaries have actually been transferred.'
    );

    if (!confirmed) {
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch(
        `/api/payroll/${runId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'paid',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to mark payroll as paid.'
        );
      }

      await load();
    } catch (err) {
      console.error(err);

      setError(
        err.message || 'Failed to mark payroll as paid.'
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteRun() {
    setError('');

    const confirmed = window.confirm(
      `Delete this draft run for ${
        MONTH_NAMES[run.period_month - 1]
      } ${run.period_year}? This removes its ${
        payslips.length
      } payslip(s) and can't be undone.`
    );

    if (!confirmed) {
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch(
        `/api/payroll/${runId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to delete payroll run.'
        );
      }

      router.push('/dashboard/payroll');
    } catch (err) {
      console.error(err);

      setError(
        err.message || 'Failed to delete payroll run.'
      );

      setUpdating(false);
    }
  }

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

  if (!run) {
    return (
      <div>
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error || 'Payroll run not found.'}
        </p>

        <Link
          href="/dashboard/payroll"
          className="btn btn-secondary"
        >
          Back to payroll
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Payroll run
          </span>

          <h1>
            {MONTH_NAMES[run.period_month - 1]}{' '}
            {run.period_year}
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <span
            className={`badge badge-${run.status}`}
          >
            {run.status}
          </span>

          <Link
            href={`/dashboard/payroll/${runId}/erca`}
            className="btn btn-secondary"
          >
            ERCA report
          </Link>

          {run.status === 'draft' && (
            <>
              <button
                className="btn btn-danger"
                onClick={handleDeleteRun}
                disabled={updating}
              >
                Delete run
              </button>

              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={
                  updating ||
                  payslips.length === 0
                }
                title={
                  payslips.length === 0
                    ? 'No payslips to finalize'
                    : undefined
                }
              >
                {updating
                  ? 'Finalizing…'
                  : 'Finalize run'}
              </button>
            </>
          )}

          {run.status === 'finalized' && (
            <button
              className="btn btn-primary"
              onClick={handleMarkPaid}
              disabled={updating}
            >
              {updating
                ? 'Updating…'
                : 'Mark as paid'}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="stat-tile">
          <span className="stat-label">
            Gross total
          </span>

          <span
            className="stat-value"
            style={{ fontSize: 20 }}
          >
            {formatETB(run.total_gross)}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Income tax
          </span>

          <span
            className="stat-value"
            style={{ fontSize: 20 }}
          >
            {formatETB(run.total_tax)}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Pension (employee)
          </span>

          <span
            className="stat-value"
            style={{ fontSize: 20 }}
          >
            {formatETB(run.total_pension)}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">
            Net total
          </span>

          <span
            className="stat-value"
            style={{ fontSize: 20 }}
          >
            {formatETB(run.total_net)}
          </span>
        </div>
      </div>

      {error && (
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      <div className="card">
        <h2 className="card-title">
          Payslips ({payslips.length})
        </h2>

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
                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {slip.employee?.full_name ||
                        'Unknown employee'}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: '#6b6355',
                      }}
                    >
                      {slip.employee?.position || ''}
                    </div>
                  </td>

                  <td className="font-num">
                    {formatETB(
                      slip.gross_salary
                    )}
                  </td>

                  <td className="font-num">
                    {formatETB(
                      slip.income_tax
                    )}
                  </td>

                  <td
                    className="font-num"
                    style={{
                      fontWeight: 600,
                    }}
                  >
                    {formatETB(slip.net_pay)}
                  </td>

                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: '4px 10px',
                        fontSize: 13,
                      }}
                      onClick={() =>
                        router.push(
                          `/dashboard/payroll/${runId}/payslip/${slip.employee_id}`
                        )
                      }
                    >
                      View payslip
                    </button>
                  </td>
                </tr>
              ))}

              {payslips.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: 'center',
                      padding: 30,
                    }}
                  >
                    No payslips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}