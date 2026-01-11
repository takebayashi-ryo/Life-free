import { createClient } from '@supabase/supabase-js'

// .env.local から値を読む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Supabaseクライアントを作成
// 環境変数が未設定の場合でもエラーにならないように空文字列をデフォルト値として使用
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
