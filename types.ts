export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INVESTMENT = 'INVESTMENT',
}

export interface FinancialConfig {
  baseSalary: number;
  nurseryFee: number;
  defaultCreditCard: number;
  pocketMoneyTarget: number;
  childAllowance: number;
  initialCash: number;
  targetCash: number;
  targetInvestmentBase: number; // 150,000
  targetInvestmentAddon: number; // 30,000 (Child allowance)
}

export interface MonthlyRecord {
  id: string; // YYYY-MM
  monthStr: string;
  // Income
  salaryIncome: number;
  sideHustleIncome: number;
  childAllowanceIncome: number;
  
  // Expenses
  nurseryExpense: number;
  creditCardExpense: number;
  pocketMoneyExpense: number;
  
  // Investment
  investmentTrust: number; // Monthly Input (Flow)
  
  // Snapshots (Manual Overrides for End-of-Month Totals)
  totalCashSnapshot?: number; // Actual Cash Balance (Stock)
  totalInvestmentSnapshot?: number; // Actual Investment Market Value (Stock)

  // Memos
  note: string;
  
  // Calculated (Computed properties or stored for history)
  calculatedCashFlow?: number; // Total Income - Total Expense - Investment
  totalAssets?: number;
}

export interface SimulationCase {
  id: string;
  name: string;
  monthlyInvest: number;
  annualRate: number;
  targetAmount: number;
}

export const DEFAULT_CONFIG: FinancialConfig = {
  baseSalary: 450000,
  nurseryFee: 24000,
  defaultCreditCard: 200000,
  pocketMoneyTarget: 50000,
  childAllowance: 30000,
  initialCash: 800000,
  targetCash: 1000000,
  targetInvestmentBase: 150000,
  targetInvestmentAddon: 30000,
};