import { supabase } from './supabaseClient';

export type SettingKey = 'profile' | 'lifeplan' | 'config';

interface AppSettingRow {
  key: string;
  value: unknown;
}

/**
 * クラウドから設定を読む。未保存・接続失敗時は null を返す。
 */
export async function loadSetting<T>(key: SettingKey): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('key', key)
      .maybeSingle<AppSettingRow>();

    if (error || !data) return null;
    return (data.value as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * クラウドに設定を保存する。失敗しても例外は投げず false を返す
 * (localStorage 側に残るのでアプリは動き続ける)。
 */
export async function saveSetting<T>(key: SettingKey, value: T): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error(`設定の保存に失敗しました (${key}):`, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`設定の保存で例外が発生しました (${key}):`, error);
    return false;
  }
}

/**
 * 3種類の設定をまとめて読む。
 */
export async function loadAllSettings<P, L, C>(): Promise<{
  profile: P | null;
  lifeplan: L | null;
  config: C | null;
}> {
  const [profile, lifeplan, config] = await Promise.all([
    loadSetting<P>('profile'),
    loadSetting<L>('lifeplan'),
    loadSetting<C>('config'),
  ]);
  return { profile, lifeplan, config };
}
