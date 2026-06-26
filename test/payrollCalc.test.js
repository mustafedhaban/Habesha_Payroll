'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePeriod,
  calculateItemsForEmployees,
  sumPayrollTotals,
} = require('../src/payrollCalc');

test('validatePeriod rejects invalid month', () => {
  assert.equal(validatePeriod(13, 2026).error, 'Month must be an integer from 1 to 12.');
});

test('calculateItemsForEmployees includes Amharic names from employee rows', () => {
  const items = calculateItemsForEmployees([
    {
      id: 1,
      full_name: 'Marta Alemu',
      full_name_am: 'ማርታ አለሙ',
      position: 'Accountant',
      basic_salary: 9000,
      transport_allowance: 0,
      is_pension_exempt: 0,
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].employeeNameAm, 'ማርታ አለሙ');
  assert.ok(items[0].netPay > 0);
});

test('sumPayrollTotals aggregates preview rows', () => {
  const items = calculateItemsForEmployees([
    {
      id: 1,
      full_name: 'A',
      full_name_am: null,
      position: null,
      basic_salary: 5000,
      transport_allowance: 0,
      is_pension_exempt: 0,
    },
    {
      id: 2,
      full_name: 'B',
      full_name_am: null,
      position: null,
      basic_salary: 8000,
      transport_allowance: 0,
      is_pension_exempt: 0,
    },
  ]);
  const totals = sumPayrollTotals(items);
  assert.equal(totals.grossPay, items[0].grossPay + items[1].grossPay);
});
