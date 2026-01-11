import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import { MonthlyRecord, FinancialConfig } from '../types';

interface AnalysisChartProps {
  data: MonthlyRecord[];
  config: FinancialConfig;
  accumulatedCash: number[];
  accumulatedInvest: number[];
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ data, config, accumulatedCash, accumulatedInvest }) => {
  // Merge accumulated cash into the chart data
  const chartData = data.map((record, index) => ({
    ...record,
    cashBalance: accumulatedCash[index],
    investBalance: accumulatedInvest[index],
  }));

  // Sort by date
  const sortedData = [...chartData].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="h-[400px] w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">資産推移 (Stock) & 投資実績 (Flow)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={sortedData}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="monthStr" 
            scale="point" 
            padding={{ left: 10, right: 10 }} 
            tick={{fontSize: 12, fill: '#64748b'}}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#64748b" 
            tickFormatter={(value) => `${value / 10000}万`}
            tick={{fontSize: 12}}
            axisLine={false}
            tickLine={false}
            label={{ value: '月次積立額', angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1', fontSize: 10 } }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#0f172a" 
            tickFormatter={(value) => `${value / 10000}万`}
            tick={{fontSize: 12}}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            label={{ value: '資産総額', angle: 90, position: 'insideRight', style: { fill: '#cbd5e1', fontSize: 10 } }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
                if (name === 'investmentTrust') return [`¥${value.toLocaleString()}`, '月次投資額'];
                if (name === 'cashBalance') return [`¥${value.toLocaleString()}`, '現金残高'];
                if (name === 'investBalance') return [`¥${value.toLocaleString()}`, '投資評価額'];
                return [`¥${value.toLocaleString()}`, name];
            }}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{paddingTop: '20px'}} />
          
          <ReferenceLine y={config.targetCash} yAxisId="right" label="現金目標" stroke="#ef4444" strokeDasharray="3 3" />
          
          {/* Monthly Investment Flow */}
          <Bar yAxisId="left" dataKey="investmentTrust" name="investmentTrust" barSize={20} fill="#bfdbfe" radius={[4, 4, 0, 0]} />
          
          {/* Cash Stock */}
          <Line yAxisId="right" type="monotone" dataKey="cashBalance" name="cashBalance" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
          
          {/* Investment Stock */}
          <Line yAxisId="right" type="monotone" dataKey="investBalance" name="investBalance" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalysisChart;