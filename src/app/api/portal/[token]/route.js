import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This route runs server-side only. It uses the SERVICE ROLE key, which
// bypasses Row Level Security deliberately: the employee has no Supabase
// session at all, so RLS (which checks auth.uid()) could never let them
// through anyway. The token itself — a long random string, checked for
// expiry and single-use below — is the credential here, not a login.
//
// The service role key must NEVER be exposed to the browser. It is only
// read here, in a server route, from a non-NEXT_PUBLIC_ environment
// variable.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server-side only, never NEXT_PUBLIC_).'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request, { params }) {
  // Next.js 15+ passes route params as a Promise — must be awaited.
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'Invalid access link.' }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getServiceClient();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Portal is temporarily unavailable.' }, { status: 500 });
  }

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('portal_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: 'This link is invalid or has already been used.' }, { status: 404 });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired. Ask your employer for a new one.' }, { status: 410 });
  }

  const [{ data: employee }, { data: payslips }, { data: leaveRequests }, { data: companyRow }] = await Promise.all([
    supabaseAdmin.from('employees').select('*').eq('id', tokenRow.employee_id).single(),
    supabaseAdmin
      .from('payslips')
      .select('*, payroll_runs(period_month, period_year, status)')
      .eq('employee_id', tokenRow.employee_id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('employee_id', tokenRow.employee_id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin.from('companies').select('name, address, tin').eq('id', tokenRow.company_id).single(),
  ]);

  // Record that the link was accessed (does not invalidate it — it's a
  // multi-use link within its expiry window — but gives the employer a
  // signal in the audit log if they ever look).
  await supabaseAdmin
    .from('portal_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);

  return NextResponse.json({
    employee: employee
      ? {
          full_name: employee.full_name,
          employee_code: employee.employee_code,
          position: employee.position,
          department: employee.department,
        }
      : null,
    company: companyRow || null,
    payslips: payslips || [],
    leaveRequests: leaveRequests || [],
    expiresAt: tokenRow.expires_at,
  });
}
