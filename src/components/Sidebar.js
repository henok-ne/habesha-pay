'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  Clock,
  FileText,
  Banknote,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    links: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'HR',
    links: [
      { href: '/dashboard/employees', label: 'Employees', icon: Users },
      { href: '/dashboard/team', label: 'Team', icon: UserCog },
      { href: '/dashboard/leave', label: 'Leave', icon: CalendarDays },
      { href: '/dashboard/overtime', label: 'Overtime', icon: Clock },
      { href: '/dashboard/offer-letters', label: 'Offer Letters', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    links: [
      { href: '/dashboard/payroll', label: 'Payroll', icon: Banknote },
      { href: '/dashboard/contractors', label: 'Contractors', icon: Briefcase },
      { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Company',
    links: [{ href: '/dashboard/settings', label: 'Settings', icon: Settings }],
  },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleSignOut() {
    await signOut({
      callbackUrl: '/login',
    });
  }

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}
        aria-label="Main navigation"
      >
        <div
          className="sidebar-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>EthioPayroll</span>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">
                {section.label}
              </div>

              {section.links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      style={{ flexShrink: 0 }}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '16px 24px 0 24px',
            borderTop: '1px solid rgba(246,243,236,0.15)',
          }}
        >
          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn-ghost"
            style={{
              color: 'var(--parchment)',
              width: '100%',
              justifyContent: 'flex-start',
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}