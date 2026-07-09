/**
 * Ethiopian Income Tax Calculator
 * Based on Proclamation 1395/2025 (New Tax Brackets)
 * Pension: 7% employee contribution (Proclamation 1268/2022)
 */

// ── Tax Brackets (Proclamation 1395/2025) ──────────────────────────
const TAX_BRACKETS = [
  { min: 0,     max: 2000,  rate: 0.00 },
  { min: 2001,  max: 4000,  rate: 0.15 },
  { min: 4001,  max: 7000,  rate: 0.20 },
  { min: 7001,  max: 10000, rate: 0.25 },
  { min: 10001, max: 14000, rate: 0.30 },
  { min: 14001, max: Infinity, rate: 0.35 },
] as const;

const PENSION_RATE = 0.07; // 7% employee contribution

/**
 * Calculate Ethiopian progressive income tax on monthly taxable income.
 * Uses marginal/progressive calculation (each bracket taxes only the income within that range).
 */
export function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break;

    const bracketWidth = bracket.max === Infinity
      ? remaining
      : bracket.max - bracket.min + 1;

    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return Math.round(tax * 100) / 100; // round to 2 decimals
}

/**
 * Calculate pension (employee contribution): 7% of earned salary.
 */
export function calculatePension(earnedSalary: number): number {
  return Math.round(earnedSalary * PENSION_RATE * 100) / 100;
}

export interface PayrollBreakdown {
  grossSalary: number;
  totalDays: number;
  workedDays: number;
  absentDays: number;
  dailyRate: number;
  earnedSalary: number;
  pension: number;
  taxableIncome: number;
  incomeTax: number;
  netSalary: number;
}

/**
 * Full payroll calculation for one employee for one month.
 *
 * Logic:
 *   Daily Rate      = grossSalary / 30
 *   Earned Salary   = dailyRate × workedDays
 *   Pension         = earnedSalary × 7%
 *   Taxable Income  = earnedSalary − pension
 *   Income Tax      = progressive brackets on taxableIncome
 *   Net Salary      = earnedSalary − pension − incomeTax
 */
export function calculatePayroll(
  grossSalary: number,
  workedDays: number,
  totalDays = 30,
): PayrollBreakdown {
  const dailyRate = grossSalary / totalDays;
  const absentDays = Math.max(0, totalDays - workedDays);
  const earnedSalary = Math.round(dailyRate * workedDays * 100) / 100;
  const pension = calculatePension(earnedSalary);
  const taxableIncome = Math.max(0, Math.round((earnedSalary - pension) * 100) / 100);
  const incomeTax = calculateIncomeTax(taxableIncome);
  const netSalary = Math.round((earnedSalary - pension - incomeTax) * 100) / 100;

  return {
    grossSalary,
    totalDays,
    workedDays,
    absentDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    earnedSalary,
    pension,
    taxableIncome,
    incomeTax,
    netSalary,
  };
}
