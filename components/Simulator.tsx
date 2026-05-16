import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calculator, Target, TrendingUp, AlertCircle, Wallet, Save, Trash2, Bookmark, ChevronRight, X } from 'lucide-react';
import { SimulationCase } from '../types';
import { calculateSimulation } from '../services/simulationService';

interface SimulatorProps {
  initialCash: number;
  initialInvest: number;
  initialMonthlyInvest: number;
  sharedRate?: number;
  onSharedChange?: (rate: number, monthlyInvest: number) => void;
  isMasked?: boolean;
}

const STORAGE_KEY_CASES = 'assetflow_sim_cases_v1';
const MASK = '✳︎✳︎✳︎✳︎✳︎✳︎';

const Simulator: React.FC<SimulatorProps> = ({
  initialCash,
  initialInvest,
  initialMonthlyInvest,
  sharedRate,
  onSharedChange,
  isMasked = false,
}) => {
  const [params, setParams] = useState({
    cash: initialCash.toString(),
    invest: initialInvest.toString(),
    monthlyInvest: (initialMonthlyInvest || 50000).toString(),
    annualRate: (sharedRate || 6.0).toString(),
    targetAmount: "10000000",
  });

  const [savedCases, setSavedCases] = useState<SimulationCase[]>([]);
  const [caseNameInput, setCaseNameInput] = useState('');
  const [isSaveMode, setIsSaveMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CASES);
    if (saved) {
      setSavedCases(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (sharedRate !== undefined && Number(params.annualRate) !== sharedRate) {
      setParams(prev => ({ ...prev, annualRate: sharedRate.toString() }));
    }
  }, [sharedRate]);

  useEffect(() => {
    if (initialMonthlyInvest !== undefined && Number(params.monthlyInvest) !== initialMonthlyInvest) {
      setParams(prev => ({ ...prev, monthlyInvest: initialMonthlyInvest.toString() }));
    }
  }, [initialMonthlyInvest]);

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));

    if (onSharedChange) {
      if (name === 'annualRate') {
        onSharedChange(Number(value), Number(params.monthlyInvest));
      } else if (name === 'monthlyInvest') {
        onSharedChange(Number(params.annualRate), Number(value));
      }
    }
  };

  const handleSaveCase = () => {
    if (!caseNameInput.trim()) return;
    const newCase: SimulationCase = {
      id: Date.now().toString(),
      name: caseNameInput,
      monthlyInvest: Number(params.monthlyInvest),
      annualRate: Number(params.annualRate),
      targetAmount: Number(params.targetAmount)
    };
    const updated = [...savedCases, newCase];
    setSavedCases(updated);
    localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(updated));
    setCaseNameInput('');
    setIsSaveMode(false);
  };

  const handleLoadCase = (c: SimulationCase) => {
    setParams(prev => ({
      ...prev,
      monthlyInvest: c.monthlyInvest.toString(),
      annualRate: c.annualRate.toString(),
      targetAmount: c.targetAmount.toString()
    }));
    if (onSharedChange) {
      onSharedChange(c.annualRate, c.monthlyInvest);
    }
  };

  const handleDeleteCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCases.filter(c => c.id !== id);
    setSavedCases(updated);
    localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(updated));
  };

  const { data, yearlyData, currentValues } = useMemo(() => {
    const pCash = Number(params.cash) || 0;
    const pInvest = Number(params.invest) || 0;
    const pMonthlyInvest = Number(params.monthlyInvest) || 0;
    const pAnnualRate = Number(params.annualRate) || 0;
    const pTargetAmount = Number(params.targetAmount) || 0;

    const result = calculateSimulation(pCash, pInvest, pMonthlyInvest, pAnnualRate);

    return {
      ...result,
      currentValues: {
        target: pTargetAmount,
        cash: pCash
      }
    };
  }, [params]);

  const inputClass = "w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-sm";
  const labelClass = "block text-xs text-zinc-400 mb-1 font-medium";

  const targetReached = data.find(d => d.total >= Number(params.targetAmount));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Saved Cases */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="text-xs font-medium text-zinc-500 whitespace-nowrap flex items-center gap-1">
          <Bookmark size={13} /> 保存ケース:
        </div>
        {savedCases.length === 0 && (
          <span className="text-[11px] text-zinc-600 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">なし</span>
        )}
        {savedCases.map(c => (
          <button
            key={c.id}
            onClick={() => handleLoadCase(c)}
            className="group flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:text-blue-300 px-3 py-1.5 rounded-full text-xs text-zinc-300 transition-all whitespace-nowrap"
          >
            <span>{c.name}</span>
            <span className="text-[10px] text-zinc-500">
              {isMasked ? `(${MASK})` : `(¥${(c.monthlyInvest / 10000).toFixed(0)}万/${c.annualRate}%)`}
            </span>
            <div
              onClick={(e) => handleDeleteCase(c.id, e)}
              className="ml-0.5 p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors"
            >
              <Trash2 size={11} />
            </div>
          </button>
        ))}
      </div>

      {/* Configuration */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Calculator className="text-zinc-400" size={16} />
            シミュレーション設定
          </h2>
          {!isSaveMode ? (
            <button
              onClick={() => setIsSaveMode(true)}
              className="text-xs text-blue-400 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Save size={13} /> ケース保存
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="ケース名"
                value={caseNameInput}
                onChange={(e) => setCaseNameInput(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-32 text-zinc-100"
                autoFocus
              />
              <button
                onClick={handleSaveCase}
                disabled={!caseNameInput}
                className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setIsSaveMode(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Base */}
          <div className="bg-zinc-950/60 rounded-xl border border-zinc-800 p-3">
            <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-3">
              <Wallet size={13} /> スタート時の資産
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>現金残高</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                  <input type="number" name="cash" value={params.cash} onChange={handleParamChange} className={inputClass} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>投資信託</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                  <input type="number" name="invest" value={params.invest} onChange={handleParamChange} className={inputClass} placeholder="0" />
                </div>
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-3">
            <h3 className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 mb-3">
              <TrendingUp size={13} /> 積立・運用プラン
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>毎月の積立額</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                  <input type="number" name="monthlyInvest" value={params.monthlyInvest} onChange={handleParamChange} className={`${inputClass} font-bold`} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>想定年利 (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="annualRate"
                    value={params.annualRate}
                    onChange={handleParamChange}
                    step="0.1"
                    className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg pl-3 pr-7 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    placeholder="6.0"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Goal */}
          <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-3">
            <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-3">
              <Target size={13} /> 目標ゴール
            </h3>
            <div>
              <label className={labelClass}>目標資産額</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                <input type="number" name="targetAmount" value={params.targetAmount} onChange={handleParamChange} className={`${inputClass} font-bold`} placeholder="10000000" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      {targetReached ? (
        <div className="bg-gradient-to-br from-emerald-600/20 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Target size={80} className="text-emerald-400" />
          </div>
          <div className="relative">
            <div className="text-xs text-emerald-300 font-medium mb-1">🎯 目標達成時期</div>
            <div className="text-3xl font-extrabold text-white tracking-tight mb-3">
              {targetReached.dateObj.getFullYear()}年
              <span className="text-xl ml-1 font-bold">{targetReached.dateObj.getMonth() + 1}月</span>
            </div>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="block text-zinc-500 mb-0.5">達成まで</span>
                <span className="text-zinc-100 font-semibold">
                  {(() => {
                    const idx = data.findIndex(d => d.total >= Number(params.targetAmount));
                    return idx >= 0 ? `${Math.floor(idx / 12)}年${idx % 12}ヶ月` : '---';
                  })()}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500 mb-0.5">投資元本比率</span>
                <span className="text-zinc-100 font-semibold">
                  {Math.round(targetReached.investPrincipal / targetReached.total * 100)}%
                </span>
              </div>
              <div>
                <span className="block text-zinc-500 mb-0.5">運用益比率</span>
                <span className="text-amber-400 font-semibold">
                  {Math.round(targetReached.investProfit / targetReached.total * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-zinc-400 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
          <span>30年以内に目標額には到達しません。積立額や年利を見直してみましょう。</span>
        </div>
      )}

      {/* Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 h-[360px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-100">資産推移グラフ</h3>
          <span className="text-[10px] text-zinc-500">緑:現金 / 青:元本 / 黄:運用益</span>
        </div>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="displayDate" tick={{ fontSize: 9, fill: '#71717a' }} interval={23} />
            <YAxis tickFormatter={(value) => `${value / 10000}万`} tick={{ fontSize: 9, fill: '#71717a' }} width={40} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const label = (() => {
                  if (name === 'total') return '合計';
                  if (name === 'investPrincipal') return '投資元本';
                  if (name === 'investProfit') return '運用益';
                  if (name === 'cash') return '現金';
                  return name;
                })();
                if (isMasked) return [MASK, label];
                return [`¥${value.toLocaleString()}`, label];
              }}
              contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #3f3f46', color: '#f4f4f5' }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <ReferenceLine y={currentValues.target} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Goal', fill: '#f87171', fontSize: 9 }} />

            <Area type="monotone" dataKey="investProfit" stackId="1" stroke="#f59e0b" fill="url(#colorProfit)" name="運用益" />
            <Area type="monotone" dataKey="investPrincipal" stackId="1" stroke="#3b82f6" fill="url(#colorPrincipal)" name="投資元本" />
            <Area type="monotone" dataKey="cash" stackId="1" stroke="#10b981" fill="url(#colorCash)" name="現金" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Annual Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100">年次推移</h3>
        </div>
        <div className="max-h-[320px] overflow-y-auto scrollbar-dark">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-zinc-900 text-zinc-500 text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">経過</th>
                <th className="px-4 py-2.5 font-medium">資産総額</th>
                <th className="px-4 py-2.5 font-medium text-blue-400">元本</th>
                <th className="px-4 py-2.5 font-medium text-amber-400">運用益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {yearlyData.map((row) => (
                <tr key={row.month} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-zinc-300 text-xs">
                    {row.yearIndex}年後
                    <span className="text-[10px] text-zinc-500 block">{row.displayYear}年</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-zinc-100 text-xs">
                    {isMasked ? MASK : `¥${(row.total / 10000).toFixed(0)}万`}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 text-xs">
                    {isMasked ? MASK : `¥${(row.investPrincipal / 10000).toFixed(0)}万`}
                  </td>
                  <td className="px-4 py-2.5 text-amber-400 font-medium text-xs">
                    {isMasked ? MASK : `+¥${(row.investProfit / 10000).toFixed(0)}万`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Simulator;
