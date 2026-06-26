'use strict';

const path = require('node:path');
const fs = require('node:fs');
const PDFDocument = require('pdfkit');

const TEAL = '#0d9488';
const INK = '#131820';
const MUTED = '#64748b';
const ALERT = '#c4453a';
const BORDER = '#e2e8f0';

const ETHIOPIC_FONT = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansEthiopic-Regular.ttf');
const HAS_ETHIOPIC_FONT = fs.existsSync(ETHIOPIC_FONT);

function fmtMoney(n) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function companySubtitle(company) {
  const parts = [];
  if (company.tin) parts.push(`TIN ${company.tin}`);
  return parts.join(' · ');
}

function row(doc, label, amount, opts = {}) {
  const { indent = 0, muted = false, bold = false, deduction = false } = opts;
  const y = doc.y;
  const left = doc.page.margins.left + indent;

  doc
    .font(bold ? 'Helvetica-Bold' : muted ? 'Helvetica' : 'Helvetica')
    .fontSize(muted ? 10 : 11)
    .fillColor(muted ? MUTED : INK)
    .text(label, left, y, { width: 320 });

  const amountText =
    deduction && amount !== '' ? `− ETB ${fmtMoney(amount)}` : `ETB ${fmtMoney(amount)}`;

  doc
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(bold ? 12 : 11)
    .fillColor(deduction ? ALERT : INK)
    .text(amountText, doc.page.margins.left, y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
    });

  doc.moveDown(0.35);
  const lineY = doc.y;
  doc
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .stroke();
  doc.moveDown(0.45);
}

function drawStamp(doc) {
  const cx = doc.page.width - doc.page.margins.right - 58;
  const cy = doc.page.margins.top + 18;
  doc
    .save()
    .lineWidth(2)
    .strokeColor('#c2772e')
    .circle(cx, cy, 44)
    .stroke()
    .rotate(-12, { origin: [cx, cy] })
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#c2772e')
    .text('PROCLAMATION', cx - 38, cy - 16, { width: 76, align: 'center' })
    .text('1395/2026', cx - 38, cy - 5, { width: 76, align: 'center' })
    .text('COMPLIANT', cx - 38, cy + 6, { width: 76, align: 'center' })
    .restore();
}

function writeEmployeeHeader(doc, item) {
  const employeeLine = item.position
    ? `${item.employee_name} · ${item.position}`
    : item.employee_name;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(employeeLine);

  const amharic = item.employee_name_am;
  if (amharic) {
    doc.moveDown(0.15);
    if (HAS_ETHIOPIC_FONT) {
      doc.font('Ethiopic').fontSize(11).fillColor(MUTED).text(amharic);
    } else {
      doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(amharic);
    }
  }
  doc.moveDown(0.65);
}

/**
 * @param {{ company: { name: string, tin?: string|null }, run: { rate_version: string }, item: object, periodLabel: string }} data
 * @returns {Promise<Buffer>}
 */
function generatePayslipPdf({ company, run, item, periodLabel }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (HAS_ETHIOPIC_FONT) {
      doc.registerFont('Ethiopic', ETHIOPIC_FONT);
    }

    drawStamp(doc);

    doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text(company.name);

    const subtitle = companySubtitle(company);
    doc
      .moveDown(0.15)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(MUTED)
      .text(subtitle || ' ', { lineGap: 1 });

    doc
      .moveDown(0.15)
      .fontSize(11)
      .text(`Payslip — ${periodLabel}`);

    doc.moveDown(0.8);
    doc
      .strokeColor(INK)
      .lineWidth(1.5)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.9);

    writeEmployeeHeader(doc, item);

    row(doc, 'Basic Salary', item.basic_salary);

    if (item.transport_allowance > 0) {
      row(doc, 'Transport Allowance', item.transport_allowance);
      row(doc, '· Non-taxable portion', item.exempt_transport, { indent: 14, muted: true });
      row(doc, '· Taxable portion', item.taxable_transport, { indent: 14, muted: true });
    }

    row(doc, 'Gross Pay', item.gross_salary, { bold: true });
    row(doc, 'Income Tax (PAYE)', item.income_tax, { deduction: true });
    row(doc, 'Employee Pension (7%)', item.employee_pension, { deduction: true });

    doc.moveDown(0.2);
    doc
      .strokeColor(INK)
      .lineWidth(1.5)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    row(doc, 'Net Pay', item.net_pay, { bold: true });

    doc.moveDown(1.2);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Employer pension contribution (11%, not deducted from pay): ETB ${fmtMoney(item.employer_pension)}`,
        { lineGap: 2 },
      )
      .text(
        `Calculated under PAYE rate schedule ${run.rate_version}. Generated by Habesha Payroll — not a substitute for ERCA filing confirmation.`,
        { lineGap: 2 },
      );

    doc
      .fontSize(8)
      .fillColor(TEAL)
      .text('habesha payroll', doc.page.margins.left, doc.page.height - 40, {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });

    doc.end();
  });
}

function payslipFilename(run, item) {
  const period = `${run.period_year}-${String(run.period_month).padStart(2, '0')}`;
  const slug = String(item.employee_name || 'employee')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `payslip-${period}-${slug || 'employee'}.pdf`;
}

module.exports = { generatePayslipPdf, payslipFilename, fmtMoney, companySubtitle };
