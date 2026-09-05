'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText } from '@/lib/sanitize';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
];

export default function LeavePage() {
  const { companyId, loading: companyLoading } = useCompany();

  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Load employees and leave requests
  const load = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/leave');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load leave data.'
        );
      }

      setEmployees(data.employees || []);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Leave load error:', error);

      setError(
        error.message ||
          'Failed to load leave data.'
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Calculate number of days
  function daysBetween(start, end) {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    const diff =
      (endDate - startDate) /
        (1000 * 60 * 60 * 24) +
      1;

    return diff > 0 ? diff : 0;
  }

  // Submit new leave request
  async function handleSubmit(e) {
    e.preventDefault();

    setError('');

    if (!form.employee_id) {
      setError('Select an employee.');
      return;
    }

    if (!form.start_date || !form.end_date) {
      setError(
        'Select both start and end dates.'
      );
      return;
    }

    if (
      new Date(form.end_date) <
      new Date(form.start_date)
    ) {
      setError(
        'End date must be after start date.'
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        '/api/leave',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: form.employee_id,
            leave_type: form.leave_type,
            start_date: form.start_date,
            end_date: form.end_date,
            reason:
              sanitizeText(form.reason) || '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to create leave request.'
        );
      }

      // Reset form
      setForm({
        employee_id: '',
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
      });

      setShowForm(false);

      // Reload requests
      await load();
    } catch (error) {
      console.error(
        'Leave submit error:',
        error
      );

      setError(
        error.message ||
          'Failed to create leave request.'
      );
    } finally {
      setSaving(false);
    }
  }

  // Approve / reject leave request
  async function handleReview(id, status) {
    try {
      setError('');

      const response = await fetch(
        '/api/leave',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to update leave request.'
        );
      }

      await load();
    } catch (error) {
      console.error(
        'Leave review error:',
        error
      );

      setError(
        error.message ||
          'Failed to update leave request.'
      );
    }
  }

  if (companyLoading || loading) {
    return (
      <p
        className="font-num"
        style={{ color: '#6b6355' }}
      >
        Loading…
      </p>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            HR
          </span>

          <h1>Leave</h1>
        </div>

        <button
          className="btn btn-primary"
          onClick={() =>
            setShowForm((v) => !v)
          }
        >
          {showForm
            ? 'Cancel'
            : 'New request'}
        </button>
      </div>

      {error && (
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            marginBottom: 20,
            maxWidth: 560,
          }}
        >
          <h2 className="card-title">
            New leave request
          </h2>

          <div className="field">
            <label>Employee</label>

            <select
              value={form.employee_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id:
                    e.target.value,
                })
              }
              required
            >
              <option value="">
                Select employee…
              </option>

              {employees.map((emp) => (
                <option
                  key={emp.id}
                  value={emp.id}
                >
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Leave type</label>

            <select
              value={form.leave_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  leave_type:
                    e.target.value,
                })
              }
            >
              {LEAVE_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="grid-2"
            style={{ gap: 16 }}
          >
            <div className="field">
              <label>Start date</label>

              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_date:
                      e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>End date</label>

              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    end_date:
                      e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          <div className="field">
            <label>
              Reason (optional)
            </label>

            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) =>
                setForm({
                  ...form,
                  reason: e.target.value,
                })
              }
            />
          </div>

          {form.start_date &&
            form.end_date && (
              <p
                className="font-num"
                style={{
                  marginBottom: 16,
                  color: '#6b6355',
                }}
              >
                Days requested:{' '}
                <strong>
                  {daysBetween(
                    form.start_date,
                    form.end_date
                  )}
                </strong>
              </p>
            )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? 'Submitting…'
              : 'Submit request'}
          </button>
        </form>
      )}

      <div className="card">
        <h2 className="card-title">
          All requests
        </h2>

        {requests.length === 0 ? (
          <div className="empty-state">
            <h3>
              No leave requests yet
            </h3>

            <p>
              New requests will appear
              here for review.
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
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      {req.employees
                        ?.full_name ||
                        '—'}
                    </td>

                    <td
                      style={{
                        textTransform:
                          'capitalize',
                      }}
                    >
                      {req.leave_type}
                    </td>

                    <td>
                      {req.start_date} →{' '}
                      {req.end_date}
                    </td>

                    <td className="font-num">
                      {req.days_requested}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${req.status}`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td>
                      {req.status ===
                        'pending' && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                          }}
                        >
                          <button
                            className="btn btn-primary"
                            style={{
                              padding:
                                '4px 10px',
                              fontSize: 13,
                            }}
                            onClick={() =>
                              handleReview(
                                req.id,
                                'approved'
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="btn btn-danger"
                            style={{
                              padding:
                                '4px 10px',
                              fontSize: 13,
                            }}
                            onClick={() =>
                              handleReview(
                                req.id,
                                'rejected'
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}
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