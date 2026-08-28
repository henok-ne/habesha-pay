'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [role, setRole] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/company', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setUser(null);
        setProfile(null);
        setCompany(null);
        setCompanyId(null);
        setRole(null);

        setError(result.message || 'Unable to load company information.');
        setLoading(false);

        return;
      }

      setUser(result.user);
      setProfile(result.profile);
      setCompany(result.company);
      setCompanyId(result.companyId);
      setRole(result.role);

      setLoading(false);
    } catch (err) {
      console.error('useCompany error:', err);

      setUser(null);
      setProfile(null);
      setCompany(null);
      setCompanyId(null);
      setRole(null);

      setError('Unable to connect to the server.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = {
    user,
    profile,
    company,
    companyId,
    role,
    loading,
    error,
    refresh: load,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);

  if (!ctx) {
    throw new Error(
      'useCompany() was called outside a <CompanyProvider>. Every /dashboard page is already wrapped by one in dashboard/layout.js.'
    );
  }

  return ctx;
}