'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatETB } from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PortalTokenPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'This link is invalid.');
        } else {
          setData(json);
        }
      } catch (err) {
        setError('Could not load your information. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  if (loading) {
    return (
      <PortalShell>
        <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell>
        <div className="card" style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Can&apos;t open this link</h1>
          <p style={{ fontSize: 14, color: '#4a4438' }}>{error}</p>
        </div>
      </PortalShell>
    );
  }

  if (selectedPayslip) {
    return (
      <PortalShell>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => setSelectedPayslip(null)}>
          Back
        </button>
        <div className="card" style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 18, marginBottom: 4 }}>
            Payslip — {MONTH_NAMES[selectedPayslip.payroll_runs?.period_month - 1]} {selectedPayslip.payroll_runs?.period_year}
          </h1>
          <p style={{ fontSize: 13, color: '#6b6355', marginBottom: 20 }}>{data.company?.name}</p>

          <table className="data-table" style={{ marginBottom: 16 }}>
            <tbody>
              <LineRow label="Basic salary" value={selectedPayslip.basic_salary} />
              <LineRow label="Transport allowance" value={selectedPayslip.transport_allowance} />
              <LineRow label="Housing allowance" value={selectedPayslip.housing_allowance} />
              <LineRow label="Overtime pay" value={selectedPayslip.overtime_pay} />
              <tr>
                <td style={{ fontWeight: 700 }}>Gross salary</td>
                <td className="font-num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatETB(selectedPayslip.gross_salary)}</td>
              </tr>
              <LineRow label="Income tax" value={selectedPayslip.income_tax} />
              <LineRow label="Pension (employee)" value={selectedPayslip.pension_employee} />
            </tbody>
          </table>

          <div
            style={{
              background: 'var(--parchment)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sharp)',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 700 }}>Net pay</span>
            <span className="font-num" style={{ fontWeight: 700, color: 'var(--forest)' }}>
              {formatETB(selectedPayslip.net_pay)}
            </span>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div style={{ marginBottom: 24 }}>
        <span className="page-eyebrow">{data.company?.name}</span>
        <h1 style={{ fontSize: 24 }}>{data.employee?.full_name}</h1>
        <p style={{ fontSize: 13, color: '#6b6355' }}>{data.employee?.position} · {data.employee?.department}</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Payslips</h2>
        {data.payslips.length === 0 ? (
          <div className="empty-state">
            <h3>No payslips yet</h3>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Net pay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.payslips.map((slip) => (
                <tr key={slip.id}>
                  <td>{MONTH_NAMES[slip.payroll_runs?.period_month - 1]} {slip.payroll_runs?.period_year}</td>
                  <td className="font-num">{formatETB(slip.net_pay)}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setSelectedPayslip(slip)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Leave requests</h2>
        {data.leaveRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No leave requests yet</h3>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.leaveRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textTransform: 'capitalize' }}>{req.leave_type}</td>
                  <td>{req.start_date} → {req.end_date}</td>
                  <td><span className={`badge badge-${req.status}`}>{req.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#6b6355', marginTop: 20, textAlign: 'center' }}>
        This link expires {new Date(data.expiresAt).toLocaleDateString()}. Ask your employer for a new one after that.
      </p>
    </PortalShell>
  );
}

function LineRow({ label, value }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="font-num" style={{ textAlign: 'right' }}>{formatETB(value)}</td>
    </tr>
  );
}

function PortalShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--parchment)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <span className="font-display" style={{ fontSize: 18, color: 'var(--ink)' }}>EthioPayroll</span>
          <span style={{ fontSize: 12, color: '#6b6355', marginLeft: 10 }}>Employee portal</span>
        </div>
        {children}
      </div>
    </div>
  );
}
