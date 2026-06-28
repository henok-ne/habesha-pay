'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Sidebar({ companyName }) {
  return (
    <aside className="sidebar" style={{ width:'220px',flexShrink:0,position:'fixed',top:0,left:0,bottom:0,display:'flex',flexDirection:'column' }}>
      <div style={{ padding:'18px 20px',borderBottom:'1px solid #0d1f12',display:'flex',alignItems:'center',gap:'9px' }}>
        <div style={{ width:'24px',height:'24px',background:'#16a34a',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ color:'white',fontWeight:'700',fontSize:'11px' }}>H</span>
        </div>
        <span style={{ color:'white',fontWeight:'600',fontSize:'14px' }}>HabeshaPay</span>
      </div>
      <div style={{ padding:'14px 20px',borderBottom:'1px solid #0d1f12' }}>
        <p className="sidebar-label" style={{ marginBottom:'3px' }}>Company</p>
        <p className="sidebar-company">{companyName || '—'}</p>
      </div>
      <nav style={{ flex:1,padding:'10px' }}>
        {[
          { href:'/dashboard',           label:'Dashboard'          },
          { href:'/dashboard/employees', label:'Employees'          },
          { href:'/dashboard/payroll',   label:'Payroll', active:true },
          { href:'/dashboard/reports',   label:'Reports'            },
          { href:'/dashboard/settings',  label:'Settings'           },
        ].map(l => (
          <a key={l.href} href={l.href} className={`nav-item${l.active?' active':''}`}>{l.label}</a>
        ))}
      </nav>
    </aside>
  )
}

function etb(n) {
  return 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

export default function Payroll() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [runs,    setRuns]    = useState([])

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*, companies(*)').eq('id', session.user.id).single()

      setCompany(prof?.companies)

      const { data: r } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', prof.company_id)
        .order('created_at', { ascending: false })

      setRuns(r || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <p style={{ fontSize:'13px',color:'#a8a29e' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'#f5f4f0' }}>
      <Sidebar companyName={company?.name}/>
      <main style={{ flex:1,marginLeft:'220px',padding:'36px 40px' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px' }}>
          <div>
            <h1 style={{ fontSize:'22px',fontWeight:'700',color:'#1c1917',letterSpacing:'-0.02em',marginBottom:'2px' }}>
              Payroll
            </h1>
            <p style={{ fontSize:'13px',color:'#a8a29e' }}>{runs.length} total runs</p>
          </div>
          <a href="/dashboard/payroll/new" className="btn-primary">▶ Run payroll</a>
        </div>

        <div className="card">
          {runs.length === 0 ? (
            <div style={{ padding:'60px 20px',textAlign:'center' }}>
              <p style={{ fontSize:'14px',color:'#78716c',fontWeight:'500',marginBottom:'4px' }}>No payroll runs yet</p>
              <p style={{ fontSize:'12px',color:'#a8a29e',marginBottom:'20px' }}>Run your first payroll to see it here</p>
              <a href="/dashboard/payroll/new" className="btn-primary">▶ Run first payroll</a>
            </div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr className="table-head">
                  <th>Period</th>
                  <th>Employees</th>
                  <th>Gross pay</th>
                  <th>ERCA tax</th>
                  <th>Net pay</th>
                  <th>Pay ERCA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="table-row">
                    <td style={{ fontWeight:'500',color:'#1c1917' }}>{run.period_month}</td>
                    <td>{run.total_employees ?? '—'}</td>
                    <td style={{ fontVariantNumeric:'tabular-nums' }}>
                      {run.total_gross ? etb(run.total_gross) : '—'}
                    </td>
                    <td style={{ fontVariantNumeric:'tabular-nums',color:'#dc2626' }}>
                      {run.total_income_tax ? etb(run.total_income_tax) : '—'}
                    </td>
                    <td style={{ fontVariantNumeric:'tabular-nums',color:'#16a34a',fontWeight:'500' }}>
                      {run.total_net_pay ? etb(run.total_net_pay) : '—'}
                    </td>
                    <td style={{ fontVariantNumeric:'tabular-nums',fontWeight:'600' }}>
                      {run.erca_payment_total ? etb(run.erca_payment_total) : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${run.status==='filed'?'green':run.status==='processed'?'blue':'gray'}`}>
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