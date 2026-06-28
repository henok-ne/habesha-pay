'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Tax engine (same logic as our 46-test engine) ────────────
const BRACKETS = [
  { max: 600,      rate: 0,    ded: 0      },
  { max: 1650,     rate: 0.10, ded: 60     },
  { max: 3200,     rate: 0.15, ded: 142.50 },
  { max: 5250,     rate: 0.20, ded: 302.50 },
  { max: 7800,     rate: 0.25, ded: 565    },
  { max: 10900,    rate: 0.30, ded: 955    },
  { max: Infinity, rate: 0.35, ded: 1500   },
]

function calcPayslip(emp) {
  const basic   = Number(emp.basic_salary)
  const allow   = Number(emp.allowances) || 0
  const gross   = basic + allow
  const bracket = BRACKETS.find(b => gross <= b.max)
  const tax     = Math.round(Math.max(0, (gross * bracket.rate) - bracket.ded) * 100) / 100
  const empPen  = Math.round(basic * 0.07 * 100) / 100
  const emplrPen= Math.round(basic * 0.11 * 100) / 100
  const net     = Math.round((gross - tax - empPen) * 100) / 100
  return {
    employee_id:      emp.id,
    employee_code:    emp.employee_code,
    full_name:        emp.full_name,
    basic_salary:     basic,
    allowances:       allow,
    gross_salary:     gross,
    income_tax:       tax,
    employee_pension: empPen,
    employer_pension: emplrPen,
    total_deductions: Math.round((tax + empPen) * 100) / 100,
    net_pay:          net,
    tax_bracket:      `${(bracket.rate * 100)}%`,
    effective_rate:   gross > 0 ? Math.round((tax / gross) * 10000) / 100 : 0,
  }
}

function etb(n) {
  return 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ val, label })
  }
  return options
}

// ── Sidebar ───────────────────────────────────────────────────
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
          { href: '/dashboard',           label: 'Dashboard' },
          { href: '/dashboard/employees', label: 'Employees' },
          { href: '/dashboard/payroll',   label: 'Payroll', active: true },
        ].map(l => (
          <a key={l.href} href={l.href} className={`nav-item${l.active ? ' active' : ''}`}>
            {l.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function RunPayroll() {
  const router  = useRouter()
  const [loading,    setLoading]    = useState(true)
  const [processing, setProcessing] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState(null)
  const [period,     setPeriod]     = useState(currentPeriod())
  const [company,    setCompany]    = useState(null)
  const [companyId,  setCompanyId]  = useState(null)
  const [payslips,   setPayslips]   = useState([])
  const [runResult,  setRunResult]  = useState(null)

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
      setCompanyId(prof?.company_id)

      const { data: emps } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', prof.company_id)
        .eq('status', 'active')
        .order('employee_code')

      setPayslips((emps || []).map(calcPayslip))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Recalculate if period changes (for display only — same calc)
  const totals = payslips.reduce((acc, p) => ({
    employees:    acc.employees    + 1,
    gross:        acc.gross        + p.gross_salary,
    incomeTax:    acc.incomeTax    + p.income_tax,
    empPension:   acc.empPension   + p.employee_pension,
    emplrPension: acc.emplrPension + p.employer_pension,
    netPay:       acc.netPay       + p.net_pay,
  }), { employees: 0, gross: 0, incomeTax: 0, empPension: 0, emplrPension: 0, netPay: 0 })

  const ercaTotal = Math.round((totals.incomeTax + totals.empPension + totals.emplrPension) * 100) / 100

  async function processPayroll() {
    setProcessing(true)
    setError(null)

    try {
      // Check not already run
      const { data: existing } = await supabase
        .from('payroll_runs')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('period_month', period)
        .single()

      if (existing) {
        throw new Error(`Payroll for ${period} already exists (status: ${existing.status}). Each month can only be processed once.`)
      }

      // Create payroll run record
      const { data: run, error: runErr } = await supabase
        .from('payroll_runs')
        .insert({
          company_id:             companyId,
          period_month:           period,
          status:                 'processed',
          total_employees:        totals.employees,
          total_gross:            Math.round(totals.gross        * 100) / 100,
          total_income_tax:       Math.round(totals.incomeTax    * 100) / 100,
          total_employee_pension: Math.round(totals.empPension   * 100) / 100,
          total_employer_pension: Math.round(totals.emplrPension * 100) / 100,
          total_net_pay:          Math.round(totals.netPay       * 100) / 100,
          erca_payment_total:     ercaTotal,
          processed_at:           new Date().toISOString(),
        })
        .select()
        .single()

      if (runErr) throw runErr

      // Create individual payslips
      const payslipRows = payslips.map(p => ({
        payroll_run_id:   run.id,
        company_id:       companyId,
        employee_id:      p.employee_id,
        period_month:     period,
        basic_salary:     p.basic_salary,
        allowances:       p.allowances,
        other_deductions: 0,
        gross_salary:     p.gross_salary,
        income_tax:       p.income_tax,
        employee_pension: p.employee_pension,
        employer_pension: p.employer_pension,
        total_deductions: p.total_deductions,
        net_pay:          p.net_pay,
        tax_bracket:      p.tax_bracket,
        effective_rate:   p.effective_rate,
      }))

      const { error: slipsErr } = await supabase
        .from('payslips')
        .insert(payslipRows)

      if (slipsErr) throw slipsErr

      setRunResult(run)
      setDone(true)

    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '13px', color: '#a8a29e' }}>Loading payroll data...</p>
      </div>
    )
  }

  // ── Success state ─────────────────────────────────────────
  if (done && runResult) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
        <Sidebar companyName={company?.name}/>
        <main style={{ flex: 1, marginLeft: '220px', padding: '36px 40px' }}>
          <div style={{ maxWidth: '600px' }}>

            {/* Success header */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '24px', marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', background: '#16a34a',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#15803d' }}>
                    Payroll processed
                  </p>
                  <p style={{ fontSize: '13px', color: '#16a34a' }}>
                    {period} · {totals.employees} {totals.employees === 1 ? 'employee' : 'employees'}
                  </p>
                </div>
              </div>
            </div>

            {/* ERCA Filing box */}
            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#a8a29e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
                ERCA payment due
              </p>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#1c1917', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {etb(ercaTotal)}
              </p>
              <p style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '20px' }}>
                Pay this to ERCA by end of next month
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Income tax withheld',    val: totals.incomeTax    },
                  { label: 'Employee pension (7%)',   val: totals.empPension   },
                  { label: 'Employer pension (11%)',  val: totals.emplrPension },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #faf9f7' }}>
                    <p style={{ fontSize: '13px', color: '#57534e' }}>{row.label}</p>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#1c1917', fontVariantNumeric: 'tabular-nums' }}>
                      {etb(Math.round(row.val * 100) / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#a8a29e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Payroll summary
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Total gross salary',   val: totals.gross  },
                  { label: 'Total net pay',         val: totals.netPay },
                  { label: 'Total company cost',    val: Math.round((totals.gross + totals.emplrPension) * 100) / 100 },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #faf9f7' }}>
                    <p style={{ fontSize: '13px', color: '#57534e' }}>{row.label}</p>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#1c1917', fontVariantNumeric: 'tabular-nums' }}>
                      {etb(row.val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <a href="/dashboard" className="btn-primary">
              Back to dashboard
            </a>
          </div>
        </main>
      </div>
    )
  }

  // ── Main payroll review screen ────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      <Sidebar companyName={company?.name}/>

      <main style={{ flex: 1, marginLeft: '220px', padding: '36px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <a href="/dashboard" style={{ fontSize: '13px', color: '#a8a29e', textDecoration: 'none' }}>Dashboard</a>
              <span style={{ color: '#e8e5e0' }}>/</span>
              <span style={{ fontSize: '13px', color: '#1c1917', fontWeight: '500' }}>Run payroll</span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1c1917', letterSpacing: '-0.02em' }}>
              Run payroll
            </h1>
          </div>

          {/* Period selector */}
          <div>
            <label className="input-label">Payroll period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="input" style={{ width: '200px' }}>
              {periodOptions().map(o => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '20px' }}>{error}</div>
        )}

        {payslips.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#78716c', marginBottom: '4px', fontWeight: '500' }}>
              No active employees
            </p>
            <p style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '20px' }}>
              Add employees before running payroll
            </p>
            <a href="/dashboard/employees/new" className="btn-primary">
              + Add employee
            </a>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div style={{
              background: '#060e08', borderRadius: '10px',
              padding: '20px 24px', marginBottom: '20px',
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px',
            }}>
              {[
                { label: 'Employees',  val: totals.employees, format: n => n },
                { label: 'Gross pay',  val: totals.gross,     format: etb    },
                { label: 'ERCA tax',   val: totals.incomeTax, format: etb    },
                { label: 'Net pay',    val: totals.netPay,    format: etb    },
                { label: 'Pay ERCA',   val: ercaTotal,        format: etb, highlight: true },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {item.label}
                  </p>
                  <p style={{
                    fontSize: '16px', fontWeight: '700', letterSpacing: '-0.02em',
                    color: item.highlight ? '#4ade80' : 'white',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {item.format(Math.round(item.val * 100) / 100)}
                  </p>
                </div>
              ))}
            </div>

            {/* Employee payslip table */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece8' }}>
                <p className="section-title">
                  Employee payslips — {payslips.length} employee{payslips.length !== 1 ? 's' : ''}
                </p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="table-head">
                    <th>Employee</th>
                    <th>Gross</th>
                    <th>Income tax</th>
                    <th>Pension (7%)</th>
                    <th>Net pay</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.employee_id} className="table-row">
                      <td>
                        <p style={{ fontWeight: '500', color: '#1c1917', marginBottom: '1px' }}>
                          {p.full_name}
                        </p>
                        <p style={{ fontSize: '11px', color: '#a8a29e', fontFamily: 'monospace' }}>
                          {p.employee_code}
                        </p>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{etb(p.gross_salary)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>{etb(p.income_tax)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#d97706' }}>{etb(p.employee_pension)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: '#16a34a' }}>{etb(p.net_pay)}</td>
                      <td>
                        <span className="badge badge-gray">{p.tax_bracket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Process button */}
            <div style={{
              background: 'white', border: '1px solid #e8e5e0',
              borderRadius: '10px', padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1c1917', marginBottom: '2px' }}>
                  Ready to process?
                </p>
                <p style={{ fontSize: '12px', color: '#a8a29e' }}>
                  This will save payslips for all {payslips.length} employees and record the ERCA payment of {etb(ercaTotal)}.
                </p>
              </div>
              <button onClick={processPayroll} disabled={processing}
                className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
                {processing ? 'Processing...' : `Process payroll →`}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}