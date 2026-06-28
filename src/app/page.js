// src/app/page.js
// ─────────────────────────────────────────────
// This is the landing page — the first thing
// a potential customer sees at your domain.
// Every time you save (Ctrl+S), the browser
// updates automatically. No refresh needed.
// ─────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── NAVIGATION ── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">HabeshaPay</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </a>
          <a href="/signup"
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors">
            Get started free
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-block bg-green-50 text-green-700 text-sm font-medium
                        px-4 py-1.5 rounded-full mb-6">
          Built specifically for Ethiopian businesses
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Ethiopian payroll,<br />
          <span className="text-green-600">done right.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Calculate ERCA income tax across all 7 brackets, generate payslips in Amharic,
          and file monthly declarations — in minutes, not days.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/signup"
            className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-medium
                       hover:bg-green-700 transition-colors text-lg">
            Start free trial
          </a>
          <a href="#how-it-works"
            className="text-gray-600 px-8 py-3.5 rounded-xl font-medium
                       border border-gray-200 hover:border-gray-300 transition-colors text-lg">
            See how it works
          </a>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">7</div>
            <div className="text-sm text-gray-500">ERCA tax brackets handled automatically</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">&lt; 30 min</div>
            <div className="text-sm text-gray-500">to process payroll for 200 employees</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">0 errors</div>
            <div className="text-sm text-gray-500">tax calculation accuracy, tested on every build</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Everything your HR team needs
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-xl mx-auto">
          Built from the ground up for Ethiopian labor law and ERCA requirements.
          No workarounds. No manual adjustments.
        </p>

        <div className="grid grid-cols-3 gap-8">

          {/* Feature 1 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">🧮</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">ERCA Tax Engine</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              All 7 income tax brackets calculated correctly every time.
              Tested against 46 known values. Updates automatically when rates change.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Payslip Generation</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Professional payslips in Amharic and English. Every deduction
              explained clearly. One click to generate for all employees.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">🏦</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Pension & Compliance</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Employee (7%) and employer (11%) pension on basic salary only —
              the rule most software gets wrong. Monthly ERCA filing documents auto-generated.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Employee Management</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Store every employee&apos;s contract, salary history, leave records,
              and documents in one place. No more paper files.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Deadline Reminders</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Never miss an ERCA filing date. Automatic reminders before the
              end-of-month deadline. Late penalty is 5% — we make sure you never pay it.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-100
                          hover:bg-green-50 transition-colors group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center
                            justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cost Reports</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              See your real cost per employee including employer pension.
              Monthly, quarterly and annual payroll summaries ready for your accountant.
            </p>
          </div>

        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="bg-green-600 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to fix your payroll?
        </h2>
        <p className="text-green-100 mb-8 text-lg max-w-xl mx-auto">
          Join Ethiopian companies already running accurate, stress-free payroll.
          Free for your first month.
        </p>
        <a href="/signup"
          className="inline-block bg-white text-green-700 px-10 py-4 rounded-xl
                     font-semibold text-lg hover:bg-green-50 transition-colors">
          Start free — no credit card needed
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-8 py-10 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="font-semibold text-gray-700">HabeshaPay</span>
          </div>
          <div className="text-sm text-gray-400">
            Built in Addis Ababa · ERCA compliant · © 2025
          </div>
        </div>
      </footer>

    </main>
  );
}