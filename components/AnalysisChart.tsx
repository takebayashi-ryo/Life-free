import React, { useEffect, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { MonthlyRecord, FinancialConfig } from '../types';

interface AnalysisChartProps {
  data: MonthlyRecord[];
  config: FinancialConfig;
  accumulatedCash: number[];
  accumulatedInvest: number[];
}

function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ data, config, accumulatedCash, accumulatedInvest }) => {
  const isDark = useIsDark();
  const chartData = data.map((record, index) => ({
    ...record,
    cashBalance: accumulatedCash[index],
    investBalance: accumulatedInvest[index],
  }));

  const sortedData = [...chartData].sort((a, b) => a.id.localeCompare(b.id));

  const colors = {
    grid: isDark ? '#27272a' : '#e4e4e7',
    axis: isDark ? '#71717a' : '#a1a1aa',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDark ? '#f4f4f5' : '#18181b',
    tooltipLabel: isDark ? '#a1a1aa' : '#71717a',
    bar: isDark ? '#52525b' : '#a1a1aa',
    cash: '#10b981',
    invest: isDark ? '#60a5fa' : '#3b82f6',
    target: '#ef4444',
  };

  return (
    <div className="h-[340px] w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">資産推移</h3>
      {sortedData.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-sm text-zinc-500">
          データが追加されるとここにグラフが表示されます
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={sortedData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="monthStr"
              scale="point"
              padding={{ left: 10, right: 10 }}
              tick={{ fontSize: 10, fill: colors.axis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={(value) => `${value / 10000}万`}
              tick={{ fontSize: 10, fill: colors.axis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `${value / 10000}万`}
              tick={{ fontSize: 10, fill: colors.axis }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'investmentTrust') return [`¥${value.toLocaleString()}`, '月次投資'];
                if (name === 'cashBalance') return [`¥${value.toLocaleString()}`, '現金残高'];
                if (name === 'investBalance') return [`¥${value.toLocaleString()}`, '投資評価額'];
                return [`¥${value.toLocaleString()}`, name];
              }}
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                borderRadius: '8px',
                border: `1px solid ${colors.tooltipBorder}`,
                color: colors.tooltipText
              }}
              labelStyle={{ color: colors.tooltipLabel }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: colors.axis }}
              formatter={(value) => {
                if (value === 'investmentTrust') return '月次投資';
                if (value === 'cashBalance') return '現金残高';
                if (value === 'investBalance') return '投資評価額';
                return value;
              }}
            />

            <ReferenceLine y={config.targetCash} yAxisId="right" label={{ value: '目標', fill: colors.target, fontSize: 10 }} stroke={colors.target} strokeDasharray="3 3" />

            <Bar yAxisId="left" dataKey="investmentTrust" name="investmentTrust" barSize={14} fill={colors.bar} opacity={0.6} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cashBalance" name="cashBalance" stroke={colors.cash} strokeWidth={2} dot={{ r: 3, fill: colors.cash }} activeDot={{ r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="investBalance" name="investBalance" stroke={colors.invest} strokeWidth={2} dot={{ r: 3, fill: colors.invest }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default AnalysisChart;
