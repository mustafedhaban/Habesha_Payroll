'use strict';

const JSZip = require('jszip');
const { generatePayslipPdf, payslipFilename } = require('./payslipPdf');

/**
 * @param {{ company: object, run: object, items: object[], periodLabel: string }} params
 * @returns {Promise<Buffer>}
 */
async function buildPayslipZip({ company, run, items, periodLabel }) {
  const zip = new JSZip();

  for (const item of items) {
    const pdf = await generatePayslipPdf({ company, run, item, periodLabel });
    zip.file(payslipFilename(run, item), pdf);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function payslipZipFilename(run) {
  return `payslips-${run.period_year}-${String(run.period_month).padStart(2, '0')}.zip`;
}

module.exports = { buildPayslipZip, payslipZipFilename };
