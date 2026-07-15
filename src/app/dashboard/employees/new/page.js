'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeTIN } from '@/lib/sanitize';

const EMPTY_FORM = {
  employee_code: '',
  full_name: '',
  email: '',
  phone: '',
  tin: '',
  position: '',
  department: '',
  employment_type: 'permanent',
  start_date: '',
  basic_salary: '',
  transport_allowance: '',
  housing_allowance: '',
  other_allowance: '',
  bank_name: '',
  bank_account: '',
  pension_number: '',
};

export default function NewEmployeePage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanName = sanitizeText(form.full_name);
    if (!cleanName) {
      setError('Full name is required.');
      return;
    }
    if (!companyId) {
      setError('Could not determine your company. Try refreshing.');
      return;
    }

    setSaving(true);

    const payload = {
      company_id: companyId,
      employee_code: sanitizeText(form.employee_code) || null,
      full_name: cleanName,
      email: sanitizeEmail(form.email) || null,
      phone: sanitizePhone(form.phone) || null,
      tin: sanitizeTIN(form.tin) || null,
      position: sanitizeText(form.position) || null,
      department: sanitizeText(form.department) || null,
      employment_type: form.employment_type,
      start_date: form.start_date || null,
      basic_salary: sanitizeNumber(form.basic_salary, { min: 0 }),
      transport_allowance: sanitizeNumber(form.transport_allowance, { min: 0 }),
      housing_allowance: sanitizeNumber(form.housing_allowance, { min: 0 }),
      other_allowance: sanitizeNumber(form.other_allowance, { min: 0 }),
      bank_name: sanitizeText(form.bank_name) || null,
      bank_account: sanitizeText(form.bank_account) || null,
      pension_number: sanitizeText(form.pension_number) || null,
    };

    const { error: insertError } = await supabase.from('employees').insert(payload);
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/dashboard/employees');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Add employee</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="card-title">Basic information</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="full_name">Full name</label>
              <input id="full_name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="employee_code">Employee code</label>
              <input id="employee_code" placeholder="EMP-0001" value={form.employee_code} onChange={(e) => update('employee_code', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+251 9XX XXX XXX" />
            </div>
            <div className="field">
              <label htmlFor="tin">TIN</label>
              <input id="tin" value={form.tin} onChange={(e) => update('tin', e.target.value)} placeholder="10-digit TIN" />
            </div>
            <div className="field">
              <label htmlFor="start_date">Start date</label>
              <input id="start_date" type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="card-title">Role</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="position">Position</label>
              <input id="position" value={form.position} onChange={(e) => update('position', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="department">Department</label>
              <input id="department" value={form.department} onChange={(e) => update('department', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="employment_type">Employment type</label>
              <select id="employment_type" value={form.employment_type} onChange={(e) => update('employment_type', e.target.value)}>
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="probation">Probation</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="card-title">Compensation (ETB / month)</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="basic_salary">Basic salary</label>
              <input id="basic_salary" type="number" min="0" step="0.01" value={form.basic_salary} onChange={(e) => update('basic_salary', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="transport_allowance">Transport allowance</label>
              <input id="transport_allowance" type="number" min="0" step="0.01" value={form.transport_allowance} onChange={(e) => update('transport_allowance', e.target.value)} />
              <span className="field-hint">Up to ETB 2,200 is non-taxable.</span>
            </div>
            <div className="field">
              <label htmlFor="housing_allowance">Housing allowance</label>
              <input id="housing_allowance" type="number" min="0" step="0.01" value={form.housing_allowance} onChange={(e) => update('housing_allowance', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="other_allowance">Other allowance</label>
              <input id="other_allowance" type="number" min="0" step="0.01" value={form.other_allowance} onChange={(e) => update('other_allowance', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="card-title">Banking & pension</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="bank_name">Bank name</label>
              <input id="bank_name" value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bank_account">Bank account number</label>
              <input id="bank_account" value={form.bank_account} onChange={(e) => update('bank_account', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pension_number">Pension number</label>
              <input id="pension_number" value={form.pension_number} onChange={(e) => update('pension_number', e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save employee'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/employees')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
