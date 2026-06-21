'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateIncomeTax,
  calculatePension,
  calculatePayroll,
} = require('../src/taxEngine');

test('zero/negative salary produces zero tax and zero pension', () => {
  assert.equal(calculateIncomeTax(0), 0);
  assert.equal(calculateIncomeTax(-100), 0);
  assert.deepEqual(calculatePension(0), { employee: 0, employer: 0 });
});

test('salary within tax-free threshold (≤ 2,000) owes no income tax', () => {
  assert.equal(calculateIncomeTax(2000), 0);
  assert.equal(calculateIncomeTax(1500), 0);
});

test('bracket boundaries match published cumulative tax figures', () => {
  // Cumulative tax at each bracket ceiling, per Proclamation No. 1395/2026
  assert.equal(calculateIncomeTax(2000), 0);
  assert.equal(calculateIncomeTax(4000), 300);
  assert.equal(calculateIncomeTax(7000), 900);
  assert.equal(calculateIncomeTax(10000), 1650);
  assert.equal(calculateIncomeTax(14000), 2850);
});

test('ETB 15,000 basic salary matches the published worked example (3,200 PAYE)', () => {
  // Public reference calculation: ETB 15,000/month -> 21.3% effective PAYE,
  // 7% pension, net pay ETB 10,750.
  const tax = calculateIncomeTax(15000);
  assert.equal(tax, 3200);

  const pension = calculatePension(15000, false);
  assert.equal(pension.employee, 1050); // 7% of capped base (15,000)
  assert.equal(pension.employer, 1650); // 11% of capped base (15,000)

  const result = calculatePayroll({ basicSalary: 15000 });
  assert.equal(result.netPay, 10750);
});

test('legacy grossSalary input (no allowance) is identical to basicSalary input', () => {
  // Regression guard: existing data passes `grossSalary`; with zero transport
  // allowance the engine must produce exactly the pre-A1 output.
  const legacy = calculatePayroll({ grossSalary: 15000 });
  const current = calculatePayroll({ basicSalary: 15000, transportAllowance: 0 });
  assert.deepEqual(legacy, current);
  assert.equal(legacy.incomeTax, 3200);
  assert.equal(legacy.employeePension, 1050);
  assert.equal(legacy.netPay, 10750);
  assert.equal(legacy.grossPay, 15000);
  assert.equal(legacy.taxableIncome, 15000);
});

test('pension contribution is capped at ETB 15,000 base even for higher earners', () => {
  const pension = calculatePension(40000, false);
  assert.equal(pension.employee, 1050); // still 7% of 15,000, not 40,000
  assert.equal(pension.employer, 1650);
});

test('foreign nationals can be flagged pension-exempt', () => {
  const result = calculatePayroll({ basicSalary: 15000, isPensionExempt: true });
  assert.equal(result.employeePension, 0);
  assert.equal(result.employerPension, 0);
  // Income tax still applies regardless of pension exemption
  assert.equal(result.incomeTax, 3200);
  assert.equal(result.netPay, 11800); // 15000 - 3200 - 0
});

test('top bracket applies correctly to a high earner', () => {
  // ETB 25,000 basic: tax = 25000*0.35 - 2050 = 6700
  const result = calculatePayroll({ basicSalary: 25000 });
  assert.equal(result.incomeTax, 6700);
  assert.equal(result.employeePension, 1050);
  assert.equal(result.netPay, 25000 - 6700 - 1050);
});

// --- A1: Transport allowance handling -------------------------------------
// Rule (Ministry of Revenue / ex-ERCA directive): transport allowance is
// non-taxable up to the LOWER of ETB 2,200/month and 25% of basic salary.
// Any excess is taxable income. Pension is computed on basic salary only.

test('transport allowance under both caps is fully exempt', () => {
  // basic 10,000 + transport 1,000. 25% of basic = 2,500; 2,200 cap; both
  // above the 1,000 allowance, so the whole allowance is exempt.
  const r = calculatePayroll({ basicSalary: 10000, transportAllowance: 1000 });
  assert.equal(r.exemptTransport, 1000);
  assert.equal(r.taxableTransport, 0);
  assert.equal(r.taxableIncome, 10000); // basic only
  assert.equal(r.incomeTax, 1650); // 10000*0.25 - 850
  assert.equal(r.employeePension, 700); // 7% of 10,000 (basic only)
  assert.equal(r.employerPension, 1100); // 11% of 10,000
  assert.equal(r.grossPay, 11000); // basic + full allowance is still paid out
  assert.equal(r.netPay, 8650); // 11000 - 1650 - 700
});

test('transport allowance above ETB 2,200 — the flat cap binds', () => {
  // basic 20,000 + transport 3,000. 25% of basic = 5,000 (not binding);
  // flat cap 2,200 binds; 800 of the allowance becomes taxable.
  const r = calculatePayroll({ basicSalary: 20000, transportAllowance: 3000 });
  assert.equal(r.exemptTransport, 2200);
  assert.equal(r.taxableTransport, 800);
  assert.equal(r.taxableIncome, 20800); // 20000 + 800
  assert.equal(r.incomeTax, 5230); // 20800*0.35 - 2050
  assert.equal(r.employeePension, 1050); // capped base 15,000
  assert.equal(r.employerPension, 1650);
  assert.equal(r.grossPay, 23000);
  assert.equal(r.netPay, 16720); // 23000 - 5230 - 1050
});

test('transport allowance where 25%-of-basic is the binding cap', () => {
  // Low-salary employee with generous allowance: basic 4,000 + transport 1,500.
  // 25% of basic = 1,000 (binds, below the 2,200 flat cap); 500 taxable.
  const r = calculatePayroll({ basicSalary: 4000, transportAllowance: 1500 });
  assert.equal(r.exemptTransport, 1000);
  assert.equal(r.taxableTransport, 500);
  assert.equal(r.taxableIncome, 4500); // 4000 + 500
  assert.equal(r.incomeTax, 400); // 4500*0.20 - 500
  assert.equal(r.employeePension, 280); // 7% of 4,000
  assert.equal(r.employerPension, 440); // 11% of 4,000
  assert.equal(r.grossPay, 5500);
  assert.equal(r.netPay, 4820); // 5500 - 400 - 280
});
