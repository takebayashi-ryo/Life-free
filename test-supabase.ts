/**
 * Supabase接続テスト用スクリプト
 * 
 * 使用方法：
 * 1. このファイルをインポートして使用
 * 2. または、ブラウザのコンソールで直接実行
 */

import { loadRecords, insertRecord } from './services/dataService';
import { supabase } from './services/supabaseClient';
import { MonthlyRecord } from './types';

/**
 * テスト1: 接続確認（SELECT）
 * Supabaseからデータを取得できるか確認
 */
export async function testSelectConnection(): Promise<void> {
  console.log('=== テスト1: SELECT接続確認 ===');
  
  try {
    // 方法1: 直接Supabaseクライアントを使用
    console.log('1. 直接SupabaseクライアントでSELECT...');
    const { data, error } = await supabase
      .from('monthly_records')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ SELECTエラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return;
    }
    
    console.log('✅ SELECT成功!');
    console.log('取得件数:', data?.length || 0);
    console.log('データ:', data);
    
    // 方法2: dataServiceを使用
    console.log('\n2. dataService経由でSELECT...');
    const records = await loadRecords();
    console.log('✅ loadRecords()成功!');
    console.log('取得件数:', records.length);
    console.log('データ:', records);
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

/**
 * テスト2: INSERT確認
 * Supabaseに新しいデータを追加できるか確認
 */
export async function testInsertConnection(): Promise<void> {
  console.log('\n=== テスト2: INSERT接続確認 ===');
  
  try {
    // テスト用のサンプルデータを作成（現在の年月を使用）
    const now = new Date();
    const testMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const testRecord: MonthlyRecord = {
      id: `test-${testMonthId}-${Date.now()}`, // ユニークなID
      monthStr: testMonthId,
      salaryIncome: 450000,
      sideHustleIncome: 60000,
      childAllowanceIncome: 30000,
      nurseryExpense: 24000,
      creditCardExpense: 200000,
      pocketMoneyExpense: 50000,
      investmentTrust: 180000,
      totalCashSnapshot: 800000,
      totalInvestmentSnapshot: 500000,
      note: 'Supabase接続テスト用データ',
      calculatedCashFlow: 146000,
    };
    
    console.log('追加するデータ:', testRecord);
    
    // dataServiceを使用してINSERT
    const insertedRecord = await insertRecord(testRecord);
    
    if (!insertedRecord) {
      console.error('❌ INSERT失敗: データが返されませんでした');
      return;
    }
    
    console.log('✅ INSERT成功!');
    console.log('追加されたデータ:', insertedRecord);
    
    // 確認のため、再度SELECTして確認
    console.log('\n3. INSERTしたデータをSELECTで確認...');
    const { data, error } = await supabase
      .from('monthly_records')
      .select('*')
      .eq('id', testRecord.id)
      .single();
    
    if (error) {
      console.error('❌ 確認用SELECTエラー:', error);
      return;
    }
    
    console.log('✅ 確認成功!');
    console.log('データベース上のデータ:', data);
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

/**
 * テスト3: 環境変数確認
 * Supabase接続情報が正しく設定されているか確認
 */
export function testEnvironmentVariables(): void {
  console.log('=== テスト0: 環境変数確認 ===');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ 設定されています' : '❌ 設定されていません');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 設定されています' : '❌ 設定されていません');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ 環境変数が設定されていません！');
    console.log('.env.local ファイルに以下を設定してください:');
    console.log('VITE_SUPABASE_URL=your_supabase_url');
    console.log('VITE_SUPABASE_ANON_KEY=your_anon_key');
  } else {
    console.log('\n✅ 環境変数は設定されています');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');
  }
}

/**
 * 全テストを実行
 */
export async function runAllTests(): Promise<void> {
  testEnvironmentVariables();
  
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error('\n環境変数が設定されていないため、テストをスキップします');
    return;
  }
  
  await testSelectConnection();
  await testInsertConnection();
  
  console.log('\n=== 全テスト完了 ===');
}

// ブラウザのコンソールから実行できるように、グローバルに公開（開発環境のみ）
if (import.meta.env.DEV) {
  (window as any).testSupabase = {
    testEnvironmentVariables,
    testSelectConnection,
    testInsertConnection,
    runAllTests,
  };
}
