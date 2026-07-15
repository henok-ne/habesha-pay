'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText, sanitizeNumber } from '@/lib/sanitize';
import { calculateOvertimePay, formatETB } from '@/lib/payrollCalc';

const OT_TYPES = [
  { value: 'weekday', label: 'Weekday (1.5x)' },
  { value: 'rest_day', label: 'Rest day (2x)' },
  { value: 'public_holiday', label: 'Public holiday (2.5x)' },
  { value: 'night', label: 'Night (1.25x)' },
];

export default function OvertimePage() {
  const { companyId, loading: companyLoading } = useCompany();
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

  const load = useCallback(async () => {
    if (!companyId) return;
    const [{ data: emps }, { data: rows }] = await Promise.all([
      supabase.from('employees').select('id, full_name, basic_salary').eq('company_id', companyId).eq('status', 'active').order('full_name'),
      supabase
        .from('overtime_entries')
        .select('*, employees(full_name, basic_salary)')
        .eq('company_id', companyId)
        .order('work_date', { ascending: false }),
    ]);
    setEmployees(emps || []);
    setEntries(rows || []);
    const map = {};
    (emps || []).forEach((e) => { map[e.id] = e; });
    setEmployeeMap(map);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.employee_id) return setError('Select an employee.');
    if (!form.work_date) return setError('Select a date.');
    const hours = sanitizeNumber(form.hours, { min: 0.25, max: 24 });
    if (!hours) return setError('Enter valid hours worked.');

    setSaving(true);
    const { error: insertError } = await supabase.from('overtime_entries').insert({
      company_id: companyId,
      employee_id: form.employee_id,
      work_date: form.work_date,
      hours,
      rate_multiplier: { weekday: 1.5, rest_day: 2.0, public_holiday: 2.5, night: 1.25 }[form.ot_type],
      ot_type: form.ot_type,
      status: 'pending',
      note: sanitizeText(form.note) || null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ employee_id: '', work_date: '', hours: '', ot_type: 'weekday', note: '' });
    setShowForm(false);
    load();
  }

  async function handleApprove(id) {
    await supabase.from('overtime_entries').update({ status: 'approved' }).eq('id', id).eq('company_id', companyId);
    load();
  }

  if (companyLoading || loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Overtime</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Log overtime'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h2 className="card-title">Log overtime entry</h2>
          <div className="field">
            <label>Employee</label>
            <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>Hours</label>
              <input type="number" min="0.25" max="24" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.ot_type} onChange={(e) => setForm({ ...form, ot_type: e.target.value })}>
              {OT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {form.employee_id && form.hours && (
            <p className="field-hint" style={{ marginBottom: 16 }}>
              Estimated pay: {formatETB(calculateOvertimePay(employeeMap[form.employee_id]?.basic_salary, form.hours, form.ot_type))}
            </p>
          )}
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      )}

      <div className="card">
        <h2 className="card-title">All entries</h2>
        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>No overtime logged yet</h3>
            <p>Approved entries automatically fold into the next payroll run.</p>
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
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employees?.full_name}</td>
                  <td>{entry.work_date}</td>
                  <td className="font-num">{entry.hours}</td>
                  <td style={{ textTransform: 'capitalize' }}>{entry.ot_type.replace('_', ' ')}</td>
                  <td className="font-num">
                    {formatETB(calculateOvertimePay(entry.employees?.basic_salary, entry.hours, entry.ot_type))}
                  </td>
                  <td><span className={`badge badge-${entry.status}`}>{entry.status}</span></td>
                  <td>
                    {entry.status === 'pending' && (
                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleApprove(entry.id)}>
                        Approve
                      </button>
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
