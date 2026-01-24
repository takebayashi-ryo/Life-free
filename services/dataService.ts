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
    // キャッシュを無効化するために、タイムスタンプを追加
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
export async function insertRecord(record: MonthlyRecord): Promise<{ data: MonthlyRecord | null; error: string | null }> {
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
      return { data: null, error: error.message || 'レコードの追加に失敗しました' };
    }

    if (!data) {
      return { data: null, error: 'データが返されませんでした' };
    }

    // データベース形式からアプリケーション形式に変換
    return { data: dbToApp(data), error: null };
  } catch (error) {
    console.error('Error inserting record:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return { data: null, error: errorMessage };
  }
}

/**
 * 既存の月次レコードを更新する
 */
export async function updateRecord(record: MonthlyRecord): Promise<{ data: MonthlyRecord | null; error: string | null }> {
  try {
    // アプリケーション形式をデータベース形式に変換
    const dbRecord = appToDb(record);

    // UPDATEを実行（idは更新しない）
    const updateData: Partial<MonthlyRecordDB> = {
      month_str: dbRecord.month_str,
      salary_income: dbRecord.salary_income,
      side_hustle_income: dbRecord.side_hustle_income,
      child_allowance_income: dbRecord.child_allowance_income,
      nursery_expense: dbRecord.nursery_expense,
      credit_card_expense: dbRecord.credit_card_expense,
      pocket_money_expense: dbRecord.pocket_money_expense,
      investment_trust: dbRecord.investment_trust,
      total_cash_snapshot: dbRecord.total_cash_snapshot,
      total_investment_snapshot: dbRecord.total_investment_snapshot,
      note: dbRecord.note,
      calculated_cash_flow: dbRecord.calculated_cash_flow,
      total_assets: dbRecord.total_assets,
      updated_at: new Date().toISOString()
    };

    // UPDATEを実行
    const { data, error, count } = await supabase
      .from('monthly_records')
      .update(updateData)
      .eq('id', record.id)
      .select();

    if (error) {
      console.error('UPDATE error:', error);
      return { data: null, error: `更新エラー: ${error.message} (code: ${error.code})` };
    }

    // 更新されたレコードがない場合
    if (!data || data.length === 0) {
      // countを確認（Supabaseの一部のバージョンではcountが利用可能）
      if (count !== undefined && count === 0) {
        return { data: null, error: `ID「${record.id}」のレコードが見つかりませんでした（更新対象0件）` };
      }
      return { data: null, error: `ID「${record.id}」のレコードが見つかりませんでした` };
    }

    // データベース形式からアプリケーション形式に変換（最初の1件を取得）
    const updatedRecord = dbToApp(data[0]);
    console.log('UPDATE成功:', updatedRecord.id);
    return { data: updatedRecord, error: null };
  } catch (error) {
    console.error('UPDATE exception:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return { data: null, error: `更新例外: ${errorMessage}` };
  }
}

/**
 * 月次レコードを保存する（UPSERT: 存在すればUPDATE、存在しなければINSERT）
 */
export async function upsertRecord(record: MonthlyRecord): Promise<{ data: MonthlyRecord | null; error: string | null }> {
  try {
    // まず、レコードが存在するか確認
    const { data: existingData, error: selectError } = await supabase
      .from('monthly_records')
      .select('id')
      .eq('id', record.id)
      .maybeSingle();

    // 存在確認でエラーが発生した場合（PGRST116以外）
    if (selectError && selectError.code !== 'PGRST116') {
      return { data: null, error: `存在確認エラー: ${selectError.message} (code: ${selectError.code})` };
    }

    let result: { data: MonthlyRecord | null; error: string | null };

    // レコードが存在する場合はUPDATE
    if (existingData && existingData.id) {
      result = await updateRecord(record);
      
      // UPDATEが成功した場合、データベースから最新データを取得して確認
      if (result.data && !result.error) {
        // 念のため、データベースから最新データを取得して確認
        const { data: verifyData, error: verifyError } = await supabase
          .from('monthly_records')
          .select('*')
          .eq('id', record.id)
          .single();
        
        if (!verifyError && verifyData) {
          // データベースから取得した最新データを返す
          return { data: dbToApp(verifyData), error: null };
        }
      }
      
      return result;
    } else {
      // レコードが存在しない場合はINSERT
      result = await insertRecord(record);
      
      // INSERTが成功した場合、データベースから最新データを取得して確認
      if (result.data && !result.error) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('monthly_records')
          .select('*')
          .eq('id', record.id)
          .single();
        
        if (!verifyError && verifyData) {
          return { data: dbToApp(verifyData), error: null };
        }
      }
      
      return result;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return { data: null, error: `例外: ${errorMessage}` };
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
