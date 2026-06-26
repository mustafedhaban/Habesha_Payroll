'use strict';

const taxEngine = require('./taxEngine');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function validatePeriod(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return { error: 'Month must be an integer from 1 to 12.' };
  }
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    return { error: 'Year must be a valid 4-digit year.' };
  }
  return { month: m, year: y };
}

function periodLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function calculateItemsForEmployees(employees) {
  return employees.map((emp) => {
    const calc = taxEngine.calculatePayroll({
      basicSalary: emp.basic_salary,
      transportAllowance: emp.transport_allowance,
      isPensionExempt: Boolean(emp.is_pension_exempt),
    });
    return {
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeNameAm: emp.full_name_am || null,
      position: emp.position,
      ...calc,
    };
  });
}

function sumPayrollTotals(items) {
  return items.reduce(
    (acc, it) => ({
      basicSalary: acc.basicSalary + it.basicSalary,
      transportAllowance: acc.transportAllowance + it.transportAllowance,
      grossPay: acc.grossPay + it.grossPay,
      incomeTax: acc.incomeTax + it.incomeTax,
      employeePension: acc.employeePension + it.employeePension,
      employerPension: acc.employerPension + it.employerPension,
      netPay: acc.netPay + it.netPay,
    }),
    {
      basicSalary: 0,
      transportAllowance: 0,
      grossPay: 0,
      incomeTax: 0,
      employeePension: 0,
      employerPension: 0,
      netPay: 0,
    },
  );
}

module.exports = {
  MONTH_NAMES,
  validatePeriod,
  periodLabel,
  calculateItemsForEmployees,
  sumPayrollTotals,
};
