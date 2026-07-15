// ============================================================================
// Ethiopian payroll calculations — ERCA income tax, pension contributions,
// and overtime multipliers. Centralized here so every page (payroll run,
// payslip, reports) uses the exact same numbers.
//
// Source: Ethiopian Revenue and Customs Authority (ERCA) employment income
// tax schedule (Proclamation No. 979/2016) and the Public/Private
// Organizations' Employees Pension Proclamation (7% employee / 11% employer).
// Verify current brackets against the latest ERCA directive before relying
// on this for real filings — tax law changes over time.
// ============================================================================

export const ERCA_BRACKETS = [
  { min: 0, max: 2000, rate: 0, deduction: 0 },
  { min: 2000, max: 4000, rate: 0.15, deduction: 300 },
  { min: 4000, max: 7000, rate: 0.2, deduction: 500 },
  { min: 7000, max: 10000, rate: 0.25, deduction: 850 },
  { min: 10000, max: 14000, rate: 0.3, deduction: 1350 },
  { min: 14000, max: Infinity, rate: 0.35, deduction: 2050 },
];

export const PENSION_EMPLOYEE_RATE = 0.07;
export const PENSION_EMPLOYER_RATE = 0.11;

export const OVERTIME_MULTIPLIERS = {
  weekday: 1.5,
  rest_day: 2.0,
  public_holiday: 2.5,
  night: 1.25,
};

/**
 * calculateIncomeTax — applies the ERCA progressive schedule to a taxable
 * income amount and returns the tax due, using the standard
 * (rate * income) - deduction formula for the bracket the income falls in.
 */
export function calculateIncomeTax(taxableIncome) {
  const income = Math.max(0, Number(taxableIncome) || 0);
  const bracket = ERCA_BRACKETS.find((b) => income > b.min && income <= b.max) || ERCA_BRACKETS[0];
  const tax = income * bracket.rate - bracket.deduction;
  return Math.max(0, Math.round(tax * 100) / 100);
}

/**
 * calculatePension — returns { employee, employer } contributions based on
 * basic salary only (allowances are typically excluded from the pension
 * base under Ethiopian pension law).
 */
export function calculatePension(basicSalary) {
  const basic = Math.max(0, Number(basicSalary) || 0);
  return {
    employee: Math.round(basic * PENSION_EMPLOYEE_RATE * 100) / 100,
    employer: Math.round(basic * PENSION_EMPLOYER_RATE * 100) / 100,
  };
}

/**
 * calculateOvertimePay — hourly rate derived from basic salary assuming a
 * 26-day / 8-hour working month (standard Ethiopian labor law assumption),
 * multiplied by the hours worked and the applicable overtime multiplier.
 */
export function calculateOvertimePay(basicSalary, hours, otType = 'weekday') {
  const basic = Math.max(0, Number(basicSalary) || 0);
  const hoursWorked = Math.max(0, Number(hours) || 0);
  const hourlyRate = basic / (26 * 8);
  const multiplier = OVERTIME_MULTIPLIERS[otType] ?? 1.5;
  return Math.round(hourlyRate * hoursWorked * multiplier * 100) / 100;
}

/**
 * calculatePayslip — full breakdown for one employee for one payroll run.
 * Returns every field the payslips table expects.
 */
export function calculatePayslip({
  basicSalary = 0,
  transportAllowance = 0,
  housingAllowance = 0,
  otherAllowance = 0,
  overtimePay = 0,
  otherDeductions = 0,
}) {
  const basic = Number(basicSalary) || 0;
  const transport = Number(transportAllowance) || 0;
  const housing = Number(housingAllowance) || 0;
  const other = Number(otherAllowance) || 0;
  const overtime = Number(overtimePay) || 0;
  const deductions = Number(otherDeductions) || 0;

  const grossSalary = basic + transport + housing + other + overtime;

  // Transport allowance up to 2,200 ETB/month is non-taxable per ERCA rules.
  const nonTaxableTransport = Math.min(transport, 2200);
  const taxableIncome = Math.max(0, grossSalary - nonTaxableTransport);

  const incomeTax = calculateIncomeTax(taxableIncome);
  const pension = calculatePension(basic);

  const netPay =
    grossSalary - incomeTax - pension.employee - deductions;

  return {
    basic_salary: round2(basic),
    transport_allowance: round2(transport),
    housing_allowance: round2(housing),
    other_allowance: round2(other),
    overtime_pay: round2(overtime),
    gross_salary: round2(grossSalary),
    taxable_income: round2(taxableIncome),
    income_tax: round2(incomeTax),
    pension_employee: round2(pension.employee),
    pension_employer: round2(pension.employer),
    other_deductions: round2(deductions),
    net_pay: round2(netPay),
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * formatETB — consistent birr currency formatting across the whole app.
 */
export function formatETB(amount) {
  const num = Number(amount) || 0;
  return (
    'ETB ' +
    num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
