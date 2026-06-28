'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [form,    setForm]    = useState({ email: '', password: '' })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060e08', display: 'flex', alignItems: 'stretch' }}>

      {/* Left panel — branding */}
      <div style={{
        width: '420px',
        flexShrink: 0,
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid #0d1f12',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#16a34a',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>H</span>
          </div>
          <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>HabeshaPay</span>
        </div>

        {/* Tagline */}
        <div>
          <p style={{
            color: 'rgba(255,255,255,0.15)',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: '600',
            marginBottom: '16px',
          }}>Ethiopian payroll, done right</p>

          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            lineHeight: '1.3',
            marginBottom: '16px',
          }}>
            All 7 ERCA brackets.<br/>
            Automatic. Accurate.
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6' }}>
            Calculate income tax, employee pension, and generate
            ERCA filing documents in minutes — not days.
          </p>
        </div>

        {/* Footer stat */}
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { n: '46', label: 'Tests passing' },
            { n: '0',  label: 'Tax errors' },
            { n: '7',  label: 'Brackets handled' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ color: 'white', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.03em' }}>
                {s.n}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        background: '#f5f4f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1c1917',
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}>
            Sign in
          </h2>
          <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '28px' }}>
            Access your company&apos;s payroll dashboard.
          </p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="input-label">Email address</label>
              <input className="input" name="email" type="email" required
                autoFocus placeholder="you@company.com"
                value={form.email} onChange={handleChange}/>
            </div>

            <div>
              <label className="input-label">Password</label>
              <input className="input" name="password" type="password" required
                placeholder="Your password"
                value={form.password} onChange={handleChange}/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ marginTop: '6px', justifyContent: 'center', padding: '10px 16px' }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#a8a29e', marginTop: '20px', textAlign: 'center' }}>
            No account?{' '}
            <a href="/signup" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}>
              Create one free
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}