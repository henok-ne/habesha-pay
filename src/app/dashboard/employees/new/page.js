'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Ethiopian tax calculation (mirrors the engine) ─────────────
const BRACKETS = [
  { max: 600,      rate: 0,    ded: 0      },
  { max: 1650,     rate: 0.10, ded: 60     },
  { max: 3200,     rate: 0.15, ded: 142.50 },
  { max: 5250,     rate: 0.20, ded: 302.50 },
  { max: 7800,     rate: 0.25, ded: 565    },
  { max: 10900,    rate: 0.30, ded: 955    },
  { max: Infinity, rate: 0.35, ded: 1500   },
]

function calcPreview(basic, allow) {
  const b = parseFloat(basic) || 0
  const a = parseFloat(allow) || 0
  const gross = b + a
  if (gross <= 0) return null
  const bracket = BRACKETS.find(br => gross <= br.max)
  const tax     = Math.round(Math.max(0, (gross * bracket.rate) - bracket.ded) * 100) / 100
  const pension = Math.round(b * 0.07 * 100) / 100
  const empPen  = Math.round(b * 0.11 * 100) / 100
  const net     = Math.round((gross - tax - pension) * 100) / 100
  const effRate = gross > 0 ? ((tax / gross) * 100).toFixed(1) : 0
  return { gross, tax, pension, empPen, net, effRate, bracket: `${(bracket.rate*100)}%` }
}

function fmt(n) {
  return 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Sidebar (shared layout) ────────────────────────────────────
function Sidebar() {
  return (
    <aside className="sidebar" style={{
      width: '220px', flexShrink: 0, position: 'fixed',
      top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #0d1f12', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '24px', height: '24px', background: '#16a34a', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '11px' }}>H</span>
        </div>
        <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>HabeshaPay</span>
      </div>
      <nav style={{ flex: 1, padding: '10px' }}>
        {[
          { href: '/dashboard',           label: 'Dashboard'  },
          { href: '/dashboard/employees', label: 'Employees', active: true },
          { href: '/dashboard/payroll',   label: 'Payroll'    },
        ].map(l => (
          <a key={l.href} href={l.href} className={`nav-item${l.active ? ' active' : ''}`}>
            {l.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}

// ── Input field component ─────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="input-label">
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function NewEmployee() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [form,    setForm]    = useState({
    employee_code: '', full_name: '', email: '', phone: '',
    position: '', department: '', basic_salary: '', allowances: '',
    bank_account: '', employment_date: '',
  })

  const preview = calcPreview(form.basic_salary, form.allowances)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof }     = await supabase
        .from('profiles').select('company_id').eq('id', user.id).single()

      if (!prof?.company_id) throw new Error('Company not found. Please sign out and sign in again.')

      const { error: err } = await supabase.from('employees').insert({
        company_id:      prof.company_id,
        employee_code:   form.employee_code.trim(),
        full_name:       form.full_name.trim(),
        email:           form.email.trim()        || null,
        phone:           form.phone.trim()        || null,
        position:        form.position.trim()     || null,
        department:      form.department.trim()   || null,
        basic_salary:    parseFloat(form.basic_salary),
        allowances:      parseFloat(form.allowances) || 0,
        bank_account:    form.bank_account.trim() || null,
        employment_date: form.employment_date     || null,
        status:          'active',
      })

      if (err) throw err
      router.push('/dashboard/employees')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [form, router])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      <Sidebar/>

      <main style={{ flex: 1, marginLeft: '220px', padding: '36px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: '#a8a29e', textDecoration: 'none' }}>
            Dashboard
          </a>
          <span style={{ color: '#e8e5e0' }}>/</span>
          <a href="/dashboard/employees" style={{ fontSize: '13px', color: '#a8a29e', textDecoration: 'none' }}>
            Employees
          </a>
          <span style={{ color: '#e8e5e0' }}>/</span>
          <span style={{ fontSize: '13px', color: '#1c1917', fontWeight: '500' }}>Add employee</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {error && <div className="error-box">{error}</div>}

            {/* Basic info card */}
            <div className="card" style={{ padding: '24px' }}>
              <p className="section-title" style={{ marginBottom: '4px' }}>Basic information</p>
              <p className="section-sub" style={{ marginBottom: '20px' }}>Employee details and contact</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Employee code" required>
                  <input className="input" name="employee_code" required
                    placeholder="EMP-001" value={form.employee_code} onChange={handleChange}/>
                </Field>

                <Field label="Full name" required>
                  <input className="input" name="full_name" required
                    placeholder="Abreham Tesfaye" value={form.full_name} onChange={handleChange}/>
                </Field>

                <Field label="Email">
                  <input className="input" name="email" type="email"
                    placeholder="abreham@company.com" value={form.email} onChange={handleChange}/>
                </Field>

                <Field label="Phone">
                  <input className="input" name="phone"
                    placeholder="+251 91 234 5678" value={form.phone} onChange={handleChange}/>
                </Field>

                <Field label="Job title">
                  <input className="input" name="position"
                    placeholder="Senior Accountant" value={form.position} onChange={handleChange}/>
                </Field>

                <Field label="Department">
                  <input className="input" name="department"
                    placeholder="Finance" value={form.department} onChange={handleChange}/>
                </Field>

                <Field label="Employment date">
                  <input className="input" name="employment_date" type="date"
                    value={form.employment_date} onChange={handleChange}/>
                </Field>

                <Field label="Bank account">
                  <input className="input" name="bank_account"
                    placeholder="1000123456789" value={form.bank_account} onChange={handleChange}/>
                </Field>
              </div>
            </div>

            {/* Salary card */}
            <div className="card" style={{ padding: '24px' }}>
              <p className="section-title" style={{ marginBottom: '4px' }}>Salary</p>
              <p className="section-sub" style={{ marginBottom: '20px' }}>
                Pension is on basic salary only — not allowances
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Basic salary (ETB/month)" required>
                  <input className="input" name="basic_salary" type="number"
                    required min="1" step="0.01"
                    placeholder="15000" value={form.basic_salary} onChange={handleChange}/>
                </Field>

                <Field label="Total allowances (ETB/month)">
                  <input className="input" name="allowances" type="number"
                    min="0" step="0.01"
                    placeholder="3000" value={form.allowances} onChange={handleChange}/>
                </Field>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '40px' }}>
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ padding: '10px 20px' }}>
                {loading ? 'Saving...' : 'Add employee'}
              </button>
              <a href="/dashboard/employees" className="btn-secondary"
                style={{ padding: '10px 20px' }}>
                Cancel
              </a>
            </div>
          </form>

          {/* Live preview sidebar */}
          <div style={{ position: 'sticky', top: '36px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f0ece8',
              }}>
                <p className="section-title">Live payslip preview</p>
                <span style={{
                  background: '#f0fdf4', color: '#16a34a',
                  fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '4px',
                }}>
                  Real-time
                </span>
              </div>

              {!preview ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: '12px', color: '#a8a29e' }}>
                    Enter a salary to see the payslip preview
                  </p>
                </div>
              ) : (
                <>
                  {/* Main figures */}
                  {[
                    { label: 'Gross salary',     val: preview.gross,   bold: true  },
                    { label: 'Income tax (ERCA)', val: preview.tax,    color: '#dc2626' },
                    { label: 'Employee pension',  val: preview.pension, color: '#d97706' },
                    { label: 'Net pay',           val: preview.net,    color: '#16a34a', bold: true },
                  ].map(row => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '8px 0',
                      borderBottom: '1px solid #faf9f7',
                    }}>
                      <p style={{ fontSize: '12px', color: '#78716c' }}>{row.label}</p>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: row.bold ? '600' : '400',
                        color: row.color || '#1c1917',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {fmt(row.val)}
                      </p>
                    </div>
                  ))}

                  {/* Bracket info */}
                  <div style={{
                    marginTop: '14px', padding: '10px 12px',
                    background: '#f5f4f0', borderRadius: '6px',
                  }}>
                    <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}>
                      Tax bracket · {preview.bracket} rate
                    </p>
                    <p style={{ fontSize: '12px', color: '#57534e' }}>
                      Effective rate: <strong>{preview.effRate}%</strong>
                    </p>
                  </div>

                  {/* Employer cost */}
                  <div style={{
                    marginTop: '12px', padding: '10px 12px',
                    background: '#fffbeb', borderRadius: '6px',
                    border: '1px solid #fef3c7',
                  }}>
                    <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                      Company cost (you pay this)
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#78350f' }}>
                      {fmt(preview.gross + preview.empPen)}
                    </p>
                    <p style={{ fontSize: '11px', color: '#a16207', marginTop: '2px' }}>
                      Includes employer pension {fmt(preview.empPen)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Reminder */}
            <div style={{
              marginTop: '12px', padding: '14px 16px',
              background: 'white', border: '1px solid #e8e5e0',
              borderRadius: '8px',
            }}>
              <p style={{ fontSize: '11px', color: '#a8a29e', lineHeight: '1.5' }}>
                <strong style={{ color: '#57534e' }}>Pension reminder:</strong> The 7% employee
                and 11% employer pension is calculated on basic salary only — not on allowances.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}