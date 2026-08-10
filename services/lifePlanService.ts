import { LifePlan, LifePlanYear, UserProfile, ChildProfile } from '../types';

const DEFAULT_HORIZON_YEARS = 30;

interface ChildStage {
  label: string;
  startAge: number;
  endAge: number;
  // 月額の余剰投資余力の目安 (子供1人あたり)
  suggestedMonthly: number;
}

const CHILD_STAGES: ChildStage[] = [
  { label: '保育園期', startAge: 0,  endAge: 5,  suggestedMonthly: 80000 },
  { label: '小学生期', startAge: 6,  endAge: 12, suggestedMonthly: 120000 },
  { label: '中学生期', startAge: 13, endAge: 15, suggestedMonthly: 100000 },
  { label: '高校生期', startAge: 16, endAge: 18, suggestedMonthly: 80000 },
  { label: '大学生期', startAge: 19, endAge: 22, suggestedMonthly: 30000 },
];

const POST_INDEPENDENCE_MONTHLY = 150000;

const getChildStageAt = (childAge: number): ChildStage | null => {
  for (const stage of CHILD_STAGES) {
    if (childAge >= stage.startAge && childAge <= stage.endAge) return stage;
  }
  return null;
};

// その年における月積立額の初期推奨値を計算
const suggestMonthlyForYear = (
  profile: UserProfile,
  yearOffset: number,
  fallbackMonthly: number
): number => {
  if (!profile.children || profile.children.length === 0) {
    return fallbackMonthly;
  }

  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + yearOffset;

  // 最も若い子の年齢を基準にライフステージを判定（最も支出が長期化するため）
  const youngestBirthYear = Math.max(...profile.children.map(c => c.birthYear));
  const youngestAgeAtYear = targetYear - youngestBirthYear;

  if (youngestAgeAtYear < 0) return fallbackMonthly;
  if (youngestAgeAtYear >= 23) return POST_INDEPENDENCE_MONTHLY;

  const stage = getChildStageAt(youngestAgeAtYear);
  return stage ? stage.suggestedMonthly : fallbackMonthly;
};

export const createEmptyLifePlan = (): LifePlan => ({ years: [] });

export const createDefaultLifePlan = (
  profile: UserProfile,
  fallbackMonthly: number = 80000,
  horizonYears: number = DEFAULT_HORIZON_YEARS
): LifePlan => {
  const years: LifePlanYear[] = [];
  for (let i = 0; i < horizonYears; i++) {
    years.push({
      yearOffset: i,
      monthlyInvest: suggestMonthlyForYear(profile, i, fallbackMonthly),
      memo: '',
      events: [],
    });
  }
  return { years };
};

export const ensureLifePlanHorizon = (
  plan: LifePlan,
  profile: UserProfile,
  fallbackMonthly: number,
  horizonYears: number = DEFAULT_HORIZON_YEARS
): LifePlan => {
  const existingByOffset = new Map(plan.years.map(y => [y.yearOffset, y]));
  const years: LifePlanYear[] = [];
  for (let i = 0; i < horizonYears; i++) {
    const existing = existingByOffset.get(i);
    if (existing) {
      years.push(existing);
    } else {
      years.push({
        yearOffset: i,
        monthlyInvest: suggestMonthlyForYear(profile, i, fallbackMonthly),
        memo: '',
        events: [],
      });
    }
  }
  return { years };
};

export interface YearContext {
  yearOffset: number;
  calendarYear: number;
  selfAge?: number;
  childAges: Array<{ name: string; age: number }>;
  lifeStageLabel?: string; // 例: "保育園期"
}

export const buildYearContext = (
  yearOffset: number,
  profile: UserProfile
): YearContext => {
  const currentYear = new Date().getFullYear();
  const calendarYear = currentYear + yearOffset;
  const selfAge = profile.selfBirthYear ? calendarYear - profile.selfBirthYear : undefined;
  const childAges = (profile.children || []).map(c => ({
    name: c.name,
    age: calendarYear - c.birthYear,
  }));

  let lifeStageLabel: string | undefined;
  if (childAges.length > 0) {
    const youngestAge = Math.min(...childAges.map(ca => ca.age));
    if (youngestAge < 0) {
      lifeStageLabel = '未出生';
    } else if (youngestAge >= 23) {
      lifeStageLabel = '独立後';
    } else {
      const stage = getChildStageAt(youngestAge);
      lifeStageLabel = stage?.label;
    }
  }

  return { yearOffset, calendarYear, selfAge, childAges, lifeStageLabel };
};

// LifePlan の積立額を simulationService の SimulationPhase[] 形式に変換
export const lifePlanToPhases = (plan: LifePlan): Array<{ id: string; startYearOffset: number; monthlyInvest: number; label: string }> => {
  return plan.years
    .slice()
    .sort((a, b) => a.yearOffset - b.yearOffset)
    .map(y => ({
      id: `lp-${y.yearOffset}`,
      startYearOffset: y.yearOffset,
      monthlyInvest: y.monthlyInvest,
      label: `${new Date().getFullYear() + y.yearOffset}年`,
    }));
};
