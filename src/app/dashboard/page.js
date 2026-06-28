'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Helpers ──────────────────────────────────────────────────
function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function periodLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function ercaDeadline() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth()+2, 0)
  return last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysLeft() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth()+2, 0)
  return Math.ceil((last - d) / (1000*60*60*24))
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [dbError,  setDbError]  = useState(null)   // shows on screen
  const [profile,  setProfile]  = useState(null)
  const [company,  setCompany]  = useState(null)
  const [empCount, setEmpCount] = useState(0)
  const [runs,     setRuns]     = useState([])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setDbError(null)

      // ── Step 1: get session ──────────────────────────────
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw new Error(`Session error: ${sessionError.message}`)
      if (!session?.user) {
        router.push('/login')
        return
      }

      const userId = session.user.id

      // ── Step 2: profile + company in ONE query (join) ───
      // This is more reliable than two separate queries
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          company_id,
          role,
          companies (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .eq('id', userId)
        .single()

      if (profError) throw new Error(`Profile query failed: ${profError.message} (code: ${profError.code})`)
      if (!prof)     throw new Error('Profile not found for this user')

      setProfile(prof)

      // companies is the joined result
      const comp = prof.companies
      if (comp) {
        setCompany(comp)
      } else {
        // Profile exists but has no company linked
        setDbError(`Profile found but company_id is null or company doesn't exist. company_id: ${prof.company_id}`)
      }

      // ── Step 3: employee count ───────────────────────────
      if (prof.company_id) {
        const { count, error: empError } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', prof.company_id)
          .eq('status', 'active')

        if (empError) console.warn('Employee count error:', empError.message)
        else setEmpCount(count || 0)

        // ── Step 4: recent payroll runs ──────────────────
        const { data: r, error: runsError } = await supabase
          .from('payroll_runs')
          .select('*')
          .eq('company_id', prof.company_id)
          .order('created_at', { ascending: false })
          .limit(6)

        if (runsError) console.warn('Runs error:', runsError.message)
        else setRuns(r || [])
      }

    } catch (err) {
      // Show the real error on screen — no more silent failures
      setDbError(err.message)
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f5f4f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '20px', height: '20px',
            border: '2px solid #16a34a', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 10px',
          }}/>
          <p style={{ fontSize: '13px', color: '#a8a29e' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const days = daysLeft()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className="sidebar" style={{
        width: '220px', flexShrink: 0, position: 'fixed',
        top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #0d1f12',
          display: 'flex', alignItems: 'center', gap: '9px',
        }}>
          <div style={{
            width: '24px', height: '24px', background: '#16a34a',
            borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '11px' }}>H</span>
          </div>
          <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>HabeshaPay</span>
        </div>

        {/* Company name */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1f12' }}>
          <p className="sidebar-label" style={{ marginBottom: '3px' }}>Company</p>
          <p className="sidebar-company">
            {company?.name || (dbError ? '⚠ Error' : '—')}
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px' }}>
          {[
            { href: '/dashboard',           label: 'Dashboard',  active: true  },
            { href: '/dashboard/employees', label: 'Employees',  active: false },
            { href: '/dashboard/payroll',   label: 'Payroll',    active: false },
            { href: '/dashboard/reports',   label: 'Reports',    active: false },
            { href: '/dashboard/settings',  label: 'Settings',   active: false },
          ].map(l => (
            <a key={l.href} href={l.href}
              className={`nav-item${l.active ? ' active' : ''}`}>
              {l.label}
            </a>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #0d1f12' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            {profile?.full_name || ''}
          </p>
          <button onClick={signOut} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'left',
          }}
            onMouseOver={e => e.target.style.color = '#f87171'}
            onMouseOut={e  => e.target.style.color = 'rgba(255,255,255,0.25)'}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '36px 40px' }}>

        {/* Error banner — shows the REAL error so we can fix it */}
        {dbError && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '14px 16px', marginBottom: '24px',
            fontSize: '13px', color: '#dc2626',
          }}>
            <strong>Database error:</strong> {dbError}
            <br/>
            <span style={{ fontSize: '12px', color: '#a8a29e', marginTop: '4px', display: 'block' }}>
              Check the browser console for more details.
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '24px', fontWeight: '700', color: '#1c1917',
            letterSpacing: '-0.03em', marginBottom: '4px',
          }}>
            {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
          </h1>
          <p style={{ fontSize: '13px', color: '#a8a29e' }}>
            {periodLabel()} · Payroll period
          </p>
        </div>

        {/* Stat cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px', marginBottom: '32px',
        }}>
          {/* Employees */}
          <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#16a34a' }}/>
            <p className="stat-label">Active employees</p>
            <p className="stat-num">{empCount}</p>
            <a href="/dashboard/employees/new" style={{
              display: 'block', fontSize: '12px', color: '#16a34a',
              textDecoration: 'none', marginTop: '10px', fontWeight: '500',
            }}>
              {empCount === 0 ? '+ Add first employee' : '→ Manage'}
            </a>
          </div>

          {/* This month */}
          <div className="card" style={{ padding: '20px' }}>
            <p className="stat-label">This month</p>
            <p className="stat-num">
              {runs.find(r => r.period_month === currentPeriod())?.status || 'Pending'}
            </p>
            <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '8px' }}>
              {periodLabel()}
            </p>
          </div>

          {/* ERCA */}
          <div className="card" style={{
            padding: '20px', position: 'relative', overflow: 'hidden',
            background: days <= 7 ? '#fff5f5' : days <= 14 ? '#fffbeb' : '#ffffff',
            borderColor: days <= 7 ? '#fecaca' : days <= 14 ? '#fde68a' : '#e8e5e0',
          }}>
            {days <= 14 && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: days <= 7 ? '#dc2626' : '#d97706',
              }}/>
            )}
            <p className="stat-label">ERCA deadline</p>
            <p className="stat-num" style={{
              color: days <= 7 ? '#dc2626' : days <= 14 ? '#d97706' : '#1c1917',
            }}>
              {days}d
            </p>
            <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '8px' }}>
              {ercaDeadline()}
            </p>
          </div>

          {/* Runs */}
          <div className="card" style={{ padding: '20px' }}>
            <p className="stat-label">Total payroll runs</p>
            <p className="stat-num">{runs.length}</p>
            <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '8px' }}>All time</p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '11px', fontWeight: '600', color: '#a8a29e',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            Quick actions
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/dashboard/employees/new" className="btn-primary">+ Add employee</a>
            <a href="/dashboard/payroll/new"   className="btn-secondary">▶ Run payroll</a>
          </div>
        </div>

        {/* Payroll runs table */}
        <div className="card">
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #f0ece8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p className="section-title">Payroll runs</p>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '40px', background: '#f5f4f0',
                borderRadius: '8px', margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '18px' }}>📋</span>
              </div>
              <p style={{ fontSize: '14px', color: '#78716c', marginBottom: '4px', fontWeight: '500' }}>
                No payroll runs yet
              </p>
              <p style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '20px' }}>
                Add employees first, then run your first payroll
              </p>
              <a href="/dashboard/employees/new" className="btn-primary">
                + Add your first employee
              </a>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="table-head">
                  <th>Period</th>
                  <th>Employees</th>
                  <th>ERCA tax</th>
                  <th>Net pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="table-row">
                    <td style={{ fontWeight: '500', color: '#1c1917' }}>{run.period_month}</td>
                    <td>{run.total_employees ?? '—'}</td>
                    <td>{run.total_income_tax ? `ETB ${Number(run.total_income_tax).toLocaleString()}` : '—'}</td>
                    <td>{run.total_net_pay    ? `ETB ${Number(run.total_net_pay).toLocaleString()}`    : '—'}</td>
                    <td>
                      <span className={`badge badge-${
                        run.status==='filed'     ? 'green' :
                        run.status==='processed' ? 'blue'  : 'gray'}`}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}