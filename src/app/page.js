import Link from 'next/link';

const FEATURES = [
  {
    title: 'ERCA-compliant payroll',
    body: 'Progressive income tax brackets, pension contributions, and payslips calculated the way ERCA expects them — not adapted from a foreign template.',
  },
  {
    title: 'Overtime, by the law',
    body: 'Weekday, rest-day, public-holiday, and night multipliers applied automatically, then folded straight into the next payroll run.',
  },
  {
    title: 'Leave, tracked properly',
    body: 'Annual, sick, maternity, and paternity leave with an approval trail your HR team and your employees can both see.',
  },
  {
    title: 'Contractors, separately',
    body: 'Withholding tax on contractor payments handled apart from your permanent staff payroll, the way ERCA requires.',
  },
  {
    title: 'Offer letters that hold up',
    body: 'Generate consistent, professional offer letters in minutes, with every term recorded for later reference.',
  },
  {
    title: 'A portal your staff can use',
    body: 'Employees view payslips and leave balances through a private link — no separate login to manage or forget.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '2,500',
    period: '/ month',
    for: 'Up to 15 employees',
    features: ['Payroll runs', 'Payslips (PDF)', 'Leave tracking', 'Email support'],
  },
  {
    name: 'Growth',
    price: '6,500',
    period: '/ month',
    for: 'Up to 75 employees',
    features: [
      'Everything in Starter',
      'Overtime management',
      'Contractor payments',
      'Offer letter generator',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    for: 'Unlimited employees',
    features: [
      'Everything in Growth',
      'Multi-branch reporting',
      'Dedicated onboarding',
      'Custom ERCA filing exports',
    ],
  },
];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--parchment)' }}>
      {/* ---------------------------------------------------------------- */}
      {/* HERO */}
      {/* ---------------------------------------------------------------- */}
      <header
        style={{
          background: 'var(--ink)',
          color: 'var(--parchment)',
          minHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '28px 48px',
          }}
        >
          <span className="font-display" style={{ fontSize: 20, color: 'var(--white)' }}>
            EthioPayroll
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" className="btn btn-ghost" style={{ color: 'var(--parchment)' }}>
              Log in
            </Link>
            <Link href="/signup" className="btn" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
              Start free trial
            </Link>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 880,
            padding: '0 48px 64px 48px',
          }}
        >
          <div
            className="font-num"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--gold)',
                display: 'inline-block',
              }}
            />
            Built for Ethiopian businesses · ERCA compliant
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 56,
              color: 'var(--white)',
              margin: '0 0 24px 0',
              lineHeight: 1.08,
            }}
          >
            Payroll that speaks Birr,
            <br />
            not a foreign spreadsheet.
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(246,243,236,0.75)', maxWidth: 560, marginBottom: 36 }}>
            Run payroll, manage leave and overtime, pay contractors, and issue offer letters —
            all built around Ethiopian tax law and labor law from the ground up.
          </p>

          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 24px' }}>
              Start free trial
            </Link>
            <Link
              href="#pricing"
              className="btn"
              style={{ fontSize: 15, padding: '14px 24px', color: 'var(--parchment)', border: '1px solid rgba(246,243,236,0.35)' }}
            >
              See pricing
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* FEATURES */}
      {/* ---------------------------------------------------------------- */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <span className="page-eyebrow">What it does</span>
        <h2 style={{ fontSize: 32, marginBottom: 40 }}>Everything payroll touches, in one place</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 style={{ fontSize: 17, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#4a4438', lineHeight: 1.55, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* PRICING */}
      {/* ---------------------------------------------------------------- */}
      <section id="pricing" style={{ padding: '20px 48px 100px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <span className="page-eyebrow">Pricing</span>
        <h2 style={{ fontSize: 32, marginBottom: 40 }}>Priced in Birr, sized to your team</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="card"
              style={
                plan.highlighted
                  ? { borderColor: 'var(--forest)', borderWidth: 2 }
                  : undefined
              }
            >
              {plan.highlighted && (
                <span
                  className="font-num"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--forest)',
                  }}
                >
                  Most popular
                </span>
              )}
              <h3 style={{ fontSize: 20, margin: '8px 0 4px 0' }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: '#6b6355', marginBottom: 16 }}>{plan.for}</p>
              <div style={{ marginBottom: 20 }}>
                <span className="font-num" style={{ fontSize: 30, fontWeight: 700 }}>
                  {plan.price === 'Custom' ? 'Custom' : `ETB ${plan.price}`}
                </span>
                <span style={{ fontSize: 13, color: '#6b6355' }}>{plan.period}</span>
              </div>
              <hr className="divider" style={{ margin: '0 0 16px 0' }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ fontSize: 14, marginBottom: 10, paddingLeft: 18, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--forest)' }}>—</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={plan.highlighted ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--line)',
          padding: '28px 48px',
          fontSize: 13,
          color: '#6b6355',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>© {new Date().getFullYear()} EthioPayroll. Addis Ababa.</span>
        <span>Built for Ethiopian businesses.</span>
      </footer>
    </div>
  );
}
