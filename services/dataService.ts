import { supabase } from './supabaseClient';
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

/**
 * Supabaseから月次レコードを読み込む
 */
export async function loadRecords(): Promise<MonthlyRecord[]> {
  try {
    const { data, error } = await supabase
      .from('monthly_records')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error loading records:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // データベース形式からアプリケーション形式に変換
    return data.map(dbToApp);
  } catch (error) {
    console.error('Error loading records:', error);
    return [];
  }
}

/**
 * 新しい月次レコードを追加する
 */
export async function insertRecord(record: MonthlyRecord): Promise<MonthlyRecord | null> {
  try {
    // アプリケーション形式をデータベース形式に変換
    const dbRecord = appToDb(record);

    const { data, error } = await supabase
      .from('monthly_records')
      .insert([dbRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting record:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // データベース形式からアプリケーション形式に変換
    return dbToApp(data);
  } catch (error) {
    console.error('Error inserting record:', error);
    return null;
  }
}

/**
 * 月次レコードを削除する
 */
export async function deleteRecord(recordId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('monthly_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Error deleting record:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting record:', error);
    return false;
  }
}
