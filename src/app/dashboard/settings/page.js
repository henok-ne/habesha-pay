'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText, sanitizePhone, sanitizeTIN } from '@/lib/sanitize';

export default function SettingsPage() {
  const { companyId, company, role, refresh, loading: companyLoading } = useCompany();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    const payload = {
      name: sanitizeText(form.name),
      tin: sanitizeTIN(form.tin) || null,
      address: sanitizeText(form.address) || null,
      city: sanitizeText(form.city) || null,
      phone: sanitizePhone(form.phone) || null,
      pension_scheme: form.pension_scheme,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from('companies').update(payload).eq('id', companyId);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    refresh();
  }

  if (companyLoading || !form) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  const isAdmin = role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Company</span>
          <h1>Settings</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
        <h2 className="card-title">Company details</h2>

        <div className="field">
          <label>Company name</label>
          <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isAdmin} required />
        </div>
        <div className="field">
          <label>TIN</label>
          <input value={form.tin || ''} onChange={(e) => setForm({ ...form, tin: e.target.value })} disabled={!isAdmin} />
        </div>
        <div className="field">
          <label>Address</label>
          <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!isAdmin} />
        </div>
        <div className="field">
          <label>City</label>
          <input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!isAdmin} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isAdmin} />
        </div>
        <div className="field">
          <label>Pension scheme</label>
          <select value={form.pension_scheme || 'private'} onChange={(e) => setForm({ ...form, pension_scheme: e.target.value })} disabled={!isAdmin}>
            <option value="private">Private organization</option>
            <option value="government">Government</option>
          </select>
        </div>

        {!isAdmin && <p className="field-hint" style={{ marginBottom: 16 }}>Only admins can edit company settings.</p>}
        {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}
        {saved && <p style={{ color: 'var(--forest)', fontSize: 13, marginBottom: 16 }}>Settings saved.</p>}

        {isAdmin && (
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        )}
      </form>
    </div>
  );
}
