'use client'
export default function Reports() {
  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'#f5f4f0' }}>
      <aside className="sidebar" style={{ width:'220px',flexShrink:0,position:'fixed',top:0,left:0,bottom:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #0d1f12',display:'flex',alignItems:'center',gap:'9px' }}>
          <div style={{ width:'24px',height:'24px',background:'#16a34a',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ color:'white',fontWeight:'700',fontSize:'11px' }}>H</span>
          </div>
          <span style={{ color:'white',fontWeight:'600',fontSize:'14px' }}>HabeshaPay</span>
        </div>
        <nav style={{ flex:1,padding:'10px' }}>
          {[
            { href:'/dashboard',           label:'Dashboard' },
            { href:'/dashboard/employees', label:'Employees' },
            { href:'/dashboard/payroll',   label:'Payroll'   },
            { href:'/dashboard/reports',   label:'Reports', active:true },
            { href:'/dashboard/settings',  label:'Settings'  },
          ].map(l => (
            <a key={l.href} href={l.href} className={`nav-item${l.active?' active':''}`}>{l.label}</a>
          ))}
        </nav>
      </aside>
      <main style={{ flex:1,marginLeft:'220px',padding:'36px 40px' }}>
        <h1 style={{ fontSize:'22px',fontWeight:'700',color:'#1c1917',letterSpacing:'-0.02em',marginBottom:'8px' }}>Reports</h1>
        <p style={{ fontSize:'13px',color:'#a8a29e',marginBottom:'32px' }}>ERCA filing documents and payroll history exports.</p>
        <div className="card" style={{ padding:'60px',textAlign:'center' }}>
          <p style={{ fontSize:'14px',color:'#78716c',fontWeight:'500',marginBottom:'4px' }}>Coming soon</p>
          <p style={{ fontSize:'12px',color:'#a8a29e' }}>
            ERCA declaration PDF, annual payroll summary, and employee payslip exports.
          </p>
        </div>
      </main>
    </div>
  )
}