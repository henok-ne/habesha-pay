'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');

  // =====================================================
  // LOAD OFFER LETTERS AND COMPANY
  // =====================================================
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/offer-letters');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load offer letters'
        );
      }

      setLetters(data.letters || []);

      // The API may return the company name.
      if (data.company?.name) {
        setCompanyName(data.company.name);
      }
    } catch (err) {
      console.error('Failed to load offer letters:', err);
      setError(
        err.message || 'Failed to load offer letters'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // =====================================================
  // BUILD LETTER BODY
  // =====================================================
  function buildLetterBody(f) {
    const startDateFormatted = f.start_date
      ? new Date(f.start_date).toLocaleDateString(
          'en-US',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        )
      : '[start date]';

    return `Dear ${f.candidate_name || '[Candidate Name]'},

We are pleased to offer you the position of ${f.position || '[Position]'} at ${companyName || '[Company Name]'}, within the ${f.department || '[Department]'} department.

Your employment will begin on ${startDateFormatted}, on a ${f.employment_type} basis${
      f.employment_type === 'probation'
        ? ` with a probation period of ${f.probation_months} months`
        : ''
    }.

Your monthly basic salary will be ${formatETB(
      f.basic_salary || 0
    )}, subject to statutory deductions including income tax and pension contributions as required under Ethiopian law.

Please confirm your acceptance of this offer by replying to this letter.

We look forward to welcoming you to the team.

Sincerely,
${companyName || 'The Company'}`;
  }

  // =====================================================
  // PREVIEW
  // =====================================================
  function handlePreview(e) {
    e.preventDefault();
    setError('');

    if (!sanitizeText(form.candidate_name)) {
      setError('Candidate name is required.');
      return;
    }

    if (!sanitizeText(form.position)) {
      setError('Position is required.');
      return;
    }

    setPreview(buildLetterBody(form));
  }

  // =====================================================
  // SAVE OFFER LETTER
  // =====================================================
  async function handleSave() {
    if (!preview) {
      setError('Preview the letter before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const basicSalary = sanitizeNumber(
        form.basic_salary,
        { min: 0 }
      );

      const probationMonths = sanitizeNumber(
        form.probation_months,
        { min: 0, max: 12 }
      );

      const payload = {
        candidate_name: sanitizeText(
          form.candidate_name
        ),
        position: sanitizeText(form.position),
        department:
          sanitizeText(form.department) || null,
        start_date: form.start_date || null,
        basic_salary: basicSalary || 0,
        employment_type: form.employment_type,
        probation_months: probationMonths || 0,
        letter_body: preview,
      };

      const response = await fetch('/api/offer-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to save offer letter'
        );
      }

      setForm(EMPTY_FORM);
      setPreview(null);

      await load();
    } catch (err) {
      console.error('Failed to save offer letter:', err);
      setError(
        err.message || 'Failed to save offer letter'
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // MARK AS SENT
  // =====================================================
  async function handleMarkSent(id) {
    try {
      setError('');

      const response = await fetch('/api/offer-letters', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: 'sent',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to mark offer letter as sent'
        );
      }

      await load();
    } catch (err) {
      console.error('Failed to mark letter as sent:', err);
      setError(
        err.message || 'Failed to mark letter as sent'
      );
    }
  }

  // =====================================================
  // PRINT
  // =====================================================
  function handlePrint(letterBody) {
    const win = window.open('', '_blank');

    if (!win) {
      setError('Please allow pop-ups to print the letter.');
      return;
    }

    win.document.write(`
      <pre style="
        font-family: Georgia, serif;
        font-size: 14px;
        white-space: pre-wrap;
        max-width: 640px;
        margin: 40px auto;
        line-height: 1.6;
      ">${escapeHtml(letterBody || '')}</pre>
    `);

    win.document.close();
    win.print();
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
          <h1>Offer letters</h1>
        </div>
      </div>

      {error && (
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      <div
        className="grid-2"
        style={{
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* =================================================
            NEW OFFER LETTER FORM
        ================================================= */}
        <form
          onSubmit={handlePreview}
          className="card"
        >
          <h2 className="card-title">
            New offer letter
          </h2>

          <div className="field">
            <label>Candidate name</label>

            <input
              value={form.candidate_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  candidate_name: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="field">
            <label>Position</label>

            <input
              value={form.position}
              onChange={(e) =>
                setForm({
                  ...form,
                  position: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="field">
            <label>Department</label>

            <input
              value={form.department}
              onChange={(e) =>
                setForm({
                  ...form,
                  department: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Start date</label>

            <input
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_date: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Basic salary (ETB / month)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basic_salary}
              onChange={(e) =>
                setForm({
                  ...form,
                  basic_salary: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Employment type</label>

            <select
              value={form.employment_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  employment_type: e.target.value,
                })
              }
            >
              <option value="permanent">
                Permanent
              </option>

              <option value="contract">
                Contract
              </option>

              <option value="probation">
                Probation
              </option>
            </select>
          </div>

          {form.employment_type === 'probation' && (
            <div className="field">
              <label>
                Probation period (months)
              </label>

              <input
                type="number"
                min="0"
                max="12"
                value={form.probation_months}
                onChange={(e) =>
                  setForm({
                    ...form,
                    probation_months: e.target.value,
                  })
                }
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-secondary"
          >
            Preview letter
          </button>
        </form>

        {/* =================================================
            PREVIEW
        ================================================= */}
        <div className="card">
          <h2 className="card-title">
            Preview
          </h2>

          {preview ? (
            <>
              <pre
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {preview}
              </pre>

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? 'Saving…'
                  : 'Save offer letter'}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <h3>Nothing to preview yet</h3>

              <p>
                Fill in the form and click preview.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          ALL OFFER LETTERS
      ================================================= */}
      <div className="card">
        <h2 className="card-title">
          All offer letters
        </h2>

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
                    <td>
                      {letter.candidate_name}
                    </td>

                    <td>
                      {letter.position}
                    </td>

                    <td className="font-num">
                      {formatETB(
                        letter.basic_salary || 0
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${letter.status}`}
                      >
                        {letter.status}
                      </span>
                    </td>

                    <td
                      style={{
                        display: 'flex',
                        gap: 6,
                      }}
                    >
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: '4px 10px',
                          fontSize: 13,
                        }}
                        onClick={() =>
                          handlePrint(
                            letter.letter_body
                          )
                        }
                      >
                        Print
                      </button>

                      {letter.status === 'draft' && (
                        <button
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: 13,
                          }}
                          onClick={() =>
                            handleMarkSent(letter.id)
                          }
                        >
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

// =====================================================
// ESCAPE HTML BEFORE PRINTING
// =====================================================
function escapeHtml(str) {
  const div =
    typeof document !== 'undefined'
      ? document.createElement('div')
      : null;

  if (!div) return str;

  div.textContent = str;

  return div.innerHTML;
}