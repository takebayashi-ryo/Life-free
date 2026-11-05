import { apiFetch } from './apiClient';
import { MonthlyRecord } from '../types';

// データベースのスネークケース型
interface MonthlyRecordDB {
  id: string;
  month_str: string;
  salary_income: number;
  side_hustle_income: number;
  child_allowance_income: number;
  nursery_expense: number;
  credit_card_expense: number;
  pocket_money_expense: number;
  investment_trust: number;
  total_cash_snapshot?: number | null;
  total_investment_snapshot?: number | null;
  note: string;
  calculated_cash_flow?: number | null;
  total_assets?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * データベース形式（スネークケース）をアプリケーション形式（キャメルケース）に変換
 */
function dbToApp(dbRecord: MonthlyRecordDB): MonthlyRecord {
  return {
    id: dbRecord.id,
    monthStr: dbRecord.month_str,
    salaryIncome: dbRecord.salary_income,
    sideHustleIncome: dbRecord.side_hustle_income,
    childAllowanceIncome: dbRecord.child_allowance_income,
    nurseryExpense: dbRecord.nursery_expense,
    creditCardExpense: dbRecord.credit_card_expense,
    pocketMoneyExpense: dbRecord.pocket_money_expense,
    investmentTrust: dbRecord.investment_trust,
    totalCashSnapshot: dbRecord.total_cash_snapshot ?? undefined,
    totalInvestmentSnapshot: dbRecord.total_investment_snapshot ?? undefined,
    note: dbRecord.note,
    calculatedCashFlow: dbRecord.calculated_cash_flow ?? undefined,
    totalAssets: dbRecord.total_assets ?? undefined,
  };
}

/**
 * アプリケーション形式（キャメルケース）をデータベース形式（スネークケース）に変換
 */
function appToDb(appRecord: MonthlyRecord): MonthlyRecordDB {
  return {
    id: appRecord.id,
    month_str: appRecord.monthStr,
    salary_income: appRecord.salaryIncome,
    side_hustle_income: appRecord.sideHustleIncome,
    child_allowance_income: appRecord.childAllowanceIncome,
    nursery_expense: appRecord.nurseryExpense,
    credit_card_expense: appRecord.creditCardExpense,
    pocket_money_expense: appRecord.pocketMoneyExpense,
    investment_trust: appRecord.investmentTrust,
    total_cash_snapshot: appRecord.totalCashSnapshot ?? null,
    total_investment_snapshot: appRecord.totalInvestmentSnapshot ?? null,
    note: appRecord.note,
    calculated_cash_flow: appRecord.calculatedCashFlow ?? null,
    total_assets: appRecord.totalAssets ?? null,
  };
}

export async function loadRecords(): Promise<MonthlyRecord[]> {
  try {
    const rows = await apiFetch<MonthlyRecordDB[]>('/api/records');
    return rows.map(dbToApp);
  } catch (error) {
    console.error('Error loading records:', error);
    return [];
  }
}

/**
 * 月次レコードを保存する（存在すれば更新、なければ追加）
 */
export async function upsertRecord(record: MonthlyRecord): Promise<{ data: MonthlyRecord | null; error: string | null }> {
  try {
    const row = await apiFetch<MonthlyRecordDB>(`/api/records/${encodeURIComponent(record.id)}`, {
      method: 'PUT',
      body: JSON.stringify(appToDb(record)),
    });
    return { data: dbToApp(row), error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return { data: null, error: `保存エラー: ${errorMessage}` };
  }
}

export async function deleteRecord(recordId: string): Promise<boolean> {
  try {
    await apiFetch(`/api/records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error deleting record:', error);
    return false;
  }
}
