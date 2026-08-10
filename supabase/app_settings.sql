-- プロフィール・ライフプラン・財務パラメータをクラウドに保存するテーブル
-- Supabase ダッシュボードの SQL Editor で 1 回だけ実行してください。

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- 単一ユーザー前提のアプリのため、monthly_records と同じく anon キーで読み書きを許可する
drop policy if exists "app_settings_anon_all" on public.app_settings;
create policy "app_settings_anon_all"
  on public.app_settings
  for all
  using (true)
  with check (true);
