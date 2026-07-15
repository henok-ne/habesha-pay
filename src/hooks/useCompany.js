'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * CompanyProvider / useCompany — resolves the signed-in user's profile and
 * company ONCE per dashboard session (not once per page). It's mounted a
 * single time in dashboard/layout.js, which persists across navigation in
 * the App Router, so switching between /dashboard/payroll, /dashboard/team,
 * etc. reuses the same profile/company data instead of re-querying Supabase
 * and re-showing a "Loading…" flash on every click.
 *
 * (Previously this was a plain hook that every page called independently,
 * so navigating around the dashboard fired a duplicate profiles+companies
 * query — and a duplicate onAuthStateChange subscription — on every single
 * page. Same data, same code, just paid for repeatedly.)
 */
const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setProfile(null);
      setCompany(null);
      setLoading(false);
      return;
    }

    setUser(session.user);

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // Most commonly: a signup that didn't finish (auth account exists,
      // no profile row yet). dashboard/layout.js turns this into a
      // recovery screen instead of a blank/broken dashboard.
      setProfile(null);
      setCompany(null);
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setProfile(profileRow);
    setCompany(profileRow?.companies ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription?.unsubscribe();
  }, [load]);

  const value = {
    user,
    profile,
    company,
    companyId: profile?.company_id ?? null,
    role: profile?.role ?? null,
    loading,
    error,
    refresh: load,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany() was called outside a <CompanyProvider>. Every /dashboard page is already wrapped by one in dashboard/layout.js — if you see this, check that the page lives under src/app/dashboard/.');
  }
  return ctx;
}
