'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { CompanyProvider, useCompany } from '@/hooks/useCompany';
import { sanitizeText } from '@/lib/sanitize';

export default function DashboardLayout({ children }) {
  return (
    <CompanyProvider>
      <DashboardShell>{children}</DashboardShell>
    </CompanyProvider>
  );
}

function DashboardShell({ children }) {
  const router = useRouter();
  const { user, error, loading, refresh } = useCompany();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="app-shell">
        <div
          className="main-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p className="font-num" style={{ color: '#6b6355' }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect is in progress.
    return null;
  }

  // The user is authenticated, but no company workspace was found.
  if (error) {
    return <SetupRecovery error={error} onDone={refresh} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="main-col">
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 5h15M2.5 10h15M2.5 15h15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <span className="font-display mobile-topbar-title">
            EthioPayroll
          </span>
        </header>

        <main className="main-panel">{children}</main>
      </div>
    </div>
  );
}

function SetupRecovery({ error, onDone }) {
  const [mode, setMode] = useState('company');
  const [companyName, setCompanyName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleLogout() {
    await signOut({
      callbackUrl: '/login',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');

    const name = sanitizeText(fullName);

    if (!name) {
      setLocalError('Enter your full name.');
      return;
    }

    if (mode === 'company' && !sanitizeText(companyName)) {
      setLocalError('Enter a company name.');
      return;
    }

    if (mode === 'invite' && !inviteToken.trim()) {
      setLocalError('Paste the invite link or code you were given.');
      return;
    }

    setBusy(true);

    const token = inviteToken
      .trim()
      .split('/')
      .pop()
      .split('=')
      .pop();

    const endpoint =
      mode === 'invite'
        ? '/api/invite/accept'
        : '/api/company/setup';

    const payload =
      mode === 'invite'
        ? {
            token,
            fullName: name,
          }
        : {
            companyName: sanitizeText(companyName),
            fullName: name,
          };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setLocalError(
          result.message || 'Unable to finish account setup.'
        );
        return;
      }

      onDone();
    } catch (requestError) {
      console.error('Account setup error:', requestError);
      setLocalError(
        'Unable to connect to the server. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div
        className="main-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div className="card">
            <h1 style={{ fontSize: 18, marginBottom: 4 }}>
              Let&apos;s finish setting up your account
            </h1>

            <p
              style={{
                fontSize: 13,
                color: '#6b6355',
                marginBottom: 16,
              }}
            >
              Your login works, but we couldn&apos;t find a company
              workspace attached to it yet — this usually means the
              last step of signup didn&apos;t complete. That&apos;s easy
              to fix here, no need to sign up again.
            </p>

            <div className="tab-row" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={
                  mode === 'company'
                    ? 'tab tab-active'
                    : 'tab'
                }
                onClick={() => {
                  setMode('company');
                  setLocalError('');
                }}
              >
                Start a new company
              </button>

              <button
                type="button"
                className={
                  mode === 'invite'
                    ? 'tab tab-active'
                    : 'tab'
                }
                onClick={() => {
                  setMode('invite');
                  setLocalError('');
                }}
              >
                I have a team invite
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="recoveryName">
                  Your full name
                </label>

                <input
                  id="recoveryName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {mode === 'company' ? (
                <div className="field">
                  <label htmlFor="recoveryCompany">
                    Company name
                  </label>

                  <input
                    id="recoveryCompany"
                    value={companyName}
                    onChange={(e) =>
                      setCompanyName(e.target.value)
                    }
                    required
                  />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="recoveryInvite">
                    Invite link or code
                  </label>

                  <input
                    id="recoveryInvite"
                    value={inviteToken}
                    onChange={(e) =>
                      setInviteToken(e.target.value)
                    }
                    placeholder="Paste what was shared with you"
                    required
                  />
                </div>
              )}

              {localError && (
                <p
                  className="field-error"
                  style={{ marginBottom: 12 }}
                >
                  {localError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                }}
                disabled={busy}
              >
                {busy ? 'Setting up…' : 'Continue'}
              </button>
            </form>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#8a8272',
                }}
              >
                Wrong account?
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                }}
              >
                Log out
              </button>
            </div>
          </div>

          <p
            style={{
              fontSize: 11,
              color: '#8a8272',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            Technical detail: {error}
          </p>
        </div>
      </div>
    </div>
  );
}