'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  const { companyId, profile, loading: companyLoading } = useCompany();
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

  const load = useCallback(async () => {
    if (!companyId) return;
    const [{ data: emps }, { data: reqs }] = await Promise.all([
      supabase.from('employees').select('id, full_name').eq('company_id', companyId).eq('status', 'active').order('full_name'),
      supabase
        .from('leave_requests')
        .select('*, employees(full_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
    ]);
    setEmployees(emps || []);
    setRequests(reqs || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  function daysBetween(start, end) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.employee_id) return setError('Select an employee.');
    if (!form.start_date || !form.end_date) return setError('Select both start and end dates.');
    if (new Date(form.end_date) < new Date(form.start_date)) return setError('End date must be after start date.');

    setSaving(true);
    const { error: insertError } = await supabase.from('leave_requests').insert({
      company_id: companyId,
      employee_id: form.employee_id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_requested: daysBetween(form.start_date, form.end_date),
      reason: sanitizeText(form.reason) || null,
      status: 'pending',
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
    setShowForm(false);
    load();
  }

  async function handleReview(id, status) {
    await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);
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
          <h1>Leave</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New request'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h2 className="card-title">New leave request</h2>
          <div className="field">
            <label>Employee</label>
            <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Leave type</label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label>Start date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>End date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>Reason (optional)</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      )}

      <div className="card">
        <h2 className="card-title">All requests</h2>
        {requests.length === 0 ? (
          <div className="empty-state">
            <h3>No leave requests yet</h3>
            <p>New requests will appear here for review.</p>
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
                  <td>{req.employees?.full_name || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{req.leave_type}</td>
                  <td>{req.start_date} → {req.end_date}</td>
                  <td className="font-num">{req.days_requested}</td>
                  <td><span className={`badge badge-${req.status}`}>{req.status}</span></td>
                  <td>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleReview(req.id, 'approved')}>
                          Approve
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleReview(req.id, 'rejected')}>
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
