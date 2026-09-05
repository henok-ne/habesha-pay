'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';
import { sanitizeNumber, sanitizeText } from '@/lib/sanitize';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { companyId, role } = useCompany();

  const [employee, setEmployee] = useState(null);
  const [payslips, setPayslips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState(null);

  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // ------------------------------------------------------------
  // Load employee from MongoDB
  // ------------------------------------------------------------

  const load = useCallback(async () => {
    if (!companyId || !id) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to load employee.'
        );
      }

      setEmployee(result.employee);
      setForm(result.employee);
      setPayslips(result.payslips || []);
    } catch (err) {
      console.error('Load employee error:', err);

      setError(
        err.message || 'Unable to load employee.'
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    load();
  }, [load]);

  // ------------------------------------------------------------
  // Update employee in MongoDB
  // ------------------------------------------------------------

  async function handleSave(e) {
    e.preventDefault();

    setError('');
    setSaving(true);

    try {
      const payload = {
        fullName: sanitizeText(form.full_name),

        position:
          sanitizeText(form.position) || undefined,

        department:
          sanitizeText(form.department) || undefined,

        basicSalary: sanitizeNumber(
          form.basic_salary,
          { min: 0 }
        ),

        transportAllowance: sanitizeNumber(
          form.transport_allowance,
          { min: 0 }
        ),

        housingAllowance: sanitizeNumber(
          form.housing_allowance,
          { min: 0 }
        ),

        otherAllowance: sanitizeNumber(
          form.other_allowance,
          { min: 0 }
        ),

        status: form.status,
      };

      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to update employee.'
        );
      }

      setEditing(false);

      await load();
    } catch (err) {
      console.error('Update employee error:', err);

      setError(
        err.message || 'Unable to update employee.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------
  // Generate MongoDB portal link
  // ------------------------------------------------------------

  async function handleGeneratePortalLink() {
    setPortalLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/employees/${id}/portal-link`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            'Failed to generate portal link.'
        );
      }

      // Copy the generated link to the clipboard
      await navigator.clipboard.writeText(
        data.portalUrl
      );

      alert(
        'Portal link copied to clipboard. It expires in 14 days.'
      );
    } catch (err) {
      console.error(
        'Portal link generation error:',
        err
      );

      setError(
        err.message ||
          'Failed to generate portal link.'
      );
    } finally {
      setPortalLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------

  if (loading || !employee || !form) {
    return (
      <p
        className="font-num"
        style={{ color: '#6b6355' }}
      >
        Loading…
      </p>
    );
  }

  // ------------------------------------------------------------
  // Employee detail page
  // ------------------------------------------------------------

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Employee
          </span>

          <h1>{employee.full_name}</h1>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          {role !== 'viewer' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGeneratePortalLink}
                disabled={portalLoading}
              >
                {portalLoading
                  ? 'Generating…'
                  : 'Copy portal link'}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setEditing((v) => !v)
                }
              >
                {editing
                  ? 'Cancel edit'
                  : 'Edit'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            borderColor: '#b42318',
          }}
        >
          <p
            className="field-error"
            style={{ margin: 0 }}
          >
            {error}
          </p>
        </div>
      )}

      {/* -------------------------------------------------------
          EDIT FORM
      ------------------------------------------------------- */}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="card"
          style={{
            maxWidth: 640,
            marginBottom: 24,
          }}
        >
          <div
            className="grid-2"
            style={{ gap: 16 }}
          >
            <div className="field">
              <label>
                Full name
              </label>

              <input
                value={form.full_name || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    full_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Status
              </label>

              <select
                value={form.status || 'active'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value,
                  })
                }
              >
                <option value="active">
                  Active
                </option>

                <option value="on_leave">
                  On leave
                </option>

                <option value="terminated">
                  Terminated
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                Position
              </label>

              <input
                value={form.position || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    position: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Department
              </label>

              <input
                value={form.department || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    department: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Basic salary
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basic_salary ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    basic_salary:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Transport allowance
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.transport_allowance ?? ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    transport_allowance:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Housing allowance
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.housing_allowance ?? ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    housing_allowance:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Other allowance
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.other_allowance ?? ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    other_allowance:
                      e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 12,
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : 'Save changes'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setEditing(false)
              }
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* -------------------------------------------------------
           DETAILS
        ------------------------------------------------------- */

        <div
          className="grid-2"
          style={{
            gap: 20,
            marginBottom: 24,
          }}
        >
          <div className="card">
            <h2 className="card-title">
              Details
            </h2>

            <DetailRow
              label="Employee code"
              value={employee.employee_code}
            />

            <DetailRow
              label="Position"
              value={employee.position}
            />

            <DetailRow
              label="Department"
              value={employee.department}
            />

            <DetailRow
              label="Employment type"
              value={employee.employment_type}
            />

            <DetailRow
              label="Status"
              value={
                <span
                  className={`badge badge-${employee.status}`}
                >
                  {employee.status
                    ?.replace('_', ' ')}
                </span>
              }
            />

            <DetailRow
              label="Email"
              value={employee.email}
            />

            <DetailRow
              label="Phone"
              value={employee.phone}
            />

            <DetailRow
              label="TIN"
              value={employee.tin}
            />

            <DetailRow
              label="Start date"
              value={
                employee.start_date
                  ? new Date(
                      employee.start_date
                    ).toLocaleDateString()
                  : null
              }
            />
          </div>

          <div className="card">
            <h2 className="card-title">
              Compensation
            </h2>

            <DetailRow
              label="Basic salary"
              value={formatETB(
                employee.basic_salary
              )}
              mono
            />

            <DetailRow
              label="Transport allowance"
              value={formatETB(
                employee.transport_allowance
              )}
              mono
            />

            <DetailRow
              label="Housing allowance"
              value={formatETB(
                employee.housing_allowance
              )}
              mono
            />

            <DetailRow
              label="Other allowance"
              value={formatETB(
                employee.other_allowance
              )}
              mono
            />

            <DetailRow
              label="Bank"
              value={employee.bank_name}
            />

            <DetailRow
              label="Account number"
              value={employee.bank_account}
            />

            <DetailRow
              label="Pension number"
              value={
                employee.pension_number
              }
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PAYSLIP HISTORY
      --------------------------------------------------------- */}

      <div className="card">
        <h2 className="card-title">
          Payslip history
        </h2>

        {payslips.length === 0 ? (
          <div className="empty-state">
            <h3>
              No payslips yet
            </h3>

            <p>
              Payslips will appear here once
              a payroll run includes this
              employee.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Gross</th>
                  <th>Net pay</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {payslips.map((slip) => (
                  <tr
                    key={
                      slip.id ||
                      slip._id
                    }
                  >
                    <td>
                      {slip.payroll_runs
                        ?.period_month ||
                        slip.payrollRun
                          ?.periodMonth}
                      /
                      {slip.payroll_runs
                        ?.period_year ||
                        slip.payrollRun
                          ?.periodYear}
                    </td>

                    <td className="font-num">
                      {formatETB(
                        slip.gross_salary ??
                          slip.grossSalary
                      )}
                    </td>

                    <td className="font-num">
                      {formatETB(
                        slip.net_pay ??
                          slip.netPay
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${
                          slip.payroll_runs
                            ?.status ||
                          slip.payrollRun
                            ?.status ||
                          'unknown'
                        }`}
                      >
                        {slip.payroll_runs
                          ?.status ||
                          slip.payrollRun
                            ?.status ||
                          '—'}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          padding:
                            '4px 10px',
                          fontSize: 13,
                        }}
                        onClick={() =>
                          router.push(
                            `/dashboard/payroll/${
                              slip.payroll_run_id ||
                              slip.payrollRunId
                            }/payslip/${
                              employee.id ||
                              employee._id
                            }`
                          )
                        }
                      >
                        View payslip
                      </button>
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

// ------------------------------------------------------------
// Reusable detail row
// ------------------------------------------------------------

function DetailRow({
  label,
  value,
  mono,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          'space-between',
        gap: 20,
        padding: '8px 0',
        borderBottom:
          '1px solid var(--line)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: '#6b6355',
        }}
      >
        {label}
      </span>

      <span
        className={
          mono ? 'font-num' : ''
        }
        style={{
          fontSize: 14,
          fontWeight: 500,
          textAlign: 'right',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}