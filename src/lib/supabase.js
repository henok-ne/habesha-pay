import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in development rather than silently returning a broken client.
  // A misconfigured env file is the #1 cause of "nothing works" bug reports.
  console.error(
    'Missing Supabase environment variables. Copy .env.local.example to ' +
      '.env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Single shared client for the whole app. The anon key is safe to expose to
// the browser — every table is protected by Row Level Security (see
// SUPABASE_FULL_SETUP.sql), so the anon key alone can never read or write
// data outside the signed-in user's own company.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
