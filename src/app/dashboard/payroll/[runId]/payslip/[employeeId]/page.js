'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayslipPage() {
  const { runId, employeeId, empId } = useParams();
  const router = useRouter();

  const actualEmployeeId = employeeId || empId;

  const [payslip, setPayslip] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [run, setRun] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!runId || !actualEmployeeId) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/payroll/${runId}/payslip/${actualEmployeeId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load payslip');
        }

        setPayslip(data.payslip);
        setEmployee(data.employee);
        setRun(data.run);
        setCompany(data.company);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [runId, actualEmployeeId]);

  if (loading) {
    return (
      <p className="font-num" style={{ color: '#6b6355' }}>
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div>
        <p className="field-error" style={{ marginBottom: 16 }}>
          {error}
        </p>

        <button
          className="btn btn-secondary"
          onClick={() => router.back()}
        >
          Back
        </button>
      </div>
    );
  }

  if (!payslip || !employee || !run) {
    return (
      <p className="font-num" style={{ color: '#6b6355' }}>
        Payslip not found.
      </p>
    );
  }

  return (
    <div>
      <div
        className="page-header"
        style={{ printColorAdjust: 'exact' }}
      >
        <div>
          <span className="page-eyebrow">Payslip</span>

          <h1>
            {MONTH_NAMES[run.period_month - 1]} {run.period_year}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            Back
          </button>

          <button
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ maxWidth: 640 }}
        id="payslip-printable"
      >
        {/* Company header */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '2px solid var(--ink)',
          }}
        >
          <div>
            <div
              className="font-display"
              style={{ fontSize: 20 }}
            >
              {company?.name || 'Company'}
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#6b6355',
              }}
            >
              {company?.address || ''}
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#6b6355',
              }}
            >
              TIN: {company?.tin || '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 12,
                color: '#6b6355',
              }}
            >
              Payslip for
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#6b6355',
              }}
            >
              {MONTH_NAMES[run.period_month - 1]} {run.period_year}
            </div>
          </div>
        </div>

        {/* Employee information */}

        <div
          className="grid-2"
          style={{
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div className="field-label">Employee</div>

            <div style={{ fontWeight: 600 }}>
              {employee.full_name}
            </div>
          </div>

          <div>
            <div className="field-label">Employee code</div>

            <div style={{ fontWeight: 600 }}>
              {employee.employee_code || '—'}
            </div>
          </div>

          <div>
            <div className="field-label">Position</div>

            <div style={{ fontWeight: 600 }}>
              {employee.position || '—'}
            </div>
          </div>

          <div>
            <div className="field-label">Bank account</div>

            <div style={{ fontWeight: 600 }}>
              {employee.bank_account || '—'}
            </div>
          </div>
        </div>

        {/* Earnings */}

        <div className="table-scroll">
          <table
            className="data-table"
            style={{ marginBottom: 8 }}
          >
            <thead>
              <tr>
                <th>Earnings</th>

                <th style={{ textAlign: 'right' }}>
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              <LineRow
                label="Basic salary"
                value={payslip.basic_salary}
              />

              <LineRow
                label="Transport allowance"
                value={payslip.transport_allowance}
              />

              <LineRow
                label="Housing allowance"
                value={payslip.housing_allowance}
              />

              <LineRow
                label="Other allowance"
                value={payslip.other_allowance}
              />

              <LineRow
                label="Overtime pay"
                value={payslip.overtime_pay}
              />

              <tr>
                <td style={{ fontWeight: 700 }}>
                  Gross salary
                </td>

                <td
                  className="font-num"
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                  }}
                >
                  {formatETB(payslip.gross_salary)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}

        <div className="table-scroll">
          <table
            className="data-table"
            style={{ marginBottom: 24 }}
          >
            <thead>
              <tr>
                <th>Deductions</th>

                <th style={{ textAlign: 'right' }}>
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              <LineRow
                label="Income tax (ERCA)"
                value={payslip.income_tax}
              />

              <LineRow
                label="Pension (7% employee)"
                value={payslip.pension_employee}
              />

              <LineRow
                label="Other deductions"
                value={payslip.other_deductions}
              />

              <tr>
                <td style={{ fontWeight: 700 }}>
                  Total deductions
                </td>

                <td
                  className="font-num"
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                  }}
                >
                  {formatETB(
                    (payslip.income_tax || 0) +
                    (payslip.pension_employee || 0) +
                    (payslip.other_deductions || 0)
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net pay */}

        <div
          style={{
            background: 'var(--parchment)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sharp)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Net pay
          </span>

          <span
            className="font-num"
            style={{
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--forest)',
            }}
          >
            {formatETB(payslip.net_pay)}
          </span>
        </div>

        {/* Employer pension */}

        <p
          style={{
            fontSize: 11,
            color: '#6b6355',
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          Employer pension contribution (11%, not deducted
          from employee):{' '}
          {formatETB(payslip.pension_employer)}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .sidebar,
          .page-header button {
            display: none !important;
          }

          .app-shell {
            display: block !important;
          }

          .main-panel {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function LineRow({ label, value }) {
  return (
    <tr>
      <td>{label}</td>

      <td
        className="font-num"
        style={{ textAlign: 'right' }}
      >
        {formatETB(value || 0)}
      </td>
    </tr>
  );
}