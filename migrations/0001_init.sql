-- Life free の D1 定義（Supabase の supabase/setup.sql から移行: 2026-11）
-- 単一ユーザー前提。入口は Cloudflare Access で守り、Worker でもトークンを検証する。
-- JSON は TEXT に入れ、Worker 側で JSON.stringify / JSON.parse する。

CREATE TABLE IF NOT EXISTS monthly_records (
  id TEXT PRIMARY KEY,      -- YYYY-MM
  month_str TEXT NOT NULL,
  salary_income REAL NOT NULL DEFAULT 0,
  side_hustle_income REAL NOT NULL DEFAULT 0,
  child_allowance_income REAL NOT NULL DEFAULT 0,
  nursery_expense REAL NOT NULL DEFAULT 0,
  credit_card_expense REAL NOT NULL DEFAULT 0,
  pocket_money_expense REAL NOT NULL DEFAULT 0,
  investment_trust REAL NOT NULL DEFAULT 0,
  total_cash_snapshot REAL,
  total_investment_snapshot REAL,
  note TEXT NOT NULL DEFAULT '',
  calculated_cash_flow REAL,
  total_assets REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- key は 'profile' / 'lifeplan' / 'config'
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- scope は 'public' / 'financial'
CREATE TABLE IF NOT EXISTS shared_profile (
  scope TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
