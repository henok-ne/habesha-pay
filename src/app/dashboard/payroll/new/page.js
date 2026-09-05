'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculatePayslip,
  calculateOvertimePay,
  formatETB,
} from '@/lib/payrollCalc';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function NewPayrollRunPage() {
  const router = useRouter();

  const now = new Date();

  const [periodMonth, setPeriodMonth] = useState(
    now.getMonth() + 1
  );

  const [periodYear, setPeriodYear] = useState(
    now.getFullYear()
  );

  const [employees, setEmployees] = useState([]);
  const [overtimeByEmployee, setOvertimeByEmployee] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /*
   * Load employees and overtime from MongoDB
   * through our API.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/payroll?preview=true&month=${periodMonth}&year=${periodYear}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Failed to load payroll preview.'
          );
        }

        if (cancelled) return;

        setEmployees(data.employees || []);
        setOvertimeByEmployee(
          data.overtimeByEmployee || {}
        );
      } catch (err) {
        if (cancelled) return;

        console.error(err);

        setEmployees([]);
        setOvertimeByEmployee({});
        setError(
          err.message ||
            'Failed to load payroll preview.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [periodMonth, periodYear]);

  /*
   * Calculate the preview using the existing
   * payroll calculation functions.
   */
  const preview = useMemo(() => {
    return employees.map((emp) => {
      const employeeId =
        emp.id || String(emp._id);

      const otEntries =
        overtimeByEmployee[employeeId] || [];

      const overtimePay = otEntries.reduce(
        (sum, entry) =>
          sum +
          calculateOvertimePay(
            Number(
              emp.basicSalary ??
                emp.basic_salary ??
                0
            ),
            Number(entry.hours || 0),
            entry.otType ??
              entry.ot_type
          ),
        0
      );

      const calc = calculatePayslip({
        basicSalary: Number(
          emp.basicSalary ??
            emp.basic_salary ??
            0
        ),

        transportAllowance: Number(
          emp.transportAllowance ??
            emp.transport_allowance ??
            0
        ),

        housingAllowance: Number(
          emp.housingAllowance ??
            emp.housing_allowance ??
            0
        ),

        otherAllowance: Number(
          emp.otherAllowance ??
            emp.other_allowance ??
            0
        ),

        overtimePay,
      });

      return {
        employee: emp,
        otEntries,
        ...calc,
      };
    });
  }, [employees, overtimeByEmployee]);

  const totals = useMemo(() => {
    return preview.reduce(
      (acc, row) => ({
        gross:
          acc.gross +
          Number(
            row.grossSalary ??
              row.gross_salary ??
              0
          ),

        tax:
          acc.tax +
          Number(
            row.incomeTax ??
              row.income_tax ??
              0
          ),

        pension:
          acc.pension +
          Number(
            row.pensionEmployee ??
              row.pension_employee ??
              0
          ),

        net:
          acc.net +
          Number(
            row.netPay ??
              row.net_pay ??
              0
          ),
      }),
      {
        gross: 0,
        tax: 0,
        pension: 0,
        net: 0,
      }
    );
  }, [preview]);

  async function handleCreateRun() {
    setError('');

    if (preview.length === 0) {
      setError(
        'No active employees to run payroll for.'
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodMonth,
          periodYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to create payroll run.'
        );
      }

      router.push(
        `/dashboard/payroll/${data.run.id}`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Failed to create payroll run.'
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p
        className="font-num"
        style={{ color: '#6b6355' }}
      >
        Loading…
      </p>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Finance
          </span>

          <h1>Run payroll</h1>
        </div>
      </div>

      <div
        className="card"
        style={{ marginBottom: 20 }}
      >
        <h2 className="card-title">
          Period
        </h2>

        <div
          style={{
            display: 'flex',
            gap: 16,
          }}
        >
          <div
            className="field"
            style={{ marginBottom: 0 }}
          >
            <label>Month</label>

            <select
              value={periodMonth}
              onChange={(e) =>
                setPeriodMonth(
                  Number(e.target.value)
                )
              }
            >
              {MONTH_NAMES.map(
                (name, idx) => (
                  <option
                    key={name}
                    value={idx + 1}
                  >
                    {name}
                  </option>
                )
              )}
            </select>
          </div>

          <div
            className="field"
            style={{ marginBottom: 0 }}
          >
            <label>Year</label>

            <input
              type="number"
              value={periodYear}
              onChange={(e) =>
                setPeriodYear(
                  Number(e.target.value)
                )
              }
              style={{ width: 100 }}
            />
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{ marginBottom: 20 }}
      >
        <h2 className="card-title">
          Preview — {preview.length}{' '}
          active employees
        </h2>

        {preview.length === 0 ? (
          <div className="empty-state">
            <h3>No active employees</h3>

            <p>
              Add employees before running
              payroll.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Gross</th>
                  <th>Tax</th>
                  <th>
                    Pension (employee)
                  </th>
                  <th>Overtime</th>
                  <th>Net pay</th>
                </tr>
              </thead>

              <tbody>
                {preview.map((row) => {
                  const employeeId =
                    row.employee.id ||
                    String(
                      row.employee._id
                    );

                  const employeeName =
                    row.employee.fullName ??
                    row.employee.full_name ??
                    'Unnamed employee';

                  const gross =
                    row.grossSalary ??
                    row.gross_salary ??
                    0;

                  const tax =
                    row.incomeTax ??
                    row.income_tax ??
                    0;

                  const pension =
                    row.pensionEmployee ??
                    row.pension_employee ??
                    0;

                  const overtime =
                    row.overtimePay ?? 0;

                  const net =
                    row.netPay ??
                    row.net_pay ??
                    0;

                  return (
                    <tr
                      key={employeeId}
                    >
                      <td>
                        {employeeName}
                      </td>

                      <td className="font-num">
                        {formatETB(
                          gross
                        )}
                      </td>

                      <td className="font-num">
                        {formatETB(
                          tax
                        )}
                      </td>

                      <td className="font-num">
                        {formatETB(
                          pension
                        )}
                      </td>

                      <td className="font-num">
                        {formatETB(
                          overtime
                        )}
                      </td>

                      <td
                        className="font-num"
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {formatETB(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    Totals
                  </td>

                  <td
                    className="font-num"
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {formatETB(
                      totals.gross
                    )}
                  </td>

                  <td
                    className="font-num"
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {formatETB(
                      totals.tax
                    )}
                  </td>

                  <td
                    className="font-num"
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {formatETB(
                      totals.pension
                    )}
                  </td>

                  <td></td>

                  <td
                    className="font-num"
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {formatETB(
                      totals.net
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {error && (
        <p
          className="field-error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: 12,
        }}
      >
        <button
          className="btn btn-primary"
          onClick={handleCreateRun}
          disabled={
            saving ||
            preview.length === 0
          }
        >
          {saving
            ? 'Creating run…'
            : 'Create payroll run'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() =>
            router.push(
              '/dashboard/payroll'
            )
          }
        >
          Cancel
        </button>
      </div>
    </div>
  );
}