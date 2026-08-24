import { supabase } from './supabaseClient';
import { FinancialConfig, LifePlan, MonthlyRecord, UserProfile } from '../types';
import { buildYearContext, calcYearAmounts } from './lifePlanService';

/**
 * 他部署のAIエージェントに渡す要約プロフィール。
 *
 * 生の月次レコードをそのまま渡すとトークンを食う上に読み違えるため、
 * 「今どういう状況か」という結論だけをここで組み立てて共有する。
 * 金額の計算は lifePlanService の既存関数を使い回し、
 * 部署ごとに違う数字を答える事故を防ぐ。
 */

export type SharedProfileScope = 'public' | 'financial';

/** 平均キャッシュフローを取る対象月数 */
const RECENT_MONTHS_COUNT = 6;
/** 共有するライフプランの先読み年数 */
const UPCOMING_YEARS_COUNT = 5;

/** 金額を一切含まない属性情報。全部署が読んでよい */
export interface SharedProfilePublic {
  updatedAt: string;
  selfAge?: number;
  children: Array<{ name: string; age: number }>;
  lifeStageLabel?: string;
  planHorizonYears: number;
}

/** 金額を含む財務情報。不動産・資産部など、許可した部署だけが読む */
export interface SharedProfileFinancial {
  updatedAt: string;
  /** 最新の記録がある月 (YYYY-MM) */
  asOfMonth?: string;
  totalAssets?: number;
  totalCash?: number;
  totalInvestment?: number;
  /** 直近数ヶ月の月次キャッシュフロー平均 */
  avgMonthlyCashFlow?: number;
  /** 今年の実効積立額 (イベントの収支を反映済み) */
  currentMonthlyInvestment: number;
  targetCash: number;
  recentMonths: Array<{ month: string; cashFlow?: number; totalAssets?: number }>;
  upcomingYears: Array<{ calendarYear: number; monthlyInvest: number; events: string[] }>;
}

export interface SharedProfile {
  publicProfile: SharedProfilePublic;
  financialProfile: SharedProfileFinancial;
}

/**
 * 月次記録・プロフィール・ライフプランから共有プロフィールを組み立てる。
 * 副作用なし。保存は saveSharedProfile が行う。
 */
export function buildSharedProfile(
  records: MonthlyRecord[],
  profile: UserProfile,
  lifePlan: LifePlan,
  config: FinancialConfig
): SharedProfile {
  const updatedAt = new Date().toISOString();

  // id は YYYY-MM なので文字列ソートで時系列に並ぶ
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  const latest = sorted[sorted.length - 1];
  const recent = sorted.slice(-RECENT_MONTHS_COUNT);

  const context = buildYearContext(0, profile);

  const publicProfile: SharedProfilePublic = {
    updatedAt,
    selfAge: context.selfAge,
    children: context.childAges,
    lifeStageLabel: context.lifeStageLabel,
    planHorizonYears: lifePlan.years.length,
  };

  const cashFlows = recent
    .map(r => r.calculatedCashFlow)
    .filter((v): v is number => typeof v === 'number');
  const avgMonthlyCashFlow = cashFlows.length
    ? Math.round(cashFlows.reduce((sum, v) => sum + v, 0) / cashFlows.length)
    : undefined;

  const totalCash = latest?.totalCashSnapshot;
  const totalInvestment = latest?.totalInvestmentSnapshot;
  const totalAssets =
    latest?.totalAssets ??
    (typeof totalCash === 'number' && typeof totalInvestment === 'number'
      ? totalCash + totalInvestment
      : undefined);

  const currentYearPlan = lifePlan.years.find(y => y.yearOffset === 0);
  const currentMonthlyInvestment = currentYearPlan
    ? calcYearAmounts(currentYearPlan).effective
    : 0;

  const thisYear = new Date().getFullYear();
  const upcomingYears = lifePlan.years
    .filter(y => y.yearOffset >= 0 && y.yearOffset < UPCOMING_YEARS_COUNT)
    .sort((a, b) => a.yearOffset - b.yearOffset)
    .map(y => ({
      calendarYear: thisYear + y.yearOffset,
      monthlyInvest: calcYearAmounts(y).effective,
      events: y.events.map(e => e.label).filter(Boolean),
    }));

  const financialProfile: SharedProfileFinancial = {
    updatedAt,
    asOfMonth: latest?.monthStr,
    totalAssets,
    totalCash,
    totalInvestment,
    avgMonthlyCashFlow,
    currentMonthlyInvestment,
    targetCash: config.targetCash,
    recentMonths: recent.map(r => ({
      month: r.monthStr,
      cashFlow: r.calculatedCashFlow,
      totalAssets: r.totalAssets,
    })),
    upcomingYears,
  };

  return { publicProfile, financialProfile };
}

/**
 * 共有プロフィールをクラウドに書き出す。
 * 失敗しても例外は投げず false を返す (本体の家計簿機能は動き続ける)。
 */
export async function saveSharedProfile(
  records: MonthlyRecord[],
  profile: UserProfile,
  lifePlan: LifePlan,
  config: FinancialConfig
): Promise<boolean> {
  try {
    const { publicProfile, financialProfile } = buildSharedProfile(
      records,
      profile,
      lifePlan,
      config
    );
    const now = new Date().toISOString();

    const { error } = await supabase.from('shared_profile').upsert(
      [
        { scope: 'public', data: publicProfile, updated_at: now },
        { scope: 'financial', data: financialProfile, updated_at: now },
      ],
      { onConflict: 'scope' }
    );

    if (error) {
      console.error('共有プロフィールの保存に失敗しました:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('共有プロフィールの保存で例外が発生しました:', error);
    return false;
  }
}
