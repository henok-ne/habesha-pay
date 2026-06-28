'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const router = useRouter()
  const [company,  setCompany]  = useState(null)
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [name,     setName]     = useState('')
  const [tin,      setTin]      = useState('')
  const [phone,    setPhone]    = useState('')
  const [address,  setAddress]  = useState('')

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('*, companies(*)').eq('id', session.user.id).single()
      setProfile(prof)
      setCompany(prof?.companies)
      setName(prof?.companies?.name     || '')
      setTin( prof?.companies?.tin_number || '')
      setPhone(prof?.companies?.phone   || '')
      setAddress(prof?.companies?.address || '')
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('companies').update({ name, tin_number: tin, phone, address })
        .eq('id', profile.company_id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#f5f4f0',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <p style={{ fontSize:'13px',color:'#a8a29e' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'#f5f4f0' }}>
      <aside className="sidebar" style={{ width:'220px',flexShrink:0,position:'fixed',top:0,left:0,bottom:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #0d1f12',display:'flex',alignItems:'center',gap:'9px' }}>
          <div style={{ width:'24px',height:'24px',background:'#16a34a',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ color:'white',fontWeight:'700',fontSize:'11px' }}>H</span>
          </div>
          <span style={{ color:'white',fontWeight:'600',fontSize:'14px' }}>HabeshaPay</span>
        </div>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid #0d1f12' }}>
          <p className="sidebar-label" style={{ marginBottom:'3px' }}>Company</p>
          <p className="sidebar-company">{company?.name || '—'}</p>
        </div>
        <nav style={{ flex:1,padding:'10px' }}>
          {[
            { href:'/dashboard',           label:'Dashboard' },
            { href:'/dashboard/employees', label:'Employees' },
            { href:'/dashboard/payroll',   label:'Payroll'   },
            { href:'/dashboard/reports',   label:'Reports'   },
            { href:'/dashboard/settings',  label:'Settings', active:true },
          ].map(l => (
            <a key={l.href} href={l.href} className={`nav-item${l.active?' active':''}`}>{l.label}</a>
          ))}
        </nav>
      </aside>

      <main style={{ flex:1,marginLeft:'220px',padding:'36px 40px',maxWidth:'700px' }}>
        <h1 style={{ fontSize:'22px',fontWeight:'700',color:'#1c1917',letterSpacing:'-0.02em',marginBottom:'8px' }}>Settings</h1>
        <p style={{ fontSize:'13px',color:'#a8a29e',marginBottom:'32px' }}>Update your company information.</p>

        <form onSubmit={saveSettings}>
          <div className="card" style={{ padding:'24px',marginBottom:'16px' }}>
            <p className="section-title" style={{ marginBottom:'4px' }}>Company details</p>
            <p className="section-sub" style={{ marginBottom:'20px' }}>Used on payslips and ERCA filing documents</p>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
              <div>
                <label className="input-label">Company name</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Awash Trading PLC"/>
              </div>
              <div>
                <label className="input-label">TIN number</label>
                <input className="input" value={tin} onChange={e=>setTin(e.target.value)} placeholder="0000000000"/>
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+251 11 234 5678"/>
              </div>
              <div>
                <label className="input-label">Address</label>
                <input className="input" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Addis Ababa, Ethiopia"/>
              </div>
            </div>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding:'10px 20px' }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <p style={{ fontSize:'13px',color:'#16a34a',fontWeight:'500' }}>✓ Saved</p>}
          </div>
        </form>
      </main>
    </div>
  )
}