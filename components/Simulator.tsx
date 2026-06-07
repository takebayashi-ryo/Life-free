import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calculator, Target, TrendingUp, AlertCircle, Wallet, Save, Trash2, Bookmark, ChevronRight, X, Plus, Baby, Sparkles } from 'lucide-react';
import { SimulationCase, UserProfile } from '../types';
import { calculateSimulation, SimulationPhase } from '../services/simulationService';

const STORAGE_KEY_PHASES = 'lifefree_sim_phases_v1';
const STORAGE_KEY_USE_PHASES = 'lifefree_sim_use_phases_v1';

const CHILD_STAGES: Array<{ label: string; startAge: number; endAge: number; suggestedMonthly: number }> = [
  { label: '保育園期',  startAge: 0,  endAge: 5,  suggestedMonthly: 80000 },
  { label: '小学生期',  startAge: 6,  endAge: 12, suggestedMonthly: 120000 },
  { label: '中学生期',  startAge: 13, endAge: 15, suggestedMonthly: 100000 },
  { label: '高校生期',  startAge: 16, endAge: 18, suggestedMonthly: 80000 },
  { label: '大学生期',  startAge: 19, endAge: 22, suggestedMonthly: 30000 },
];
const POST_INDEPENDENCE = { label: '独立後', suggestedMonthly: 150000 };

const generatePhasesFromProfile = (profile: UserProfile): SimulationPhase[] => {
  if (!profile.children || profile.children.length === 0) return [];

  const currentYear = new Date().getFullYear();
  // Youngest child's age determines the longest dependency horizon
  const youngestAge = Math.min(
    ...profile.children.map(c => currentYear - c.birthYear)
  );

  const phases: SimulationPhase[] = [];

  CHILD_STAGES.forEach((stage, idx) => {
    if (youngestAge > stage.endAge) return;
    const startYearOffset = Math.max(0, stage.startAge - youngestAge);
    phases.push({
      id: `auto-${idx}`,
      startYearOffset,
      monthlyInvest: stage.suggestedMonthly,
      label: stage.label,
    });
  });

  const independenceOffset = Math.max(0, 23 - youngestAge);
  phases.push({
    id: 'auto-independent',
    startYearOffset: independenceOffset,
    monthlyInvest: POST_INDEPENDENCE.suggestedMonthly,
    label: POST_INDEPENDENCE.label,
  });

  return phases;
};

interface SimulatorProps {
  initialCash: number;
  initialInvest: number;
  initialMonthlyInvest: number;
  sharedRate?: number;
  onSharedChange?: (rate: number, monthlyInvest: number) => void;
  isMasked?: boolean;
  profile?: UserProfile;
}

const STORAGE_KEY_CASES = 'assetflow_sim_cases_v1';
const MASK = '✳︎✳︎✳︎✳︎✳︎✳︎';

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

const Simulator: React.FC<SimulatorProps> = ({
  initialCash, initialInvest, initialMonthlyInvest, sharedRate, onSharedChange, isMasked = false, profile,
}) => {
  const isDark = useIsDark();

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

  const [usePhases, setUsePhases] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_USE_PHASES) === '1';
  });
  const [phases, setPhases] = useState<SimulationPhase[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PHASES);
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', startYearOffset: 0, monthlyInvest: 80000, label: '保育園期' },
      { id: '2', startYearOffset: 5, monthlyInvest: 120000, label: '小学生期' },
      { id: '3', startYearOffset: 13, monthlyInvest: 60000, label: '中高生期' },
      { id: '4', startYearOffset: 19, monthlyInvest: 30000, label: '大学生期' },
      { id: '5', startYearOffset: 23, monthlyInvest: 150000, label: '独立後' },
    ];
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CASES);
    if (saved) setSavedCases(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PHASES, JSON.stringify(phases));
  }, [phases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USE_PHASES, usePhases ? '1' : '0');
  }, [usePhases]);

  const handlePhaseChange = (id: string, field: keyof SimulationPhase, value: string | number) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddPhase = () => {
    const sorted = [...phases].sort((a, b) => a.startYearOffset - b.startYearOffset);
    const lastOffset = sorted.length > 0 ? sorted[sorted.length - 1].startYearOffset : 0;
    const newPhase: SimulationPhase = {
      id: Date.now().toString(),
      startYearOffset: lastOffset + 5,
      monthlyInvest: 50000,
      label: '新フェーズ',
    };
    setPhases(prev => [...prev, newPhase]);
  };

  const handleRemovePhase = (id: string) => {
    setPhases(prev => prev.filter(p => p.id !== id));
  };

  const handleGenerateFromProfile = () => {
    if (!profile) return;
    const generated = generatePhasesFromProfile(profile);
    if (generated.length === 0) return;
    setPhases(generated);
  };

  const profileHasChildren = profile && profile.children && profile.children.length > 0;

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
    if (onSharedChange) onSharedChange(c.annualRate, c.monthlyInvest);
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

    const investArg = usePhases && phases.length > 0
      ? phases.map(p => ({ ...p, monthlyInvest: Number(p.monthlyInvest) || 0, startYearOffset: Number(p.startYearOffset) || 0 }))
      : pMonthlyInvest;

    const result = calculateSimulation(pCash, pInvest, investArg, pAnnualRate);
    return { ...result, currentValues: { target: pTargetAmount, cash: pCash } };
  }, [params, usePhases, phases]);

  const inputClass = "w-full bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-transparent outline-none transition-colors text-sm";
  const labelClass = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1 font-medium";
  const cardClass = "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl";

  const targetReached = data.find(d => d.total >= Number(params.targetAmount));

  const chartColors = {
    grid: isDark ? '#27272a' : '#e4e4e7',
    axis: isDark ? '#71717a' : '#a1a1aa',
    profit: '#f59e0b',
    principal: isDark ? '#60a5fa' : '#3b82f6',
    cash: '#10b981',
    target: '#ef4444',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDark ? '#f4f4f5' : '#18181b',
  };

  return (
    <div className="space-y-4">
      {/* Saved Cases */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="text-xs font-medium text-zinc-500 whitespace-nowrap flex items-center gap-1">
          <Bookmark size={13} /> 保存ケース
        </div>
        {savedCases.length === 0 && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-full">なし</span>
        )}
        {savedCases.map(c => (
          <button
            key={c.id}
            onClick={() => handleLoadCase(c)}
            className="group flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 px-3 py-1.5 rounded-full text-xs text-zinc-700 dark:text-zinc-300 transition-all whitespace-nowrap"
          >
            <span>{c.name}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {isMasked ? `(${MASK})` : `(¥${(c.monthlyInvest / 10000).toFixed(0)}万/${c.annualRate}%)`}
            </span>
            <div
              onClick={(e) => handleDeleteCase(c.id, e)}
              className="ml-0.5 p-0.5 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-500 rounded-full transition-colors"
            >
              <Trash2 size={11} />
            </div>
          </button>
        ))}
      </div>

      {/* Configuration */}
      <div className={`${cardClass} p-5`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Calculator className="text-zinc-500" size={16} />
            シミュレーション設定
          </h2>
          {!isSaveMode ? (
            <button
              onClick={() => setIsSaveMode(true)}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
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
                className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-zinc-400 w-32 text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
              <button
                onClick={handleSaveCase}
                disabled={!caseNameInput}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setIsSaveMode(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 p-1.5">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
            <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-3">
              <Wallet size={13} className="text-zinc-500" /> スタート時の資産
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>現金残高</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                  <input type="number" name="cash" value={params.cash} onChange={handleParamChange} className={inputClass} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>投資信託</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                  <input type="number" name="invest" value={params.invest} onChange={handleParamChange} className={inputClass} placeholder="0" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-zinc-500" /> 積立・運用プラン
              </h3>
              <button
                type="button"
                onClick={() => setUsePhases(!usePhases)}
                className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border transition-colors ${
                  usePhases
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
                title="ライフステージごとに積立額を変える"
              >
                <Baby size={11} />
                ライフステージ別
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              {!usePhases && (
                <div>
                  <label className={labelClass}>毎月の積立額</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                    <input type="number" name="monthlyInvest" value={params.monthlyInvest} onChange={handleParamChange} className={`${inputClass} font-bold`} placeholder="0" />
                  </div>
                </div>
              )}
              <div className={usePhases ? 'col-span-2' : ''}>
                <label className={labelClass}>想定年利 (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="annualRate"
                    value={params.annualRate}
                    onChange={handleParamChange}
                    step="0.1"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-3 pr-7 py-2 focus:ring-2 focus:ring-zinc-400 outline-none font-bold text-sm"
                    placeholder="6.0"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">%</span>
                </div>
              </div>
            </div>

            {usePhases && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">フェーズ別積立額</span>
                  <div className="flex items-center gap-3">
                    {profileHasChildren && (
                      <button
                        type="button"
                        onClick={handleGenerateFromProfile}
                        className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-0.5"
                        title="プロフィールの子供情報からフェーズを自動生成"
                      >
                        <Sparkles size={11} /> プロフィールから生成
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddPhase}
                      className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-0.5"
                    >
                      <Plus size={11} /> 追加
                    </button>
                  </div>
                </div>
                {!profileHasChildren && (
                  <p className="text-[10px] text-zinc-500 mb-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5">
                    💡 設定タブで子供を登録すると、年齢から自動でフェーズを生成できます
                  </p>
                )}
                <div className="space-y-1.5">
                  {[...phases].sort((a, b) => a.startYearOffset - b.startYearOffset).map(phase => (
                    <div key={phase.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={phase.label}
                        onChange={(e) => handlePhaseChange(phase.id, 'label', e.target.value)}
                        className="w-20 text-[11px] bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zinc-400"
                        placeholder="名前"
                      />
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">開始</span>
                      <input
                        type="number"
                        value={phase.startYearOffset}
                        onChange={(e) => handlePhaseChange(phase.id, 'startYearOffset', Number(e.target.value))}
                        className="w-10 text-[11px] bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-zinc-400 text-right"
                        min={0}
                      />
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">年後</span>
                      <span className="text-[10px] text-zinc-500 ml-auto">¥</span>
                      <input
                        type="number"
                        value={phase.monthlyInvest}
                        onChange={(e) => handlePhaseChange(phase.id, 'monthlyInvest', Number(e.target.value))}
                        className="w-20 text-[11px] bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zinc-400 text-right font-semibold"
                      />
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">/月</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhase(phase.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                        title="削除"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                  例) 0年後=¥80,000（保育園期）→ 5年後=¥120,000（小学生期）→ 13年後=¥60,000（中高生期）<br/>
                  各フェーズは次のフェーズ開始まで継続します
                </p>
              </div>
            )}
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
            <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-3">
              <Target size={13} className="text-zinc-500" /> 目標ゴール
            </h3>
            <div>
              <label className={labelClass}>目標資産額</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                <input type="number" name="targetAmount" value={params.targetAmount} onChange={handleParamChange} className={`${inputClass} font-bold`} placeholder="10000000" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      {targetReached ? (
        <div className="bg-zinc-950 dark:bg-zinc-900 dark:border dark:border-zinc-800 rounded-2xl p-5 text-white">
          <div className="text-xs text-zinc-400 font-medium mb-1">目標達成時期</div>
          <div className="text-3xl font-extrabold tracking-tight mb-3">
            {targetReached.dateObj.getFullYear()}年
            <span className="text-xl ml-1 font-bold">{targetReached.dateObj.getMonth() + 1}月</span>
          </div>
          <div className="flex gap-6 text-xs pt-3 border-t border-zinc-800">
            <div>
              <span className="block text-zinc-500 mb-0.5">達成まで</span>
              <span className="font-semibold">
                {(() => {
                  const idx = data.findIndex(d => d.total >= Number(params.targetAmount));
                  return idx >= 0 ? `${Math.floor(idx / 12)}年${idx % 12}ヶ月` : '---';
                })()}
              </span>
            </div>
            <div>
              <span className="block text-zinc-500 mb-0.5">元本比率</span>
              <span className="font-semibold">{Math.round(targetReached.investPrincipal / targetReached.total * 100)}%</span>
            </div>
            <div>
              <span className="block text-zinc-500 mb-0.5">運用益比率</span>
              <span className="font-semibold text-amber-400">{Math.round(targetReached.investProfit / targetReached.total * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${cardClass} p-4 text-zinc-500 dark:text-zinc-400 flex items-center gap-3 text-sm`}>
          <AlertCircle size={18} className="text-zinc-400 flex-shrink-0" />
          <span>30年以内に目標額には到達しません。積立額や年利を見直してみましょう。</span>
        </div>
      )}

      {/* Chart */}
      <div className={`${cardClass} p-5 h-[340px]`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">資産推移グラフ</h3>
          <span className="text-[10px] text-zinc-500">緑:現金 / 青:元本 / 黄:運用益</span>
        </div>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.profit} stopOpacity={0.6} />
                <stop offset="95%" stopColor={chartColors.profit} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.principal} stopOpacity={0.6} />
                <stop offset="95%" stopColor={chartColors.principal} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.cash} stopOpacity={0.6} />
                <stop offset="95%" stopColor={chartColors.cash} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="displayDate" tick={{ fontSize: 9, fill: chartColors.axis }} interval={23} />
            <YAxis tickFormatter={(value) => `${value / 10000}万`} tick={{ fontSize: 9, fill: chartColors.axis }} width={40} />
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
              contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: '8px', border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText }}
              labelStyle={{ color: chartColors.axis }}
            />
            <ReferenceLine y={currentValues.target} stroke={chartColors.target} strokeDasharray="3 3" label={{ position: 'right', value: 'Goal', fill: chartColors.target, fontSize: 9 }} />

            <Area type="monotone" dataKey="investProfit" stackId="1" stroke={chartColors.profit} fill="url(#colorProfit)" name="運用益" />
            <Area type="monotone" dataKey="investPrincipal" stackId="1" stroke={chartColors.principal} fill="url(#colorPrincipal)" name="投資元本" />
            <Area type="monotone" dataKey="cash" stackId="1" stroke={chartColors.cash} fill="url(#colorCash)" name="現金" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Annual Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">年次推移</h3>
        </div>
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 text-zinc-500 text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">経過</th>
                <th className="px-4 py-2.5 font-medium">資産総額</th>
                <th className="px-4 py-2.5 font-medium">元本</th>
                <th className="px-4 py-2.5 font-medium text-amber-600 dark:text-amber-400">運用益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {yearlyData.map((row) => (
                <tr key={row.month} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400 text-xs">
                    {row.yearIndex}年後
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">{row.displayYear}年</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                    {isMasked ? MASK : `¥${(row.total / 10000).toFixed(0)}万`}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 text-xs">
                    {isMasked ? MASK : `¥${(row.investPrincipal / 10000).toFixed(0)}万`}
                  </td>
                  <td className="px-4 py-2.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
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
