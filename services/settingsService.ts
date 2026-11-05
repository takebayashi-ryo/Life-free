import { apiFetch } from './apiClient';

export type SettingKey = 'profile' | 'lifeplan' | 'config';

/**
 * クラウドに設定を保存する。失敗しても例外は投げず false を返す
 * (localStorage 側に残るのでアプリは動き続ける)。
 */
export async function saveSetting<T>(key: SettingKey, value: T): Promise<boolean> {
  try {
    await apiFetch(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
    return true;
  } catch (error) {
    console.error(`設定の保存に失敗しました (${key}):`, error);
    return false;
  }
}

/**
 * 3種類の設定をまとめて読む。未保存・接続失敗時は null。
 */
export async function loadAllSettings<P, L, C>(): Promise<{
  profile: P | null;
  lifeplan: L | null;
  config: C | null;
}> {
  try {
    const all = await apiFetch<Partial<Record<SettingKey, unknown>>>('/api/settings');
    return {
      profile: (all.profile as P) ?? null,
      lifeplan: (all.lifeplan as L) ?? null,
      config: (all.config as C) ?? null,
    };
  } catch {
    return { profile: null, lifeplan: null, config: null };
  }
}
