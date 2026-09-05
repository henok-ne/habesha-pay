# EthioPayroll — Setup Guide

A payroll, HR, and compliance platform built for Ethiopian businesses using **Next.js, MongoDB, and Mongoose**.

This guide explains how to set up the project locally and deploy it.

---

## What you need before starting

* **Node.js 18.17 or later**
* **MongoDB Atlas account** or a local MongoDB installation
* **VS Code** or another code editor
* **Git** — only required if you plan to deploy through GitHub
* A modern web browser

Check your Node.js version:

```bash
node -v
```

You should see version `18.17` or newer.

---

# Step 1 — Install dependencies

Open a terminal in the project folder:

```bash
npm install
```

If you are starting from a fresh installation, this will install all required dependencies.

---

# Step 2 — Create a MongoDB database

You can use either:

* MongoDB Atlas — recommended for development and deployment
* A local MongoDB server

## Option A — MongoDB Atlas

Go to:

https://www.mongodb.com/atlas

Create an account and create a new project.

Then:

1. Create a free MongoDB cluster.
2. Create a database user.
3. Choose a username and password.
4. Add your current IP address under **Network Access**.
5. Go to **Database → Connect**.
6. Select **Drivers**.
7. Copy the MongoDB connection string.

It will look similar to:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/ethio_payroll?retryWrites=true&w=majority
```

Replace:

* `USERNAME` with your MongoDB database username.
* `PASSWORD` with your MongoDB database password.
* `CLUSTER` with your MongoDB cluster hostname.

If your password contains special characters such as `@`, `#`, `/`, `:`, or `%`, URL-encode the password before putting it in the connection string.

---

## Option B — Local MongoDB

If MongoDB is installed locally, your connection string can be:

```text
mongodb://127.0.0.1:27017/ethio_payroll
```

The application will create the required collections as data is inserted.

---

# Step 3 — Configure environment variables

Create a file named:

```text
.env.local
```

in the root of the project.

You can start from the example file:

```bash
cp .env.local.example .env.local
```

On Windows PowerShell, you can also simply copy the file manually:

```text
.env.local.example
        ↓
.env.local
```

Open `.env.local` and configure the following variables:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/ethio_payroll?retryWrites=true&w=majority

AUTH_SECRET=your-long-random-secret

PORTAL_TOKEN_SECRET=your-long-random-portal-secret

NEXTAUTH_URL=http://localhost:3000
```

### `MONGODB_URI`

This is the connection string for your MongoDB database.

Example:

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/ethio_payroll?retryWrites=true&w=majority
```

Do **not** use the example credentials above.

---

### `AUTH_SECRET`

This secret is used to protect authentication/session data.

Generate a strong random value.

For example, with OpenSSL:

```bash
openssl rand -base64 32
```

Then put the generated value into:

```env
AUTH_SECRET=YOUR_GENERATED_SECRET
```

---

### `PORTAL_TOKEN_SECRET`

This secret is used to protect employee portal tokens.

Generate another random value:

```bash
openssl rand -base64 32
```

Then add it:

```env
PORTAL_TOKEN_SECRET=YOUR_GENERATED_SECRET
```

Use a **different value** from `AUTH_SECRET`.

---

### `NEXTAUTH_URL`

For local development:

```env
NEXTAUTH_URL=http://localhost:3000
```

When deploying, change this to your production URL.

For example:

```env
NEXTAUTH_URL=https://your-domain.com
```

---

# Step 4 — Verify your environment file

Your `.env.local` should contain something similar to:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/ethio_payroll?retryWrites=true&w=majority

AUTH_SECRET=your-auth-secret

PORTAL_TOKEN_SECRET=your-portal-token-secret

NEXTAUTH_URL=http://localhost:3000
```

### Important

Do **not** commit `.env.local` to Git.

The project already includes `.env*.local` in `.gitignore`.

Never share:

* MongoDB passwords
* `MONGODB_URI`
* `AUTH_SECRET`
* `PORTAL_TOKEN_SECRET`
* private API keys
* production credentials

---

# Step 5 — Start the application

Run:

```bash
npm run dev
```

You should see something similar to:

```text
Ready in ...
Local: http://localhost:3000
```

Open:

```text
http://localhost:3000
```

in your browser.

---

# Step 6 — Create your first company account

From the landing page:

1. Click **Start free trial**.
2. Create an account.
3. Enter the company information.
4. Complete registration.
5. Log in to the dashboard.

The application will store the data in MongoDB through Mongoose.

---

# MongoDB database structure

The application uses Mongoose models for the main application entities.

The major collections include:

| Collection        | Purpose                       |
| ----------------- | ----------------------------- |
| `companies`       | Company information           |
| `profiles`        | User profiles and roles       |
| `employees`       | Employee information          |
| `contractors`     | Contractor information        |
| `payrollruns`     | Payroll runs                  |
| `payslips`        | Employee payslips             |
| `leaverequests`   | Leave requests                |
| `overtimeentries` | Overtime records              |
| `offerletters`    | Employee offer letters        |
| `portaltokens`    | Employee portal access tokens |
| `teaminvites`     | Team invitations              |
| `auditlogs`       | Application audit records     |

The exact MongoDB collection names are determined by the Mongoose models in:

```text
src/models/
```

---

# How MongoDB is used by the application

The application does **not** connect directly from the browser to MongoDB.

The architecture is:

```text
Browser
   ↓
Next.js frontend
   ↓
API routes
   ↓
Mongoose
   ↓
MongoDB
```

For example:

```text
Employee page
     ↓
/api/employees
     ↓
Employee Mongoose model
     ↓
MongoDB employees collection
```

This keeps the MongoDB credentials on the server and prevents the browser from accessing the database directly.

---

# Authentication

Authentication is handled by NextAuth.

The application uses:

```text
Next.js
   ↓
NextAuth
   ↓
MongoDB/Mongoose
```

Authentication-related secrets are stored in environment variables.

Never expose `AUTH_SECRET` to the browser.

---

# Employee Portal

The employee portal uses a private token rather than exposing MongoDB credentials or database access to employees.

The general flow is:

```text
Employee portal link
       ↓
Portal token
       ↓
Next.js API
       ↓
MongoDB
       ↓
Employee's own information
```

The portal token secret is stored in:

```env
PORTAL_TOKEN_SECRET=...
```

---

# Application features

| Area                | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| **Employees**       | Add and manage permanent staff, salaries, and banking details               |
| **Payroll**         | Run monthly payroll with automatic ERCA income tax and pension calculations |
| **Payslips**        | Generate employee payslips for payroll runs                                 |
| **ERCA reports**    | Generate payroll/tax reporting information                                  |
| **Leave**           | Request and approve annual, sick, maternity, paternity, and unpaid leave    |
| **Overtime**        | Record overtime hours using the appropriate multipliers                     |
| **Offer letters**   | Generate, preview, and print offer letters                                  |
| **Contractors**     | Manage non-payroll contractors and withholding tax                          |
| **Team**            | Manage team members and role-based access                                   |
| **Employee portal** | Allow employees to view their own payslips and leave information            |
| **Settings**        | Manage company information, TIN, and pension settings                       |
| **Reports**         | View payroll and company reports                                            |

---

# Security

## MongoDB credentials

MongoDB credentials must remain server-side.

Never put:

```env
MONGODB_URI=...
```

inside a `NEXT_PUBLIC_*` variable.

Do not commit `.env.local`.

---

## Company data isolation

Because MongoDB does not provide the same Row Level Security mechanism used by Supabase/PostgreSQL, company-level authorization must be enforced by the application's server-side API routes.

API routes should verify that the authenticated user has access to the requested company and records.

For example:

```text
Authenticated user
       ↓
Determine company
       ↓
Verify authorization
       ↓
Query MongoDB using companyId
       ↓
Return only authorized records
```

Do not rely only on frontend UI restrictions.

A hidden button is not a security mechanism.

---

## Input sanitization

User-provided text should be sanitized before being stored or rendered where appropriate.

The project includes:

```text
src/lib/sanitize.js
```

This provides an additional defense against stored XSS.

---

## HTTP security headers

`next.config.mjs` configures security headers including:

* Content Security Policy
* X-Frame-Options
* X-Content-Type-Options
* Strict-Transport-Security
* Referrer-Policy
* Permissions-Policy

MongoDB does not need to be included in the browser's Content Security Policy because MongoDB connections happen server-side.

---

# Development commands

Start the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Check for outdated packages:

```bash
npm outdated
```

Check for dependency vulnerabilities:

```bash
npm audit
```

---

# Troubleshooting

## MongoDB connection error

If you see a MongoDB connection error, check:

1. `MONGODB_URI` exists in `.env.local`.
2. The username is correct.
3. The password is correct.
4. The MongoDB cluster is running.
5. Your IP address is allowed in MongoDB Atlas **Network Access**.
6. Special characters in the password are URL-encoded.
7. Restart the development server after changing `.env.local`.

---

## `MONGODB_URI` is undefined

Make sure the file is named exactly:

```text
.env.local
```

and is located in the project root:

```text
EthioPayroll/
├── .env.local
├── package.json
├── next.config.mjs
├── src/
└── ...
```

Then restart:

```bash
npm run dev
```

---

## Authentication problems

Check that:

```env
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

are configured correctly.

After changing authentication environment variables, restart the development server.

---

# Deployment

The application can be deployed using services such as Vercel.

## Step 1 — Push the project to GitHub

Make sure `.env.local` is not committed.

Check:

```bash
git status
```

Your environment file should not appear as a file to commit.

---

## Step 2 — Create a Vercel project

Go to:

https://vercel.com

Create a new project and import your GitHub repository.

---

## Step 3 — Add environment variables

In your Vercel project, add:

```text
MONGODB_URI
AUTH_SECRET
PORTAL_TOKEN_SECRET
NEXTAUTH_URL
```

For example:

```env
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=...
PORTAL_TOKEN_SECRET=...
NEXTAUTH_URL=https://your-production-domain.com
```

Do not put production secrets directly into source code.

---

## Step 4 — Configure MongoDB Atlas

In MongoDB Atlas:

1. Open **Network Access**.
2. Configure access for your deployment environment.
3. Make sure the database user has the required permissions.
4. Confirm that the production application can connect to the cluster.

For production, avoid unnecessarily broad database/network permissions.

---

## Step 5 — Deploy

After configuring the environment variables, deploy the project.

Vercel will build the Next.js application and start the production version.

---

# Supabase Migration

This version of EthioPayroll uses **MongoDB/Mongoose instead of Supabase**.

The application no longer requires:

* Supabase account
* Supabase project
* Supabase SQL setup
* Supabase API URL
* Supabase anon key
* Supabase service-role key
* Supabase Row Level Security
* Supabase client-side database access

The old file:

```text
SUPABASE_FULL_SETUP.sql
```

is no longer required for the MongoDB version.

Likewise, the old Supabase client should not be required by the application.

---

# Project structure

The important parts of the application are:

```text
src/
├── app/
│   ├── api/
│   │   ├── employees/
│   │   ├── payroll/
│   │   ├── payslips/
│   │   ├── leave/
│   │   ├── overtime/
│   │   ├── contractors/
│   │   ├── reports/
│   │   ├── team/
│   │   └── ...
│   │
│   └── ...
│
├── lib/
│   ├── mongodb.js
│   ├── payrollCalc.js
│   └── sanitize.js
│
└── models/
    ├── Company.js
    ├── Profile.js
    ├── Employee.js
    ├── Contractor.js
    ├── PayrollRun.js
    ├── Payslip.js
    ├── LeaveRequest.js
    ├── OvertimeEntry.js
    ├── OfferLetter.js
    ├── PortalToken.js
    ├── TeamInvite.js
    └── AuditLog.js
```

---

# Before using the application for real payroll

The payroll calculation logic is located in:

```text
src/lib/payrollCalc.js
```

The Ethiopian tax and pension calculations should be checked against the latest applicable Ethiopian tax and pension rules before using the application for actual payroll filing.

The application is a software system and should not be treated as a substitute for professional tax or legal advice.

---

# Quick Start

If MongoDB Atlas is already configured, the shortest setup is:

```bash
npm install
```

Create `.env.local`:

```env
MONGODB_URI=your-mongodb-connection-string
AUTH_SECRET=your-auth-secret
PORTAL_TOKEN_SECRET=your-portal-token-secret
NEXTAUTH_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

You are ready to use the MongoDB version of EthioPayroll.
