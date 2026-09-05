'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import {
  sanitizeText,
  sanitizePhone,
  sanitizeTIN,
} from '@/lib/sanitize';

export default function SettingsPage() {
  const {
    company,
    role,
    refresh,
    loading: companyLoading,
  } = useCompany();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
  if (company) {
    setForm({
      ...company,
      pension_scheme: company.pensionScheme || 'private',
    });
  }
}, [company]);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSaved(false);
    setSaving(true);

    const payload = {
      name: sanitizeText(form.name),
      tin: sanitizeTIN(form.tin) || null,
      address: sanitizeText(form.address) || null,
      city: sanitizeText(form.city) || null,
      phone: sanitizePhone(form.phone) || null,
      pension_scheme: form.pension_scheme || 'private',
    };

    try {
      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to update company settings'
        );
      }

      setSaved(true);

      if (refresh) {
        await refresh();
      }
    } catch (err) {
      console.error('Settings save error:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (companyLoading || !form) {
    return (
      <p
        className="font-num"
        style={{ color: '#6b6355' }}
      >
        Loading…
      </p>
    );
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

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ maxWidth: 560 }}
      >
        <h2 className="card-title">Company details</h2>

        <div className="field">
          <label>Company name</label>
          <input
            value={form.name || ''}
            onChange={(event) =>
              updateField('name', event.target.value)
            }
            disabled={!isAdmin}
            required
          />
        </div>

        <div className="field">
          <label>TIN</label>
          <input
            value={form.tin || ''}
            onChange={(event) =>
              updateField('tin', event.target.value)
            }
            disabled={!isAdmin}
          />
        </div>

        <div className="field">
          <label>Address</label>
          <input
            value={form.address || ''}
            onChange={(event) =>
              updateField('address', event.target.value)
            }
            disabled={!isAdmin}
          />
        </div>

        <div className="field">
          <label>City</label>
          <input
            value={form.city || ''}
            onChange={(event) =>
              updateField('city', event.target.value)
            }
            disabled={!isAdmin}
          />
        </div>

        <div className="field">
          <label>Phone</label>
          <input
            value={form.phone || ''}
            onChange={(event) =>
              updateField('phone', event.target.value)
            }
            disabled={!isAdmin}
          />
        </div>

        <div className="field">
          <label>Pension scheme</label>
          <select
            value={form.pension_scheme || 'private'}
            onChange={(event) =>
              updateField(
                'pension_scheme',
                event.target.value
              )
            }
            disabled={!isAdmin}
          >
            <option value="private">
              Private organization
            </option>
            <option value="government">
              Government
            </option>
          </select>
        </div>

        {!isAdmin && (
          <p
            className="field-hint"
            style={{ marginBottom: 16 }}
          >
            Only admins can edit company settings.
          </p>
        )}

        {error && (
          <p
            className="field-error"
            style={{ marginBottom: 16 }}
          >
            {error}
          </p>
        )}

        {saved && (
          <p
            style={{
              color: 'var(--forest)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            Settings saved.
          </p>
        )}

        {isAdmin && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        )}
      </form>
    </div>
  );
}