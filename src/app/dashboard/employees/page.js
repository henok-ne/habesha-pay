'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCompany } from '@/hooks/useCompany';
import { formatETB } from '@/lib/payrollCalc';

export default function EmployeesPage() {
  const { companyId, loading: companyLoading } = useCompany();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/employees', {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to load employees.'
          );
        }

        setEmployees(result.employees || []);
      } catch (err) {
        console.error('Employees loading error:', err);
        setError(err.message || 'Unable to load employees.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [companyId]);

  const filtered = employees.filter((e) =>
    `${e.full_name} ${e.employee_code || ''} ${e.department || ''} ${e.position || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (companyLoading || loading) {
    return (
      <p className="font-num" style={{ color: '#6b6355' }}>
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="card-title">
          Unable to load employees
        </h2>

        <p
          style={{
            color: '#b42318',
            marginBottom: 16,
          }}
        >
          {error}
        </p>

        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Employees</h1>
        </div>

        <Link
          href="/dashboard/employees/new"
          className="btn btn-primary"
        >
          Add employee
        </Link>
      </div>

      <div className="card">
        <input
          placeholder="Search by name, code, department, or position…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: 16,
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sharp)',
            fontSize: 14,
          }}
        />

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No employees yet</h3>

            <p>
              Add your first employee to start running payroll.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Basic salary</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {emp.full_name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: '#6b6355',
                        }}
                      >
                        {emp.employee_code}
                      </div>
                    </td>

                    <td>
                      {emp.position || '—'}
                    </td>

                    <td>
                      {emp.department || '—'}
                    </td>

                    <td className="font-num">
                      {formatETB(emp.basic_salary)}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${emp.status}`}
                      >
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/dashboard/employees/${emp.id}`}
                        className="btn btn-ghost"
                        style={{
                          padding: '4px 10px',
                          fontSize: 13,
                        }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}