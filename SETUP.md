# EthioPayroll — Setup Guide

A complete payroll, HR, and compliance platform built for Ethiopian
businesses. This guide gets you from a downloaded folder to a running app.

## What you need before starting

- **Node.js 18.17 or later** — check with `node -v`
- **A free Supabase account** — https://supabase.com
- **A code editor** (VS Code recommended)
- **Git** (only needed if you plan to deploy via GitHub + Vercel)

---

## Step 1 — Install dependencies

Open a terminal in this folder and run:

```bash
npm install
```

---

## Step 2 — Create your Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Choose a name, a database password (save it somewhere safe), and a
   region close to your users (e.g. an EU region if you're in Ethiopia —
   Supabase does not currently have an Africa region).
3. Wait about two minutes for the project to finish provisioning.

---

## Step 3 — Run the database setup script

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `SUPABASE_FULL_SETUP.sql` from this folder, copy the entire file,
   and paste it into the SQL Editor.
4. Click **Run**.

This creates all 12 tables (companies, profiles, employees, contractors,
payroll_runs, payslips, leave_requests, overtime_entries, offer_letters,
portal_tokens, team_invites, audit_log), every index, every Row Level
Security policy that keeps one company's data invisible to another, and two
`SECURITY DEFINER` functions (`create_company_and_profile`,
`accept_team_invite`) that are the *only* way a `profiles` row can come into
existence — the client can never insert one directly, which is what closes
off a company-hopping bug an earlier version of this schema had (see the
comments above the `profiles` policies in the SQL file if you want the full
story). It is safe to run more than once — every statement uses
`if not exists`, `create or replace`, or `drop ... if exists` first.

---

## Step 4 — Get your API keys

1. In Supabase, go to **Settings → API**.
2. You'll need three values:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → this is `SUPABASE_SERVICE_ROLE_KEY`

The **service_role key is secret** — it bypasses all security rules. It is
only used in one server-side file (`src/app/api/portal/[token]/route.js`)
to power the employee self-service portal, which has no login of its own.
Never put this key in a `NEXT_PUBLIC_` variable, never commit it to Git,
and never share it.

---

## Step 5 — Configure environment variables

1. Copy `.env.local.example` to a new file named `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and paste in your three values from Step 4.

3. (Optional) Generate a random string for `PORTAL_TOKEN_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

---

## Step 6 — Run it locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the landing
page. Click **Start free trial** to create your company account.

---

## Step 7 — Deploy (optional)

The easiest path is **Vercel** (free tier is enough to start):

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com, click **New Project**, and import your repo.
3. In the Vercel project's **Environment Variables** settings, add the
   same three variables from your `.env.local` file.
4. Click **Deploy**.

Vercel automatically applies the security headers defined in
`next.config.mjs` (Content-Security-Policy, HSTS, clickjacking protection,
and MIME-sniffing protection) to every deployed page.

---

## What's inside

| Area | What it does |
|---|---|
| **Employees** | Add and manage permanent staff, salaries, and banking details |
| **Payroll** | Run monthly payroll with automatic ERCA income tax and pension calculations |
| **Payslips** | Auto-generated per employee per run, printable / saveable as PDF |
| **ERCA reports** | Per-run tax filing summary, exportable as CSV |
| **Leave** | Request and approve annual, sick, maternity, paternity, and unpaid leave |
| **Overtime** | Log hours by type (weekday/rest-day/holiday/night) with correct multipliers, folds into next payroll run |
| **Offer letters** | Generate, preview, and print consistent offer letters |
| **Contractors** | Track non-payroll contractors with their own withholding tax rate |
| **Team** | Admins generate one-time invite links per role (admin/HR/finance/viewer); everyone's access is enforced at the database level, not just hidden buttons |
| **Employee portal** | A private link (no login) where staff can view their own payslips and leave history |
| **Settings** | Company profile, TIN, pension scheme |

---

## Security notes

- Every table has Row Level Security — a signed-in user can only ever see
  their own company's data, enforced at the database level, not just in
  the UI.
- Roles are enforced the same way: a `viewer` account gets a database-level
  read-only grant, not just disabled buttons in the interface. Only an
  `admin` can change company settings or another member's role, and that's
  backed by a trigger as well as a policy, so it holds even if you call the
  Supabase API directly instead of going through the app.
- Every text input passes through `src/lib/sanitize.js` before it reaches
  the database, stripping any HTML/script content (defense against stored
  XSS).
- `next.config.mjs` sets a strict Content-Security-Policy plus
  clickjacking, MIME-sniffing, and HSTS headers on every response.
- The employee portal never uses a Supabase session — it uses a single
  opaque, expiring token, resolved server-side only.
- This project runs **Next.js 15.5.18** (Maintenance LTS, supported with
  security patches through October 2026), not the older Next.js 14 line
  from earlier drafts of this project. Next.js 14 reached end-of-life in
  October 2025 and stopped receiving security patches — several real
  vulnerabilities (denial-of-service and source-code-exposure bugs in
  React Server Components) affect it with no fix available. Framework
  version is part of your attack surface: **run `npm outdated` every few
  months and upgrade `next`/`react`/`react-dom` promptly when a new patch
  release ships**, especially in response to a security advisory at
  https://nextjs.org/blog. A perfectly secure app on an unpatched
  framework is still an unpatched app.
- **Known remaining item:** `npm audit` will report one moderate-severity
  advisory (GHSA-qx2v-qp2m-jg93, a PostCSS XSS issue) coming from a
  private nested copy of `postcss@8.4.31` bundled *inside* Next.js
  15.5.18 itself — not from anything in this project's own dependencies.
  As of this writing there is no fix from either `npm audit fix` or a
  `package.json` override, because Next.js hard-pins that internal copy
  regardless of what version you install at the top level (tracked at
  https://github.com/vercel/next.js/issues/93234). The practical risk is
  low: this bug only matters if the app takes **user-submitted CSS** and
  re-stringifies it into a `<style>` tag, which nothing in this codebase
  does. Do **not** run `npm audit fix --force` — it will "fix" this by
  downgrading `next` to version 9.3.3, which will break the entire app.
  Re-check `npm audit` after each `next` upgrade; this should disappear
  once Vercel ships a patched release.

## Ethiopian tax figures used

The ERCA income tax brackets and 7%/11% pension split live in
`src/lib/payrollCalc.js`, in one place, so you only ever need to update
them in one file if the law changes. Double-check the current brackets
against the latest ERCA directive before relying on this for real filings.
