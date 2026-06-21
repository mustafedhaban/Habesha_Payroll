export type Role = 'admin' | 'viewer';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface Company {
  id: number;
  name: string;
  tin?: string | null;
}

export interface Session {
  user: User;
  company: Company;
}

export interface Employee {
  id: number;
  full_name: string;
  full_name_am: string | null;
  position: string | null;
  basic_salary: number;
  transport_allowance: number;
  is_pension_exempt: number;
  employment_status: 'active' | 'terminated';
  start_date: string | null;
}

export interface PayrollRunSummary {
  id: number;
  period_month: number;
  period_year: number;
  employee_count: number;
  total_gross: number;
  total_tax: number;
  total_net: number;
}

export interface PayrollRunItem {
  employee_id: number;
  employee_name: string;
  position: string | null;
  basic_salary: number;
  transport_allowance: number;
  exempt_transport: number;
  taxable_transport: number;
  gross_salary: number;
  income_tax: number;
  employee_pension: number;
  employer_pension: number;
  net_pay: number;
}

export interface PayrollRunDetail {
  run: PayrollRunSummary & {
    rate_version: string;
    created_at: string;
  };
  items: PayrollRunItem[];
}

// A2: CSV import
export interface ImportRowResult {
  line: number;
  valid: boolean;
  errors: string[];
  data: {
    fullName: string;
    fullNameAm: string | null;
    position: string | null;
    basicSalary: number;
    transportAllowance: number;
    isPensionExempt: number;
    startDate: string | null;
  };
}

export interface ImportPreview {
  preview: true;
  total: number;
  validCount: number;
  invalidCount: number;
  rows: ImportRowResult[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  rows: ImportRowResult[];
}

// A4: rate schedule
export interface RateSchedule {
  activeVersion: string;
  latest: { version: string; verified_date: string; notes: string | null } | null;
}

// A5: team
export interface TeamMember {
  id: number;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface PendingInvite {
  id: number;
  email: string;
  role: Role;
  created_at: string;
  expires_at: string;
}

export interface TeamData {
  members: TeamMember[];
  pending: PendingInvite[];
  currentUserId: number;
}

export interface InviteResult {
  email: string;
  role: Role;
  devInviteLink: string;
  devNote: string;
}

// A6: activity / audit log
export interface ActivityEntry {
  id: number;
  action: string;
  detail: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export interface PayrollRunResult {
  runId: number;
  month: number;
  year: number;
  items: Array<{
    employeeId: number;
    employeeName: string;
    basicSalary: number;
    transportAllowance: number;
    exemptTransport: number;
    taxableTransport: number;
    grossPay: number;
    incomeTax: number;
    employeePension: number;
    employerPension: number;
    netPay: number;
  }>;
  totals: {
    basicSalary: number;
    transportAllowance: number;
    grossPay: number;
    incomeTax: number;
    employeePension: number;
    employerPension: number;
    netPay: number;
  };
}
