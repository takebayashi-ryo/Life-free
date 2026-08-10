import { LifePlan, LifePlanYear, UserProfile, ChildProfile } from '../types';

const DEFAULT_HORIZON_YEARS = 30;

interface ChildStage {
  label: string;
  startAge: number;
  endAge: number;
}

const CHILD_STAGES: ChildStage[] = [
  { label: '保育園期', startAge: 0,  endAge: 5  },
  { label: '小学生期', startAge: 6,  endAge: 12 },
  { label: '中学生期', startAge: 13, endAge: 15 },
  { label: '高校生期', startAge: 16, endAge: 18 },
  { label: '大学生期', startAge: 19, endAge: 22 },
];

const getChildStageAt = (childAge: number): ChildStage | null => {
  for (const stage of CHILD_STAGES) {
    if (childAge >= stage.startAge && childAge <= stage.endAge) return stage;
  }
  return null;
};

export const createEmptyLifePlan = (): LifePlan => ({ years: [] });

// monthlyInvest は「子供関連を除いた投資余力」。年ごとの変動はイベントが担うため、
// 初期値は全年で同じ値を置く (ここでライフステージ別の値を入れると、
// イベントの保育料などと二重に差し引かれてしまう)。
export const createDefaultLifePlan = (
  _profile: UserProfile,
  baseMonthly: number = 80000,
  horizonYears: number = DEFAULT_HORIZON_YEARS
): LifePlan => {
  const years: LifePlanYear[] = [];
  for (let i = 0; i < horizonYears; i++) {
    years.push({
      yearOffset: i,
      monthlyInvest: baseMonthly,
      memo: '',
      events: [],
    });
  }
  return { years };
};

export const ensureLifePlanHorizon = (
  plan: LifePlan,
  _profile: UserProfile,
  baseMonthly: number,
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
        monthlyInvest: baseMonthly,
        memo: '',
        events: [],
      });
    }
  }
  return { years };
};

export interface YearAmounts {
  base: number;
  income: number;
  expense: number;
  /** 収支を反映した実際の積立額。マイナスにはしない */
  effective: number;
  /** 収支を引くと積立できない年かどうか */
  isShortfall: boolean;
}

export const calcYearAmounts = (year: LifePlanYear): YearAmounts => {
  const base = Number(year.monthlyInvest) || 0;
  let income = 0;
  let expense = 0;

  for (const e of year.events) {
    const amount = Math.max(0, Number(e.monthlyAmount) || 0);
    if (e.category === 'income') income += amount;
    else expense += amount;
  }

  const raw = base + income - expense;
  return {
    base,
    income,
    expense,
    effective: Math.max(0, raw),
    isShortfall: raw < 0,
  };
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
      monthlyInvest: calcYearAmounts(y).effective,
      label: `${new Date().getFullYear() + y.yearOffset}年`,
    }));
};
