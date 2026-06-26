'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildPayslipZip, payslipZipFilename } = require('../src/payslipZip');

const sample = {
  company: { name: 'Adwa Trading PLC', tin: '0012345678' },
  run: { period_month: 6, period_year: 2026, rate_version: '2026-Proclamation-1395' },
  items: [
    {
      employee_id: 1,
      employee_name: 'Marta Alemu',
      employee_name_am: 'ማርታ አለሙ',
      position: 'Accountant',
      basic_salary: 9000,
      transport_allowance: 2200,
      exempt_transport: 2200,
      taxable_transport: 0,
      gross_salary: 11200,
      income_tax: 1200,
      employee_pension: 630,
      employer_pension: 990,
      net_pay: 9370,
    },
    {
      employee_id: 2,
      employee_name: 'Abebe Tadesse',
      employee_name_am: 'አበበ ታደሰ',
      position: 'Clerk',
      basic_salary: 3500,
      transport_allowance: 600,
      exempt_transport: 600,
      taxable_transport: 0,
      gross_salary: 4100,
      income_tax: 200,
      employee_pension: 245,
      employer_pension: 385,
      net_pay: 3655,
    },
  ],
  periodLabel: 'June 2026',
};

test('buildPayslipZip returns a ZIP buffer with local file header', async () => {
  const zip = await buildPayslipZip(sample);
  assert.ok(Buffer.isBuffer(zip));
  assert.ok(zip.length > 2000);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
});

test('payslipZipFilename uses payroll period', () => {
  assert.equal(payslipZipFilename(sample.run), 'payslips-2026-06.zip');
});
