# Supabase設定ガイド

## 1. 実装方式の選択

### 提案：カラム分割方式を採用

**理由：**
- `MonthlyRecord`型のフィールドが明確に定義されている（15フィールド）
- 型安全性が確保される（Supabaseの型生成と連携可能）
- フィールド単位でのクエリ・フィルタリングが可能
- インデックス設定が容易
- 将来的な拡張性（集計・分析クエリ）に対応しやすい
- 現在の`dataService.ts`の実装（`select('*')`, `insert([record])`）がカラム分割方式を前提としている

**jsonb方式が不適切な理由：**
- 型安全性が失われる
- フィールド単位のクエリが複雑になる
- インデックス設定が制限される

---

## 2. Supabaseテーブル設計

### `monthly_records`テーブル

```sql
CREATE TABLE monthly_records (
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

-- インデックス
CREATE INDEX idx_monthly_records_id ON monthly_records(id);
CREATE INDEX idx_monthly_records_month_str ON monthly_records(month_str);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monthly_records_updated_at BEFORE UPDATE ON monthly_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**設計のポイント：**
- `id`をPRIMARY KEYとして使用（YYYY-MM形式の文字列）
- 数値フィールドは`NUMERIC`型を使用（JavaScriptの`number`との互換性）
- オプショナルフィールドは`NULL`を許可
- `created_at`と`updated_at`を追加（監査用）

---

## 3. RLS (Row Level Security) 設定

### 開発用設定（anonでselect/insert可能）

```sql
-- RLSを有効化
ALTER TABLE monthly_records ENABLE ROW LEVEL SECURITY;

-- anonロールでSELECT可能
CREATE POLICY "Allow anon to select monthly_records"
ON monthly_records
FOR SELECT
TO anon
USING (true);

-- anonロールでINSERT可能
CREATE POLICY "Allow anon to insert monthly_records"
ON monthly_records
FOR INSERT
TO anon
WITH CHECK (true);
```

**注意：** これは開発用の設定です。本番環境では認証を実装し、ユーザーごとのデータ分離を行う必要があります。

---

## 4. 実装手順

1. Supabaseプロジェクトを作成（または既存プロジェクトを使用）
2. SQL Editorで上記のテーブル作成SQLを実行
3. SQL Editorで上記のRLS設定SQLを実行
4. `.env.local`ファイルに環境変数を設定：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## 5. 現在のコードとの互換性

現在の`dataService.ts`の実装は、このテーブル設計と互換性があります。
ただし、TypeScriptの型（キャメルケース）とデータベースのカラム名（スネークケース）の変換が必要です。

**対応方法：**
- Option A: データサービス層で変換処理を実装（推奨）
- Option B: Supabaseのカラム名マッピング機能を使用
