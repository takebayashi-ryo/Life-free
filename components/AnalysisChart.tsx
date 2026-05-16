import React from 'react';
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

const AnalysisChart: React.FC<AnalysisChartProps> = ({ data, config, accumulatedCash, accumulatedInvest }) => {
  const chartData = data.map((record, index) => ({
    ...record,
    cashBalance: accumulatedCash[index],
    investBalance: accumulatedInvest[index],
  }));

  const sortedData = [...chartData].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="h-[360px] w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
      <h3 className="text-base font-semibold text-zinc-100 mb-4">資産推移</h3>
      {sortedData.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-sm text-zinc-500">
          データが追加されるとここにグラフが表示されます
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart
            data={sortedData}
            margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="monthStr"
              scale="point"
              padding={{ left: 10, right: 10 }}
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={(value) => `${value / 10000}万`}
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `${value / 10000}万`}
              tick={{ fontSize: 10, fill: '#71717a' }}
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
                backgroundColor: '#18181b',
                borderRadius: '8px',
                border: '1px solid #3f3f46',
                color: '#f4f4f5'
              }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#a1a1aa' }}
              formatter={(value) => {
                if (value === 'investmentTrust') return '月次投資';
                if (value === 'cashBalance') return '現金残高';
                if (value === 'investBalance') return '投資評価額';
                return value;
              }}
            />

            <ReferenceLine y={config.targetCash} yAxisId="right" label={{ value: '現金目標', fill: '#f87171', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />

            <Bar yAxisId="left" dataKey="investmentTrust" name="investmentTrust" barSize={16} fill="#1d4ed8" opacity={0.7} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cashBalance" name="cashBalance" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="investBalance" name="investBalance" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa' }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default AnalysisChart;
