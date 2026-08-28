'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanName = sanitizeText(fullName);
    const cleanEmail = sanitizeEmail(email);
    const cleanCompany = sanitizeText(companyName);

    if (!cleanName) {
      setError('Enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setError('Enter a valid email address.');
      return;
    }

    if (!inviteToken && !cleanCompany) {
      setError('Enter your company name.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    /*
     * Team invitations are still being migrated.
     * We will connect this to MongoDB TeamInvite next.
     */
    if (inviteToken) {
      setError('Team invitations are temporarily unavailable while we migrate to MongoDB.');
      return;
    }

    setLoading(true);

    try {
      // Create the Company + User in MongoDB.
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: cleanName,
          companyName: cleanCompany,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'Unable to create account.');
        setLoading(false);
        return;
      }

      /*
       * Registration succeeded.
       *
       * Now authenticate the newly-created MongoDB user
       * through NextAuth.
       */
      const loginResult = await signIn('credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        setError(
          'Account created successfully, but automatic login failed. Please log in manually.'
        );
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Signup error:', error);

      setError('Something went wrong while creating your account.');
      setLoading(false);
    }
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
          <Link
            href="/"
            className="font-display"
            style={{
              fontSize: 24,
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            EthioPayroll
          </Link>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>
            {inviteToken ? 'Join your team' : 'Create your account'}
          </h1>

          <p
            style={{
              fontSize: 13,
              color: '#6b6355',
              marginBottom: 24,
            }}
          >
            {inviteToken
              ? "You're accepting an invite — your account will be added straight to your team's existing workspace."
              : 'Set up your company workspace in under a minute.'}
          </p>

          <form onSubmit={handleSubmit}>
            {!inviteToken && (
              <div className="field">
                <label htmlFor="companyName">Company name</label>

                <input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="fullName">Your full name</label>

              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <span className="field-hint">
                At least 8 characters.
              </span>
            </div>

            {error && (
              <p
                className="field-error"
                style={{ marginBottom: 16 }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
              }}
              disabled={loading}
            >
              {loading
                ? 'Creating account…'
                : inviteToken
                  ? 'Join team'
                  : 'Create account'}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#6b6355',
            marginTop: 20,
          }}
        >
          Already have an account?{' '}

          <Link
            href="/login"
            style={{ color: 'var(--forest)' }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}