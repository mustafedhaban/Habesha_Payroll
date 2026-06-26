'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generatePayslipPdf, payslipFilename } = require('../src/payslipPdf');

const sample = {
  company: { name: 'Adwa Trading PLC' },
  run: { period_month: 6, period_year: 2026, rate_version: '2026-Proclamation-1395' },
  item: {
    employee_name: 'Marta Alemu',
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
  periodLabel: 'June 2026',
};

test('generatePayslipPdf returns a valid PDF buffer', async () => {
  const pdf = await generatePayslipPdf({
    ...sample,
    company: { name: 'Adwa Trading PLC', tin: '0012345678' },
    item: { ...sample.item, employee_name_am: 'ማርታ አለሙ' },
  });
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 800);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('payslipFilename slugifies employee name and period', () => {
  assert.equal(
    payslipFilename(sample.run, sample.item),
    'payslip-2026-06-marta-alemu.pdf',
  );
});

test('generatePayslipPdf handles transport allowance rows', async () => {
  const withTransport = await generatePayslipPdf(sample);
  const withoutTransport = await generatePayslipPdf({
    ...sample,
    item: { ...sample.item, transport_allowance: 0, exempt_transport: 0, taxable_transport: 0 },
  });
  assert.ok(withTransport.length > withoutTransport.length);
});
