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

export const calculateSimulation = (
  initialCash: number,
  initialInvest: number,
  monthlyInvest: number,
  annualRate: number,
  months: number = 360 // 30 years
): SimulationResult => {
  const monthlyDataPoints: SimulationDataPoint[] = [];
  const yearlyDataPoints: SimulationDataPoint[] = [];

  let currentInvestPrincipal = initialInvest;
  let currentInvestTotal = initialInvest;
  const currentCash = initialCash; // Assuming cash stays constant for this projection
  const monthlyRate = annualRate / 100 / 12;
  const today = new Date();

  const milestones = {
    m1000: null as Date | null,
    m3000: null as Date | null,
    m5000: null as Date | null,
  };

  for (let i = 0; i <= months; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthStr = date.toISOString().slice(0, 7);

    if (i > 0) {
      currentInvestPrincipal += monthlyInvest;
      currentInvestTotal = (currentInvestTotal * (1 + monthlyRate)) + monthlyInvest;
    }

    const profit = currentInvestTotal - currentInvestPrincipal;
    const total = currentCash + currentInvestTotal;

    // Check Milestones
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

    // Add to yearly summary (Year 0, 1, 2...)
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