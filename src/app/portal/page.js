'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalEntryPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    router.push(`/portal/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--parchment)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="font-display" style={{ fontSize: 24, color: 'var(--ink)' }}>EthioPayroll</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>Employee portal</h1>
          <p style={{ fontSize: 13, color: '#6b6355', marginBottom: 24 }}>
            Use the private link your employer shared with you to view your payslips and leave balance. If you
            only have the link, just open it directly — this page is only for pasting a raw access code.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="token">Access code</label>
              <input id="token" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Paste the code from your link" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
