'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

  const load = useCallback(async () => {
    if (!companyId || !id) return;
    const [{ data: emp }, { data: slips }] = await Promise.all([
      supabase.from('employees').select('*').eq('id', id).eq('company_id', companyId).single(),
      supabase
        .from('payslips')
        .select('*, payroll_runs(period_month, period_year, status)')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);
    setEmployee(emp);
    setForm(emp);
    setPayslips(slips || []);
    setLoading(false);
  }, [companyId, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      full_name: sanitizeText(form.full_name),
      position: sanitizeText(form.position) || null,
      department: sanitizeText(form.department) || null,
      basic_salary: sanitizeNumber(form.basic_salary, { min: 0 }),
      transport_allowance: sanitizeNumber(form.transport_allowance, { min: 0 }),
      housing_allowance: sanitizeNumber(form.housing_allowance, { min: 0 }),
      other_allowance: sanitizeNumber(form.other_allowance, { min: 0 }),
      status: form.status,
    };

    const { error: updateError } = await supabase.from('employees').update(payload).eq('id', id).eq('company_id', companyId);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    load();
  }

  async function handleGeneratePortalLink() {
    // A random, opaque token — never a predictable sequence like employee id + timestamp.
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error: tokenError } = await supabase.from('portal_tokens').insert({
      token,
      employee_id: id,
      company_id: companyId,
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      setError(tokenError.message);
      return;
    }

    const link = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(link);
    alert('Portal link copied to clipboard. It expires in 14 days.');
  }

  if (loading || !employee) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Employee</span>
          <h1>{employee.full_name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {role !== 'viewer' && (
            <>
              <button className="btn btn-secondary" onClick={handleGeneratePortalLink}>
                Copy portal link
              </button>
              <button className="btn btn-primary" onClick={() => setEditing((v) => !v)}>
                {editing ? 'Cancel edit' : 'Edit'}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="card" style={{ maxWidth: 640, marginBottom: 24 }}>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label>Full name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div className="field">
              <label>Position</label>
              <input value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="field">
              <label>Department</label>
              <input value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="field">
              <label>Basic salary</label>
              <input type="number" min="0" step="0.01" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
            </div>
            <div className="field">
              <label>Transport allowance</label>
              <input type="number" min="0" step="0.01" value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: e.target.value })} />
            </div>
            <div className="field">
              <label>Housing allowance</label>
              <input type="number" min="0" step="0.01" value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })} />
            </div>
            <div className="field">
              <label>Other allowance</label>
              <input type="number" min="0" step="0.01" value={form.other_allowance} onChange={(e) => setForm({ ...form, other_allowance: e.target.value })} />
            </div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : (
        <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
          <div className="card">
            <h2 className="card-title">Details</h2>
            <DetailRow label="Employee code" value={employee.employee_code} />
            <DetailRow label="Position" value={employee.position} />
            <DetailRow label="Department" value={employee.department} />
            <DetailRow label="Employment type" value={employee.employment_type} />
            <DetailRow label="Status" value={<span className={`badge badge-${employee.status}`}>{employee.status.replace('_', ' ')}</span>} />
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Phone" value={employee.phone} />
          </div>
          <div className="card">
            <h2 className="card-title">Compensation</h2>
            <DetailRow label="Basic salary" value={formatETB(employee.basic_salary)} mono />
            <DetailRow label="Transport allowance" value={formatETB(employee.transport_allowance)} mono />
            <DetailRow label="Housing allowance" value={formatETB(employee.housing_allowance)} mono />
            <DetailRow label="Other allowance" value={formatETB(employee.other_allowance)} mono />
            <DetailRow label="Bank" value={employee.bank_name} />
            <DetailRow label="Account number" value={employee.bank_account} />
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Payslip history</h2>
        {payslips.length === 0 ? (
          <div className="empty-state">
            <h3>No payslips yet</h3>
            <p>Payslips will appear here once a payroll run includes this employee.</p>
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
                <tr key={slip.id}>
                  <td>
                    {slip.payroll_runs?.period_month}/{slip.payroll_runs?.period_year}
                  </td>
                  <td className="font-num">{formatETB(slip.gross_salary)}</td>
                  <td className="font-num">{formatETB(slip.net_pay)}</td>
                  <td>
                    <span className={`badge badge-${slip.payroll_runs?.status}`}>{slip.payroll_runs?.status}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 13 }}
                      onClick={() => router.push(`/dashboard/payroll/${slip.payroll_run_id}/payslip/${employee.id}`)}
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

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 13, color: '#6b6355' }}>{label}</span>
      <span className={mono ? 'font-num' : ''} style={{ fontSize: 14, fontWeight: 500 }}>
        {value || '—'}
      </span>
    </div>
  );
}
