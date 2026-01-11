import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Calculator, Target, TrendingUp, Calendar, AlertCircle, Wallet, Save, Trash2, Bookmark, ChevronRight } from 'lucide-react';
import { SimulationCase } from '../types';
import { calculateSimulation } from '../services/simulationService';

interface SimulatorProps {
  initialCash: number;
  initialInvest: number;
  initialMonthlyInvest: number;
  sharedRate?: number; // Prop from parent
  onSharedChange?: (rate: number, monthlyInvest: number) => void; // Callback to parent
}

const STORAGE_KEY_CASES = 'assetflow_sim_cases_v1';

const Simulator: React.FC<SimulatorProps> = ({ 
    initialCash, 
    initialInvest, 
    initialMonthlyInvest,
    sharedRate,
    onSharedChange 
}) => {
  // Local state for params
  const [params, setParams] = useState({
    cash: initialCash.toString(),
    invest: initialInvest.toString(),
    monthlyInvest: (initialMonthlyInvest || 50000).toString(),
    annualRate: (sharedRate || 5.0).toString(),
    targetAmount: "10000000",
  });

  const [savedCases, setSavedCases] = useState<SimulationCase[]>([]);
  const [caseNameInput, setCaseNameInput] = useState('');
  const [isSaveMode, setIsSaveMode] = useState(false);

  // Load saved cases
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CASES);
    if (saved) {
      setSavedCases(JSON.parse(saved));
    }
  }, []);

  // Sync from props (Parent -> Child)
  useEffect(() => {
    if (sharedRate !== undefined && Number(params.annualRate) !== sharedRate) {
        setParams(prev => ({ ...prev, annualRate: sharedRate.toString() }));
    }
  }, [sharedRate]);

  useEffect(() => {
      // Sync initialMonthlyInvest if it differs significantly and we want to respect the parent's "latest"
      // However, user might be editing local state. 
      // We only force sync if the prop changes (which happens when updated in Dashboard).
      if (initialMonthlyInvest !== undefined && Number(params.monthlyInvest) !== initialMonthlyInvest) {
         // This check is a bit tricky because typing in input fires this. 
         // We rely on the fact that Parent updates mostly from Dashboard or Init.
         setParams(prev => ({ ...prev, monthlyInvest: initialMonthlyInvest.toString() }));
      }
  }, [initialMonthlyInvest]);

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));

    // Sync to Parent (Child -> Parent)
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
    // Also notify parent
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

  // Use Shared Service
  const { data, yearlyData, milestones, currentValues } = useMemo(() => {
    const pCash = Number(params.cash) || 0;
    const pInvest = Number(params.invest) || 0;
    const pMonthlyInvest = Number(params.monthlyInvest) || 0;
    const pAnnualRate = Number(params.annualRate) || 0;
    const pTargetAmount = Number(params.targetAmount) || 0;

    const result = calculateSimulation(pCash, pInvest, pMonthlyInvest, pAnnualRate);

    // Calculate specific target date locally since service does generic milestones
    // Or just iterate to find exact date for user's custom target
    let targetDate = null;
    let monthsToGoal = -1;
    
    // Find target in data
    const foundIdx = result.data.findIndex(d => d.total >= pTargetAmount);
    if (foundIdx >= 0) {
        targetDate = result.data[foundIdx].dateObj;
        monthsToGoal = foundIdx;
    }

    return {
        ...result,
        targetDate,
        monthsToGoal,
        currentValues: {
            target: pTargetAmount,
            cash: pCash
        }
    };
  }, [params]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Saved Cases Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
             <div className="text-sm font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Bookmark size={16} /> 保存したケース:
             </div>
             {savedCases.length === 0 && (
                 <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">なし</span>
             )}
             {savedCases.map(c => (
                 <button 
                    key={c.id}
                    onClick={() => handleLoadCase(c)}
                    className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded-full text-sm text-slate-600 transition-all shadow-sm whitespace-nowrap"
                 >
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-400 group-hover:text-blue-400">
                        (¥{(c.monthlyInvest/10000).toFixed(0)}万/{c.annualRate}%)
                    </span>
                    <div 
                        onClick={(e) => handleDeleteCase(c.id, e)}
                        className="ml-1 p-1 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                    >
                        <Trash2 size={12} />
                    </div>
                 </button>
             ))}
        </div>

        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="text-slate-600" size={24} />
                    シミュレーション設定
                </h2>
                {!isSaveMode ? (
                    <button 
                        onClick={() => setIsSaveMode(true)}
                        className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                    >
                        <Save size={16} /> ケースを保存
                    </button>
                ) : (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <input 
                            type="text" 
                            placeholder="ケース名 (例: 積極運用)" 
                            value={caseNameInput}
                            onChange={(e) => setCaseNameInput(e.target.value)}
                            className="text-sm border border-blue-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-200 w-48"
                            autoFocus
                        />
                        <button 
                            onClick={handleSaveCase}
                            disabled={!caseNameInput}
                            className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button 
                            onClick={() => setIsSaveMode(false)}
                            className="text-slate-400 hover:text-slate-600 p-1.5"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Base Assets (Static mostly) */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Wallet size={16} /> スタート時の資産
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">現金残高</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400">¥</span>
                                <input type="number" name="cash" value={params.cash} onChange={handleParamChange} className="w-full bg-white text-slate-900 pl-8 pr-3 py-2 border border-slate-300 rounded-lg outline-none font-medium" placeholder="0" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">投資信託 (現在額)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400">¥</span>
                                <input type="number" name="invest" value={params.invest} onChange={handleParamChange} className="w-full bg-white text-slate-900 pl-8 pr-3 py-2 border border-slate-300 rounded-lg outline-none font-medium" placeholder="0" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Strategy (Dynamic) */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        <TrendingUp size={16} /> 積立・運用プラン
                    </h3>
                    <div>
                        <label className="block text-xs text-blue-600 mb-1 font-medium">毎月の積立額</label>
                        <div className="relative">
                             <span className="absolute left-3 top-2.5 text-slate-400">¥</span>
                             <input type="number" name="monthlyInvest" value={params.monthlyInvest} onChange={handleParamChange} className="w-full bg-white text-slate-900 pl-8 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none font-bold text-lg" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-blue-600 mb-1 font-medium">想定年利 (%)</label>
                        <div className="relative">
                             <input type="number" name="annualRate" value={params.annualRate} onChange={handleParamChange} step="0.1" className="w-full bg-white text-slate-900 pl-3 pr-8 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none font-bold" placeholder="5.0" />
                             <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                        </div>
                    </div>
                </div>

                {/* 3. Goal */}
                <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <Target size={16} /> 目標ゴール
                    </h3>
                    <div>
                        <label className="block text-xs text-amber-700 mb-1 font-medium">目標資産額</label>
                        <div className="relative">
                             <span className="absolute left-3 top-2.5 text-slate-400">¥</span>
                             <input type="number" name="targetAmount" value={params.targetAmount} onChange={handleParamChange} className="w-full bg-white text-slate-900 pl-8 pr-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none font-bold text-lg" placeholder="10000000" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Result Summary */}
        {data.find(d => d.total >= Number(params.targetAmount)) ? (
             <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                    <Target size={120} />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="text-center md:text-left">
                        <div className="text-emerald-100 text-sm font-medium mb-1">目標達成時期</div>
                        <div className="text-4xl font-bold tracking-tight">
                            {/* Find the first point that exceeds target */}
                            {(() => {
                                const target = data.find(d => d.total >= Number(params.targetAmount));
                                return target ? (
                                    <>
                                    {target.dateObj.getFullYear()}年
                                    <span className="text-2xl ml-1 font-normal">{target.dateObj.getMonth() + 1}月</span>
                                    </>
                                ) : '---';
                            })()}
                        </div>
                    </div>
                    
                    <div className="h-16 w-px bg-white/20 hidden md:block"></div>
                    
                    <div className="text-center md:text-left">
                        <div className="text-emerald-100 text-sm font-medium mb-1">達成まで</div>
                        <div className="text-4xl font-bold tracking-tight">
                             {/* Re-calculate simple years/months for display */}
                             {(() => {
                                 const idx = data.findIndex(d => d.total >= Number(params.targetAmount));
                                 return idx >= 0 ? (
                                    <>
                                        {Math.floor(idx / 12)}
                                        <span className="text-lg font-normal ml-1 mr-2">年</span>
                                        {idx % 12}
                                        <span className="text-lg font-normal ml-1">ヶ月</span>
                                    </>
                                 ) : '---';
                             })()}
                        </div>
                    </div>

                    <div className="bg-white/10 px-5 py-3 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-xs text-emerald-100 mb-1">最終的な資産内訳</div>
                        {(() => {
                            const target = data.find(d => d.total >= Number(params.targetAmount)) || data[data.length - 1];
                            return (
                                <div className="flex gap-4 text-sm font-medium">
                                    <div>
                                        <span className="block text-xs opacity-70">投資元本</span>
                                        {Math.round(target.investPrincipal / target.total * 100)}%
                                    </div>
                                    <div>
                                        <span className="block text-xs opacity-70 text-amber-300">運用益</span>
                                        <span className="text-amber-300">
                                            {Math.round(target.investProfit / target.total * 100)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
             </div>
        ) : (
             <div className="bg-slate-100 rounded-xl p-6 text-slate-500 flex items-center gap-3 border border-slate-200">
                 <AlertCircle />
                 <span>30年以内に目標額には到達しません。積立額や年利を見直してみましょう。</span>
             </div>
        )}

        {/* Charts & Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                <h3 className="text-lg font-semibold text-slate-700 mb-6 flex items-center justify-between">
                    <span>資産推移グラフ</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        緑:現金 / 青:元本 / 黄:運用益
                    </span>
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="displayDate" 
                            tick={{fontSize: 10, fill: '#94a3b8'}}
                            interval={23} 
                        />
                        <YAxis 
                            tickFormatter={(value) => `${value / 10000}万`}
                            tick={{fontSize: 10, fill: '#94a3b8'}}
                            width={40}
                        />
                        <Tooltip 
                            formatter={(value: number, name: string) => {
                                if (name === 'total') return [`¥${value.toLocaleString()}`, '合計資産'];
                                if (name === 'investPrincipal') return [`¥${value.toLocaleString()}`, '投資元本'];
                                if (name === 'investProfit') return [`¥${value.toLocaleString()}`, '運用益'];
                                if (name === 'cash') return [`¥${value.toLocaleString()}`, '現金'];
                                return [value, name];
                            }}
                            labelStyle={{ color: '#64748b' }}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <ReferenceLine y={currentValues.target} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Goal', fill: '#ef4444', fontSize: 10 }} />
                        
                        <Area type="monotone" dataKey="investProfit" stackId="1" stroke="#f59e0b" fill="url(#colorProfit)" name="運用益" />
                        <Area type="monotone" dataKey="investPrincipal" stackId="1" stroke="#3b82f6" fill="url(#colorPrincipal)" name="投資元本" />
                        <Area type="monotone" dataKey="cash" stackId="1" stroke="#10b981" fill="url(#colorCash)" name="現金" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Annual Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                    <h3 className="text-lg font-semibold text-slate-700">年次推移リスト</h3>
                 </div>
                 <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-slate-50 text-slate-500 font-medium shadow-sm z-10">
                            <tr>
                                <th className="px-4 py-3">経過</th>
                                <th className="px-4 py-3">資産総額</th>
                                <th className="px-4 py-3 text-blue-600">投資元本</th>
                                <th className="px-4 py-3 text-amber-600">運用益</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {yearlyData.map((row) => (
                                <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-600">
                                        {row.yearIndex}年後 <span className="text-xs text-slate-400 block font-normal">{row.displayYear}年</span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                        ¥{(row.total / 10000).toFixed(0)}万
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        ¥{(row.investPrincipal / 10000).toFixed(0)}万
                                    </td>
                                    <td className="px-4 py-3 text-amber-600 font-medium">
                                        +¥{(row.investProfit / 10000).toFixed(0)}万
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default Simulator;