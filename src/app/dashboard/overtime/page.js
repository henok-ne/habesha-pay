'use client';

import { useEffect, useState, useCallback } from 'react';
import { sanitizeText, sanitizeNumber } from '@/lib/sanitize';
import { calculateOvertimePay, formatETB } from '@/lib/payrollCalc';

const OT_TYPES = [
  { value: 'weekday', label: 'Weekday (1.5x)' },
  { value: 'rest_day', label: 'Rest day (2x)' },
  { value: 'public_holiday', label: 'Public holiday (2.5x)' },
  { value: 'night', label: 'Night (1.25x)' },
];

const RATE_MULTIPLIERS = {
  weekday: 1.5,
  rest_day: 2.0,
  public_holiday: 2.5,
  night: 1.25,
};

export default function OvertimePage() {
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    work_date: '',
    hours: '',
    ot_type: 'weekday',
    note: '',
  });

  // =====================================================
  // LOAD DATA
  // =====================================================
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/overtime');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load overtime data');
      }

      const emps = data.employees || [];
      const rows = data.entries || [];

      setEmployees(emps);
      setEntries(rows);

      const map = {};

      emps.forEach((employee) => {
        map[employee.id] = employee;
      });

      setEmployeeMap(map);
    } catch (err) {
      console.error('Failed to load overtime:', err);
      setError(err.message || 'Failed to load overtime data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // =====================================================
  // SUBMIT OVERTIME
  // =====================================================
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.employee_id) {
      setError('Select an employee.');
      return;
    }

    if (!form.work_date) {
      setError('Select a date.');
      return;
    }

    const hours = sanitizeNumber(form.hours, {
      min: 0.25,
      max: 24,
    });

    if (!hours) {
      setError('Enter valid hours worked.');
      return;
    }

    const rateMultiplier = RATE_MULTIPLIERS[form.ot_type];

    setSaving(true);

    try {
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: form.employee_id,
          work_date: form.work_date,
          hours,
          rate_multiplier: rateMultiplier,
          note: sanitizeText(form.note) || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to create overtime entry'
        );
      }

      // Reset form
      setForm({
        employee_id: '',
        work_date: '',
        hours: '',
        ot_type: 'weekday',
        note: '',
      });

      setShowForm(false);

      // Reload entries
      await load();
    } catch (err) {
      console.error('Failed to save overtime:', err);
      setError(err.message || 'Failed to save overtime entry');
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // APPROVE OVERTIME
  // =====================================================
  async function handleApprove(id) {
    try {
      setError('');

      const response = await fetch('/api/overtime', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: 'approved',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to approve overtime'
        );
      }

      await load();
    } catch (err) {
      console.error('Failed to approve overtime:', err);
      setError(err.message || 'Failed to approve overtime');
    }
  }

  // =====================================================
  // LOADING
  // =====================================================
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

  // =====================================================
  // PAGE
  // =====================================================
  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Overtime</h1>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm((v) => !v);
            setError('');
          }}
        >
          {showForm ? 'Cancel' : 'Log overtime'}
        </button>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}
      {error && !showForm && (
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      {/* =================================================
          FORM
      ================================================= */}
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
            Log overtime entry
          </h2>

          {/* Employee */}
          <div className="field">
            <label>Employee</label>

            <select
              value={form.employee_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id: e.target.value,
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

          {/* Date + Hours */}
          <div
            className="grid-2"
            style={{ gap: 16 }}
          >
            <div className="field">
              <label>Date</label>

              <input
                type="date"
                value={form.work_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    work_date: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>Hours</label>

              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={form.hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hours: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          {/* Type */}
          <div className="field">
            <label>Type</label>

            <select
              value={form.ot_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  ot_type: e.target.value,
                })
              }
            >
              {OT_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="field">
            <label>Note (optional)</label>

            <input
              value={form.note}
              onChange={(e) =>
                setForm({
                  ...form,
                  note: e.target.value,
                })
              }
            />
          </div>

          {/* Estimated Pay */}
          {form.employee_id && form.hours && (
            <p
              className="field-hint"
              style={{ marginBottom: 16 }}
            >
              Estimated pay:{' '}
              {formatETB(
                calculateOvertimePay(
                  employeeMap[form.employee_id]?.basic_salary,
                  form.hours,
                  form.ot_type
                )
              )}
            </p>
          )}

          {/* Form Error */}
          {error && (
            <p className="field-error">
              {error}
            </p>
          )}

          {/* Save */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      )}

      {/* =================================================
          ENTRIES TABLE
      ================================================= */}
      <div className="card">
        <h2 className="card-title">
          All entries
        </h2>

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>No overtime logged yet</h3>

            <p>
              Approved entries automatically fold
              into the next payroll run.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Type</th>
                  <th>Est. pay</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => {
                  /*
                   * The API currently stores the rate
                   * multiplier, but the original frontend
                   * expects the OT type.
                   *
                   * Convert the multiplier back to a type
                   * for display.
                   */
                  const otType =
                    Object.keys(RATE_MULTIPLIERS).find(
                      (type) =>
                        RATE_MULTIPLIERS[type] ===
                        Number(entry.rate_multiplier)
                    ) || 'weekday';

                  return (
                    <tr key={entry.id}>
                      {/* Employee */}
                      <td>
                        {entry.employee_name ||
                          'Unknown Employee'}
                      </td>

                      {/* Date */}
                      <td>
                        {entry.work_date}
                      </td>

                      {/* Hours */}
                      <td className="font-num">
                        {entry.hours}
                      </td>

                      {/* Type */}
                      <td
                        style={{
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {otType.replace('_', ' ')}
                      </td>

                      {/* Estimated Pay */}
                      <td className="font-num">
                        {formatETB(
                          calculateOvertimePay(
                            entry.basic_salary,
                            entry.hours,
                            otType
                          )
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge badge-${entry.status}`}
                        >
                          {entry.status}
                        </span>
                      </td>

                      {/* Approve */}
                      <td>
                        {entry.status ===
                          'pending' && (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '4px 10px',
                              fontSize: 13,
                            }}
                            onClick={() =>
                              handleApprove(
                                entry.id
                              )
                            }
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}