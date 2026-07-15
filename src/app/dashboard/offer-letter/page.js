'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { sanitizeText, sanitizeNumber } from '@/lib/sanitize';
import { formatETB } from '@/lib/payrollCalc';

const EMPTY_FORM = {
  candidate_name: '',
  position: '',
  department: '',
  start_date: '',
  basic_salary: '',
  employment_type: 'permanent',
  probation_months: '2',
};

export default function OfferLetterPage() {
  const { companyId, company, profile, loading: companyLoading } = useCompany();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('offer_letters').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    setLetters(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  function buildLetterBody(f) {
    const startDateFormatted = f.start_date
      ? new Date(f.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '[start date]';
    return `Dear ${f.candidate_name || '[Candidate Name]'},

We are pleased to offer you the position of ${f.position || '[Position]'} at ${company?.name || '[Company Name]'}, within the ${f.department || '[Department]'} department.

Your employment will begin on ${startDateFormatted}, on a ${f.employment_type} basis${
      f.employment_type === 'probation' ? ` with a probation period of ${f.probation_months} months` : ''
    }.

Your monthly basic salary will be ${formatETB(f.basic_salary || 0)}, subject to statutory deductions including income tax and pension contributions as required under Ethiopian law.

Please confirm your acceptance of this offer by replying to this letter.

We look forward to welcoming you to the team.

Sincerely,
${company?.name || 'The Company'}`;
  }

  function handlePreview(e) {
    e.preventDefault();
    setError('');
    if (!sanitizeText(form.candidate_name)) return setError('Candidate name is required.');
    if (!sanitizeText(form.position)) return setError('Position is required.');
    setPreview(buildLetterBody(form));
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const payload = {
      company_id: companyId,
      candidate_name: sanitizeText(form.candidate_name),
      position: sanitizeText(form.position),
      department: sanitizeText(form.department) || null,
      start_date: form.start_date || null,
      basic_salary: sanitizeNumber(form.basic_salary, { min: 0 }),
      employment_type: form.employment_type,
      probation_months: sanitizeNumber(form.probation_months, { min: 0, max: 12 }),
      status: 'draft',
      letter_body: preview,
      created_by: profile?.id,
    };

    const { error: insertError } = await supabase.from('offer_letters').insert(payload);
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm(EMPTY_FORM);
    setPreview(null);
    load();
  }

  async function handleMarkSent(id) {
    await supabase.from('offer_letters').update({ status: 'sent' }).eq('id', id).eq('company_id', companyId);
    load();
  }

  function handlePrint(letterBody) {
    const win = window.open('', '_blank');
    win.document.write(`<pre style="font-family: Georgia, serif; font-size: 14px; white-space: pre-wrap; max-width: 640px; margin: 40px auto;">${escapeHtml(letterBody)}</pre>`);
    win.document.close();
    win.print();
  }

  if (companyLoading || loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Offer letters</h1>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
        <form onSubmit={handlePreview} className="card">
          <h2 className="card-title">New offer letter</h2>
          <div className="field">
            <label>Candidate name</label>
            <input value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Position</label>
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
          </div>
          <div className="field">
            <label>Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="field">
            <label>Start date</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="field">
            <label>Basic salary (ETB / month)</label>
            <input type="number" min="0" step="0.01" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
          </div>
          <div className="field">
            <label>Employment type</label>
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="probation">Probation</option>
            </select>
          </div>
          {form.employment_type === 'probation' && (
            <div className="field">
              <label>Probation period (months)</label>
              <input type="number" min="0" max="12" value={form.probation_months} onChange={(e) => setForm({ ...form, probation_months: e.target.value })} />
            </div>
          )}
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-secondary">Preview letter</button>
        </form>

        <div className="card">
          <h2 className="card-title">Preview</h2>
          {preview ? (
            <>
              <pre style={{ fontFamily: 'Georgia, serif', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 16 }}>
                {preview}
              </pre>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save offer letter'}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <h3>Nothing to preview yet</h3>
              <p>Fill in the form and click preview.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">All offer letters</h2>
        {letters.length === 0 ? (
          <div className="empty-state">
            <h3>No offer letters yet</h3>
          </div>
        ) : (
          <div className="table-scroll">
<table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Position</th>
                <th>Salary</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {letters.map((letter) => (
                <tr key={letter.id}>
                  <td>{letter.candidate_name}</td>
                  <td>{letter.position}</td>
                  <td className="font-num">{formatETB(letter.basic_salary)}</td>
                  <td><span className={`badge badge-${letter.status}`}>{letter.status}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handlePrint(letter.letter_body)}>
                      Print
                    </button>
                    {letter.status === 'draft' && (
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleMarkSent(letter.id)}>
                        Mark sent
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

function escapeHtml(str) {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return str;
  div.textContent = str;
  return div.innerHTML;
}
