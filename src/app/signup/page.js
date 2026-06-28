'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [form,    setForm]    = useState({
    fullName: '', companyName: '', email: '', password: '',
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  { data: { full_name: form.fullName } }
      })
      if (authError) throw authError

      const { error: setupError } = await supabase.rpc('setup_company', {
        p_company_name:  form.companyName,
        p_company_email: form.email,
        p_full_name:     form.fullName,
      })
      if (setupError) throw setupError

      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060e08', display: 'flex', alignItems: 'stretch' }}>

      {/* Left panel */}
      <div style={{
        width: '380px',
        flexShrink: 0,
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid #0d1f12',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#16a34a',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>H</span>
          </div>
          <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>HabeshaPay</span>
        </div>

        <div>
          <h1 style={{
            color: 'white', fontSize: '26px', fontWeight: '700',
            letterSpacing: '-0.03em', lineHeight: '1.3', marginBottom: '16px',
          }}>
            Fix your payroll.<br/>Free for 30 days.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6' }}>
            Ethiopian businesses using HabeshaPay cut payroll processing time
            from days to minutes — and never miss an ERCA deadline.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            'Correct ERCA tax across all 7 brackets',
            'Employee + employer pension auto-calculated',
            'Monthly ERCA declaration document generated',
            'Payslips in Amharic and English',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '16px', height: '16px', background: 'rgba(22,163,74,0.2)',
                borderRadius: '3px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: '700' }}>✓</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, background: '#f5f4f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{
            fontSize: '22px', fontWeight: '700', color: '#1c1917',
            letterSpacing: '-0.02em', marginBottom: '6px',
          }}>
            Create your account
          </h2>
          <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '28px' }}>
            Set up your company in under 2 minutes.
          </p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="input-label">Your full name</label>
              <input className="input" name="fullName" type="text" required
                autoFocus placeholder="Abreham Tesfaye"
                value={form.fullName} onChange={handleChange}/>
            </div>

            <div>
              <label className="input-label">Company name</label>
              <input className="input" name="companyName" type="text" required
                placeholder="Awash Trading PLC"
                value={form.companyName} onChange={handleChange}/>
            </div>

            <div>
              <label className="input-label">Work email</label>
              <input className="input" name="email" type="email" required
                placeholder="you@company.com"
                value={form.email} onChange={handleChange}/>
            </div>

            <div>
              <label className="input-label">Password</label>
              <input className="input" name="password" type="password" required
                minLength={8} placeholder="At least 8 characters"
                value={form.password} onChange={handleChange}/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ marginTop: '6px', justifyContent: 'center', padding: '10px 16px' }}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#a8a29e', marginTop: '20px', textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}>
              Sign in
            </a>
          </p>

          <p style={{ fontSize: '11px', color: '#c4bfb9', marginTop: '28px', textAlign: 'center' }}>
            ERCA compliant · Built in Addis Ababa · Free for 30 days
          </p>
        </div>
      </div>
    </div>
  )
}