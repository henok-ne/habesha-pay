'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeTIN } from '@/lib/sanitize';
import { formatETB } from '@/lib/payrollCalc';

const EMPTY_FORM = {
  full_name: '',
  company_name: '',
  email: '',
  phone: '',
  tin: '',
  service_description: '',
  rate: '',
  rate_type: 'fixed',
  withholding_tax_rate: '2',
};

export default function ContractorsPage() {
  const { companyId, loading: companyLoading } = useCompany();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('contractors').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    setContractors(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanName = sanitizeText(form.full_name);
    if (!cleanName) return setError('Full name is required.');

    setSaving(true);
    const { error: insertError } = await supabase.from('contractors').insert({
      company_id: companyId,
      full_name: cleanName,
      company_name: sanitizeText(form.company_name) || null,
      email: sanitizeEmail(form.email) || null,
      phone: sanitizePhone(form.phone) || null,
      tin: sanitizeTIN(form.tin) || null,
      service_description: sanitizeText(form.service_description) || null,
      rate: sanitizeNumber(form.rate, { min: 0 }),
      rate_type: form.rate_type,
      withholding_tax_rate: sanitizeNumber(form.withholding_tax_rate, { min: 0, max: 100 }),
      status: 'active',
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  async function handleToggleStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('contractors').update({ status: nextStatus }).eq('id', id).eq('company_id', companyId);
    load();
  }

  if (companyLoading || loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1>Contractors</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add contractor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <h2 className="card-title">New contractor</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label>Full name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Business name (optional)</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>TIN</label>
              <input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
            </div>
            <div className="field">
              <label>Withholding tax rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.withholding_tax_rate} onChange={(e) => setForm({ ...form, withholding_tax_rate: e.target.value })} />
              <span className="field-hint">ERCA default is 2% for goods, higher for certain services.</span>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Service description</label>
              <input value={form.service_description} onChange={(e) => setForm({ ...form, service_description: e.target.value })} />
            </div>
            <div className="field">
              <label>Rate (ETB)</label>
              <input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div className="field">
              <label>Rate type</label>
              <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
                <option value="per_project">Per project</option>
              </select>
            </div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save contractor'}
          </button>
        </form>
      )}

      <div className="card">
        <h2 className="card-title">All contractors</h2>
        {contractors.length === 0 ? (
          <div className="empty-state">
            <h3>No contractors yet</h3>
            <p>Contractors are paid and taxed separately from permanent employees.</p>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Rate</th>
                <th>Withholding</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                    {c.company_name && <div style={{ fontSize: 12, color: '#6b6355' }}>{c.company_name}</div>}
                  </td>
                  <td>{c.service_description || '—'}</td>
                  <td className="font-num">
                    {formatETB(c.rate)} <span style={{ fontSize: 11, color: '#6b6355' }}>/ {c.rate_type.replace('_', ' ')}</span>
                  </td>
                  <td className="font-num">{c.withholding_tax_rate}%</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleToggleStatus(c.id, c.status)}>
                      {c.status === 'active' ? 'Deactivate' : 'Reactivate'}
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
