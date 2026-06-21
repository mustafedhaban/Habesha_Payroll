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

test('ETB 15,000 gross matches the published worked example (3,200 PAYE)', () => {
  // Public reference calculation: ETB 15,000/month -> 21.3% effective PAYE,
  // 7% pension, net pay ETB 10,750.
  const tax = calculateIncomeTax(15000);
  assert.equal(tax, 3200);

  const pension = calculatePension(15000, false);
  assert.equal(pension.employee, 1050); // 7% of capped base (15,000)
  assert.equal(pension.employer, 1650); // 11% of capped base (15,000)

  const result = calculatePayroll({ grossSalary: 15000 });
  assert.equal(result.netPay, 10750);
});

test('pension contribution is capped at ETB 15,000 base even for higher earners', () => {
  const pension = calculatePension(40000, false);
  assert.equal(pension.employee, 1050); // still 7% of 15,000, not 40,000
  assert.equal(pension.employer, 1650);
});

test('foreign nationals can be flagged pension-exempt', () => {
  const result = calculatePayroll({ grossSalary: 15000, isPensionExempt: true });
  assert.equal(result.employeePension, 0);
  assert.equal(result.employerPension, 0);
  // Income tax still applies regardless of pension exemption
  assert.equal(result.incomeTax, 3200);
  assert.equal(result.netPay, 11800); // 15000 - 3200 - 0
});

test('top bracket applies correctly to a high earner', () => {
  // ETB 25,000 gross: tax = 25000*0.35 - 2050 = 6700
  const result = calculatePayroll({ grossSalary: 25000 });
  assert.equal(result.incomeTax, 6700);
  assert.equal(result.employeePension, 1050);
  assert.equal(result.netPay, 25000 - 6700 - 1050);
});
