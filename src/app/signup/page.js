'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

    if (!cleanName) return setError('Enter your full name.');
    if (!cleanEmail) return setError('Enter a valid email address.');
    if (!inviteToken && !cleanCompany) return setError('Enter your company name.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      setLoading(false);
      setError('Account created — check your email to confirm, then log in.');
      return;
    }

    // Supabase can require the session to actually be active (not just the
    // user object returned) before an RPC call is authenticated as them —
    // if email confirmation is on, there's no session yet at this point.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      setError('Account created — check your email to confirm, then log in to finish setup.');
      return;
    }

    // Company + profile creation is one atomic, server-side step (see
    // create_company_and_profile / accept_team_invite in the SQL setup) —
    // there is no separate client-side insert left to partially fail.
    const { error: rpcError } = inviteToken
      ? await supabase.rpc('accept_team_invite', {
          p_token: inviteToken,
          p_full_name: cleanName,
        })
      : await supabase.rpc('create_company_and_profile', {
          p_company_name: cleanCompany,
          p_full_name: cleanName,
        });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push('/dashboard');
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
          <Link href="/" className="font-display" style={{ fontSize: 24, color: 'var(--ink)', textDecoration: 'none' }}>
            EthioPayroll
          </Link>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>
            {inviteToken ? 'Join your team' : 'Create your account'}
          </h1>
          <p style={{ fontSize: 13, color: '#6b6355', marginBottom: 24 }}>
            {inviteToken
              ? "You're accepting an invite — your account will be added straight to your team's existing workspace."
              : 'Set up your company workspace in under a minute.'}
          </p>

          <form onSubmit={handleSubmit}>
            {!inviteToken && (
              <div className="field">
                <label htmlFor="companyName">Company name</label>
                <input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
            )}

            <div className="field">
              <label htmlFor="fullName">Your full name</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
              <span className="field-hint">At least 8 characters.</span>
            </div>

            {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account…' : inviteToken ? 'Join team' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b6355', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--forest)' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
