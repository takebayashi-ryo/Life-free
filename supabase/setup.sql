-- ============================================
-- Life free データベース定義 (実態に合わせて整理: 2026-08)
--
-- このファイルだけで、まっさらなSupabaseプロジェクトに
-- 同じ構成を再現できる状態を保つこと。
-- 画面から手で変更したら、必ずここにも反映する。
-- ============================================

-- --------------------------------------------
-- 1. monthly_records (月次記録)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS monthly_records (
  id TEXT PRIMARY KEY,      -- YYYY-MM形式（例: '2024-01'）
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

  -- Snapshots (月末の実残高。未入力なら計算値で埋める)
  total_cash_snapshot NUMERIC,
  total_investment_snapshot NUMERIC,

  -- Memos
  note TEXT NOT NULL DEFAULT '',

  -- Calculated
  calculated_cash_flow NUMERIC,
  total_assets NUMERIC,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_records_id ON monthly_records(id);
CREATE INDEX IF NOT EXISTS idx_monthly_records_month_str ON monthly_records(month_str);

ALTER TABLE monthly_records ENABLE ROW LEVEL SECURITY;

-- アプリは anon キーで接続するため、anon ロールに4操作すべてを許可する。
-- SELECT/INSERT だけでは記録の編集・削除が動かないので UPDATE/DELETE も必須。
DROP POLICY IF EXISTS "Allow anon to select monthly_records" ON monthly_records;
CREATE POLICY "Allow anon to select monthly_records"
  ON monthly_records FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to insert monthly_records" ON monthly_records;
CREATE POLICY "Allow anon to insert monthly_records"
  ON monthly_records FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update monthly_records" ON monthly_records;
CREATE POLICY "Allow anon to update monthly_records"
  ON monthly_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to delete monthly_records" ON monthly_records;
CREATE POLICY "Allow anon to delete monthly_records"
  ON monthly_records FOR DELETE TO anon USING (true);

-- --------------------------------------------
-- 2. app_settings (プロフィール・ライフプラン・財務パラメータ)
--
-- key は 'profile' / 'lifeplan' / 'config' の3種類。
-- value に JSON をそのまま入れる。
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_anon_all" ON app_settings;
CREATE POLICY "app_settings_anon_all"
  ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- --------------------------------------------
-- 3. 重複ポリシーの掃除
--
-- 過去に public ロール向けの同等ポリシーが別名で作られていた。
-- anon 向けと二重になっているだけで機能上の意味はないため削除する。
-- --------------------------------------------

DROP POLICY IF EXISTS "Allow anon read"   ON monthly_records;
DROP POLICY IF EXISTS "Allow anon insert" ON monthly_records;

-- ============================================
-- ⚠️ 公開前に必ず対応すること
--
-- 現在は「anonキーを知っていれば誰でも全データを読み書きできる」状態。
-- 単一ユーザーで使う前提の設定であり、iOSリリースなど配布時には
-- 認証を入れて以下のように書き換えること。
--
--   USING (true)  →  USING (auth.uid() = user_id)
--
-- 併せて各テーブルに user_id カラムの追加が必要。
-- ============================================
