'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Sidebar({ companyName }) {
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
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1f12' }}>
        <p className="sidebar-label" style={{ marginBottom: '3px' }}>Company</p>
        <p className="sidebar-company">{companyName || '—'}</p>
      </div>
      <nav style={{ flex: 1, padding: '10px' }}>
        {[
          { href: '/dashboard',           label: 'Dashboard'          },
          { href: '/dashboard/employees', label: 'Employees', active: true },
          { href: '/dashboard/payroll',   label: 'Payroll'            },
          { href: '/dashboard/reports',   label: 'Reports'            },
        ].map(l => (
          <a key={l.href} href={l.href} className={`nav-item${l.active ? ' active' : ''}`}>
            {l.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}

export default function Employees() {
  const router = useRouter()
  const [loading,   setLoading]   = useState(true)
  const [employees, setEmployees] = useState([])
  const [company,   setCompany]   = useState(null)
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', session.user.id)
        .single()

      setCompany(prof?.companies)

      const { data: emps } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', prof.company_id)
        .order('created_at', { ascending: false })

      setEmployees(emps || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '13px', color: '#a8a29e' }}>Loading employees...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      <Sidebar companyName={company?.name}/>

      <main style={{ flex: 1, marginLeft: '220px', padding: '36px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1c1917', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              Employees
            </h1>
            <p style={{ fontSize: '13px', color: '#a8a29e' }}>
              {employees.length} total · {employees.filter(e => e.status === 'active').length} active
            </p>
          </div>
          <a href="/dashboard/employees/new" className="btn-primary">
            + Add employee
          </a>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <input
            className="input"
            placeholder="Search by name, code or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              {employees.length === 0 ? (
                <>
                  <p style={{ fontSize: '14px', color: '#78716c', fontWeight: '500', marginBottom: '4px' }}>
                    No employees yet
                  </p>
                  <p style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '20px' }}>
                    Add your first employee to start running payroll
                  </p>
                  <a href="/dashboard/employees/new" className="btn-primary">
                    + Add first employee
                  </a>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: '#a8a29e' }}>
                  No employees match &quot;{search}&quot;
                </p>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="table-head">
                  <th>Code</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Basic salary</th>
                  <th>Allowances</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="table-row" style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#78716c' }}>
                        {emp.employee_code}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500', color: '#1c1917' }}>
                      {emp.full_name}
                    </td>
                    <td>{emp.position || '—'}</td>
                    <td>{emp.department || '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ETB {Number(emp.basic_salary).toLocaleString()}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {emp.allowances > 0 ? `ETB ${Number(emp.allowances).toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${emp.status === 'active' ? 'green' : 'gray'}`}>
                        {emp.status}
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