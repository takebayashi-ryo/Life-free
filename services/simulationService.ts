import { SimulationCase } from '../types';

export interface SimulationDataPoint {
  month: string;
  dateObj: Date;
  displayDate: string;
  displayYear: number;
  yearIndex: number;
  cash: number;
  investPrincipal: number;
  investProfit: number;
  investTotal: number;
  total: number;
}

export interface SimulationResult {
  data: SimulationDataPoint[];
  yearlyData: SimulationDataPoint[];
  milestones: {
    m1000: Date | null;
    m3000: Date | null;
    m5000: Date | null;
  };
}

export interface SimulationPhase {
  id: string;
  startYearOffset: number; // years from "now"
  monthlyInvest: number;
  label: string;
}

const resolveMonthlyInvest = (
  monthIdx: number,
  phases: SimulationPhase[],
  fallback: number
): number => {
  if (phases.length === 0) return fallback;
  const yearOffset = monthIdx / 12;
  const sorted = [...phases].sort((a, b) => a.startYearOffset - b.startYearOffset);
  let amount = sorted[0].monthlyInvest;
  for (const p of sorted) {
    if (yearOffset >= p.startYearOffset) {
      amount = p.monthlyInvest;
    } else {
      break;
    }
  }
  return amount;
};

export const calculateSimulation = (
  initialCash: number,
  initialInvest: number,
  monthlyInvest: number | SimulationPhase[],
  annualRate: number,
  months: number = 360 // 30 years
): SimulationResult => {
  const monthlyDataPoints: SimulationDataPoint[] = [];
  const yearlyDataPoints: SimulationDataPoint[] = [];

  let currentInvestPrincipal = initialInvest;
  let currentInvestTotal = initialInvest;
  const currentCash = initialCash;
  const monthlyRate = annualRate / 100 / 12;
  const today = new Date();

  const phases = Array.isArray(monthlyInvest) ? monthlyInvest : [];
  const flatAmount = Array.isArray(monthlyInvest) ? 0 : monthlyInvest;

  const milestones = {
    m1000: null as Date | null,
    m3000: null as Date | null,
    m5000: null as Date | null,
  };

  for (let i = 0; i <= months; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthStr = date.toISOString().slice(0, 7);

    if (i > 0) {
      const amount = resolveMonthlyInvest(i, phases, flatAmount);
      currentInvestPrincipal += amount;
      currentInvestTotal = (currentInvestTotal * (1 + monthlyRate)) + amount;
    }

    const profit = currentInvestTotal - currentInvestPrincipal;
    const total = currentCash + currentInvestTotal;

    if (!milestones.m1000 && total >= 10000000) milestones.m1000 = date;
    if (!milestones.m3000 && total >= 30000000) milestones.m3000 = date;
    if (!milestones.m5000 && total >= 50000000) milestones.m5000 = date;

    const record: SimulationDataPoint = {
      month: monthStr,
      dateObj: date,
      displayDate: `${date.getFullYear()}/${date.getMonth() + 1}`,
      displayYear: date.getFullYear(),
      yearIndex: Math.floor(i / 12),
      cash: Math.round(currentCash),
      investPrincipal: Math.round(currentInvestPrincipal),
      investProfit: Math.round(profit),
      investTotal: Math.round(currentInvestTotal),
      total: Math.round(total),
    };

    monthlyDataPoints.push(record);

    if (i % 12 === 0) {
      yearlyDataPoints.push(record);
    }
  }

  return {
    data: monthlyDataPoints,
    yearlyData: yearlyDataPoints,
    milestones
  };
};