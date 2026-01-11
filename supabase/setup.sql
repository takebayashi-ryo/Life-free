-- ============================================
-- monthly_records テーブル作成とRLS設定
-- ============================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS monthly_records (
  id TEXT PRIMARY KEY,  -- YYYY-MM形式（例: '2024-01'）
  month_str TEXT NOT NULL,  -- idと同じ値だが、明示的なカラムとして保持
  
  -- Income (収入)
  salary_income NUMERIC NOT NULL DEFAULT 0,
  side_hustle_income NUMERIC NOT NULL DEFAULT 0,
  child_allowance_income NUMERIC NOT NULL DEFAULT 0,
  
  -- Expenses (支出)
  nursery_expense NUMERIC NOT NULL DEFAULT 0,
  credit_card_expense NUMERIC NOT NULL DEFAULT 0,
  pocket_money_expense NUMERIC NOT NULL DEFAULT 0,
  
  -- Investment (投資)
  investment_trust NUMERIC NOT NULL DEFAULT 0,
  
  -- Snapshots (スナップショット - オプショナル)
  total_cash_snapshot NUMERIC,
  total_investment_snapshot NUMERIC,
  
  -- Memos
  note TEXT NOT NULL DEFAULT '',
  
  -- Calculated (計算済み値 - オプショナル)
  calculated_cash_flow NUMERIC,
  total_assets NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_monthly_records_id ON monthly_records(id);
CREATE INDEX IF NOT EXISTS idx_monthly_records_month_str ON monthly_records(month_str);

-- RLS有効化
ALTER TABLE monthly_records ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: anonロールでSELECT可能
CREATE POLICY "Allow anon to select monthly_records"
ON monthly_records
FOR SELECT
TO anon
USING (true);

-- RLSポリシー: anonロールでINSERT可能
CREATE POLICY "Allow anon to insert monthly_records"
ON monthly_records
FOR INSERT
TO anon
WITH CHECK (true);
