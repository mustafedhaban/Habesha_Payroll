/**
 * Ethiopian Payroll Tax Engine
 * ----------------------------
 * Implements monthly Pay-As-You-Earn (PAYE) income tax and pension
 * contribution calculations under:
 *   - Income Tax (Amendment) Proclamation No. 1395/2025/2026
 *     (tax-free threshold raised to ETB 2,000/month, 6 brackets, 0–35%)
 *   - Private Organization Employees' Pension Proclamation No. 1268/2022
 *     (7% employee / 11% employer, base capped at ETB 15,000/month)
 *
 * IMPORTANT: Tax law changes. This module isolates all rate/bracket
 * constants in one place so they can be updated the moment ERCA or
 * Parliament issues a new directive — that responsiveness is the
 * entire value proposition of this product. Update RATE_VERSION
 * whenever the constants below change, and keep the previous version's
 * brackets in case historical payroll runs need to be recalculated
 * with the rules that were in effect at the time.
 */

'use strict';

const RATE_VERSION = '2026-Proclamation-1395';

// Pension contribution rates (Private Organization Employees' Pension
// Proclamation No. 1268/2022). Foreign nationals with no Ethiopian
// origin are exempt from mandatory pension contribution.
const PENSION_RATE_EMPLOYEE = 0.07;
const PENSION_RATE_EMPLOYER = 0.11;
const PENSION_BASE_CAP = 15000; // ETB — contribution is computed on min(gross, cap)

/**
 * Monthly PAYE brackets, expressed in the standard Ethiopian payroll
 * shorthand: tax = grossSalary * rate - deduction.
 * The "deduction" constant is what makes the marginal/progressive
 * calculation collapse into a single flat-rate-minus-offset formula,
 * and matches the figures published under Proclamation No. 1395/2026.
 *
 *   Bracket (ETB/month)     Rate    Deduction
 *   0      – 2,000          0%      0
 *   2,000  – 4,000          15%     300
 *   4,000  – 7,000          20%     500
 *   7,000  – 10,000         25%     850
 *   10,000 – 14,000         30%     1,350
 *   14,000 and above        35%     2,050
 */
const PAYE_BRACKETS = [
  { upTo: 2000, rate: 0.00, deduction: 0 },
  { upTo: 4000, rate: 0.15, deduction: 300 },
  { upTo: 7000, rate: 0.20, deduction: 500 },
  { upTo: 10000, rate: 0.25, deduction: 850 },
  { upTo: 14000, rate: 0.30, deduction: 1350 },
  { upTo: Infinity, rate: 0.35, deduction: 2050 },
];

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate monthly PAYE income tax on gross salary.
 * @param {number} grossSalary - monthly gross salary in ETB
 * @returns {number} income tax in ETB, rounded to 2 decimals
 */
function calculateIncomeTax(grossSalary) {
  if (!Number.isFinite(grossSalary) || grossSalary <= 0) return 0;
  const bracket = PAYE_BRACKETS.find((b) => grossSalary <= b.upTo);
  const tax = grossSalary * bracket.rate - bracket.deduction;
  return Math.max(0, round2(tax));
}

/**
 * Calculate monthly pension contributions.
 * @param {number} grossSalary - monthly gross salary in ETB
 * @param {boolean} isPensionExempt - true for foreign nationals with
 *   no Ethiopian origin, who are not required to contribute
 * @returns {{employee: number, employer: number}}
 */
function calculatePension(grossSalary, isPensionExempt = false) {
  if (isPensionExempt || !Number.isFinite(grossSalary) || grossSalary <= 0) {
    return { employee: 0, employer: 0 };
  }
  const base = Math.min(grossSalary, PENSION_BASE_CAP);
  return {
    employee: round2(base * PENSION_RATE_EMPLOYEE),
    employer: round2(base * PENSION_RATE_EMPLOYER),
  };
}

/**
 * Full monthly payroll calculation for one employee.
 * @param {object} employee
 * @param {number} employee.grossSalary
 * @param {boolean} [employee.isPensionExempt]
 * @param {number} [employee.allowanceNonTaxable] - e.g. transport allowance
 *   up to the statutory non-taxable limit. Left at 0 for MVP; gross-only.
 */
function calculatePayroll(employee) {
  const gross = Number(employee.grossSalary) || 0;
  const incomeTax = calculateIncomeTax(gross);
  const pension = calculatePension(gross, Boolean(employee.isPensionExempt));
  const netPay = round2(gross - incomeTax - pension.employee);

  return {
    rateVersion: RATE_VERSION,
    grossSalary: round2(gross),
    incomeTax,
    employeePension: pension.employee,
    employerPension: pension.employer,
    totalEmployerCost: round2(gross + pension.employer),
    netPay,
  };
}

module.exports = {
  RATE_VERSION,
  PENSION_RATE_EMPLOYEE,
  PENSION_RATE_EMPLOYER,
  PENSION_BASE_CAP,
  PAYE_BRACKETS,
  calculateIncomeTax,
  calculatePension,
  calculatePayroll,
};
