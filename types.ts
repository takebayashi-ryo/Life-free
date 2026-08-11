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

export interface ChildProfile {
  id: string;
  name: string;
  birthYear: number;
}

export interface UserProfile {
  selfBirthYear?: number;
  children: ChildProfile[];
}

export interface LifePlanEvent {
  id: string;
  label: string;          // 例: "保育料", "昇進"
  monthlyAmount: number;  // 月額、収入なら正、支出なら負（投資余力への影響）
  category: 'income' | 'expense';
  source: 'ai' | 'user';
}

export interface LifePlanYear {
  yearOffset: number;     // 0 = 今年, 1 = 来年
  monthlyInvest: number;  // この年の月額積立
  memo: string;
  events: LifePlanEvent[];
  aiGeneratedAt?: number; // AI提案を取り込んだ時刻 (unix ms)
}

export interface LifePlan {
  years: LifePlanYear[];  // sorted by yearOffset
}

/** note記事の冒頭に毎回入る固定プロフィール */
export interface NoteProfile {
  penName: string;        // 例: おりょう
  intro: string;          // 例: このブログでは...
  background: string;     // 例: もともとは町工場で働いていて...
  goal: string;           // 例: お金の不安を減らして人生に余白を作る
  sideJobName: string;    // 例: AI企業のカスタマーサクセス（CS）
}

export const DEFAULT_NOTE_PROFILE: NoteProfile = {
  penName: '',
  intro: '・家計管理 ・資産形成 ・副業 ・AI活用',
  background: '',
  goal: 'お金の不安を減らして人生に余白を作る',
  sideJobName: '',
};

export const DEFAULT_CONFIG: FinancialConfig = {
  baseSalary: 450000,
  nurseryFee: 24000,
  defaultCreditCard: 200000,
  pocketMoneyTarget: 50000,
  childAllowance: 30000,
  initialCash: 0,
  targetCash: 1000000,
  targetInvestmentBase: 150000,
  targetInvestmentAddon: 30000,
};

export const DEFAULT_PROFILE: UserProfile = {
  selfBirthYear: undefined,
  children: [],
};