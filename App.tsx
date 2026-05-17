import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Settings, Wallet, Target, Calculator,
  Trash2, Send, User, Bot, Eye, EyeOff,
  Home, BookOpen, BarChart3, ChevronRight, Edit3, PiggyBank,
  Copy, TrendingUp, TrendingDown, Sun, Moon, Smartphone, Download
} from 'lucide-react';
import { MonthlyRecord, FinancialConfig, DEFAULT_CONFIG } from './types';
import AnalysisChart from './components/AnalysisChart';
import MonthEditor from './components/MonthEditor';
import Simulator from './components/Simulator';
import { calculateSimulation } from './services/simulationService';
import { loadRecords, upsertRecord, deleteRecord } from './services/dataService';
import { generateDashboardAnswer } from './services/geminiService';

const STORAGE_KEY_CONFIG = 'assetflow_config_v1';
const STORAGE_KEY_THEME = 'lifefree_theme_v1';

type Tab = 'home' | 'records' | 'simulator' | 'analysis' | 'settings';
type ThemeMode = 'light' | 'dark' | 'auto';

const MASK = '✳︎✳︎✳︎✳︎✳︎✳︎';

// Increment YYYY-MM by one month
const incrementMonth = (id: string): string => {
  const [y, m] = id.split('-').map(Number);
  const next = new Date(y, m, 1); // m is 1-indexed in id, so this advances by 1
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

function applyTheme(mode: ThemeMode) {
  const isDark = mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [config, setConfig] = useState<FinancialConfig>(DEFAULT_CONFIG);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyRecord | undefined>(undefined);
  const [prefillRecord, setPrefillRecord] = useState<MonthlyRecord | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [simRateStr, setSimRateStr] = useState("6.0");
  const [simMonthlyInvestStr, setSimMonthlyInvestStr] = useState("0");

  const [aiQuestions, setAiQuestions] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [isMasked, setIsMasked] = useState(false);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    return stored || 'auto';
  });

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(themeMode);
    localStorage.setItem(STORAGE_KEY_THEME, themeMode);

    if (themeMode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('auto');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [themeMode]);

  useEffect(() => {
    setIsLoadingRecords(true);
    loadRecords().then(loadedRecords => {
      setRecords(loadedRecords);
      setIsLoadingRecords(false);
    }).catch(() => {
      setIsLoadingRecords(false);
    });

    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    if (!isEditorOpen) {
      setIsSaving(false);
      setEditingRecord(undefined);
      setPrefillRecord(undefined);
    }
  }, [isEditorOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.id.localeCompare(b.id));
  }, [records]);

  const historyData = useMemo(() => {
    let currentCash = config.initialCash;
    let currentInvest = 0;

    return sortedRecords.map(record => {
      if (record.totalCashSnapshot !== undefined) {
        currentCash = record.totalCashSnapshot;
      } else {
        currentCash += (record.calculatedCashFlow || 0);
      }

      if (record.totalInvestmentSnapshot !== undefined) {
        currentInvest = record.totalInvestmentSnapshot;
      } else {
        currentInvest += record.investmentTrust;
      }

      return {
        ...record,
        calculatedTotalCash: currentCash,
        calculatedTotalInvest: currentInvest
      };
    });
  }, [sortedRecords, config.initialCash]);

  const latestHistory = historyData.length > 0 ? historyData[historyData.length - 1] : null;
  const prevHistory = historyData.length > 1 ? historyData[historyData.length - 2] : null;

  const currentCash = isLoadingRecords
    ? config.initialCash
    : (latestHistory ? latestHistory.calculatedTotalCash : config.initialCash);
  const currentInvestTotal = latestHistory ? latestHistory.calculatedTotalInvest : 0;
  const totalAssets = currentCash + currentInvestTotal;

  const lastMonthTotal = prevHistory
    ? prevHistory.calculatedTotalCash + prevHistory.calculatedTotalInvest
    : null;
  const monthOverMonthDiff = lastMonthTotal !== null ? totalAssets - lastMonthTotal : null;
  const monthOverMonthPct = lastMonthTotal !== null && lastMonthTotal > 0
    ? (monthOverMonthDiff! / lastMonthTotal) * 100
    : null;

  useEffect(() => {
    if (simMonthlyInvestStr === "0") {
      if (latestHistory) {
        setSimMonthlyInvestStr(latestHistory.investmentTrust.toString());
      } else {
        setSimMonthlyInvestStr((config.targetInvestmentBase + config.targetInvestmentAddon).toString());
      }
    }
  }, [latestHistory, config]);

  const simRate = parseFloat(simRateStr) || 0;
  const simMonthlyInvest = parseFloat(simMonthlyInvestStr) || 0;

  const simulationResult = useMemo(() => {
    return calculateSimulation(currentCash, currentInvestTotal, simMonthlyInvest, simRate);
  }, [currentCash, currentInvestTotal, simMonthlyInvest, simRate]);

  const cashGap = config.targetCash - currentCash;

  const formatYen = (value: number) => {
    if (isMasked) return MASK;
    return `¥${value.toLocaleString()}`;
  };

  const monthsToGoal = useMemo(() => {
    if (cashGap <= 0) return 0;
    const recentRecords = sortedRecords.slice(-3);
    if (recentRecords.length === 0) return -1;
    const avgFlow = recentRecords.reduce((sum, r) => sum + (r.calculatedCashFlow || 0), 0) / recentRecords.length;
    if (avgFlow <= 0) return -1;
    return Math.ceil(cashGap / avgFlow);
  }, [cashGap, sortedRecords]);

  const recentAvgCashFlow = useMemo(() => {
    const recentRecords = sortedRecords.slice(-6);
    if (recentRecords.length === 0) return 0;
    return recentRecords.reduce((sum, r) => sum + (r.calculatedCashFlow || 0), 0) / recentRecords.length;
  }, [sortedRecords]);

  const handleSaveRecord = async (record: MonthlyRecord) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const result = await upsertRecord(record);
      if (result.error || !result.data) {
        alert(`保存に失敗しました: ${result.error || 'データなし'}`);
        return;
      }
      setIsLoadingRecords(true);
      const reloaded = await loadRecords();
      setRecords(reloaded);
      setIsLoadingRecords(false);
      setIsEditorOpen(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`保存中にエラーが発生しました: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: MonthlyRecord) => {
    if (isSaving) return;
    setIsSaving(false);
    const latest = records.find(r => r.id === record.id) || record;
    setEditingRecord(latest);
    setPrefillRecord(undefined);
    setIsEditorOpen(true);
  };

  const handleDelete = async (record: MonthlyRecord) => {
    if (window.confirm(`「${record.id}」の記録を削除しますか？`)) {
      const success = await deleteRecord(record.id);
      if (success) {
        setRecords(prev => prev.filter(r => r.id !== record.id));
      } else {
        alert('削除に失敗しました。');
      }
    }
  };

  const handleAddNew = () => {
    if (isSaving) return;
    setIsSaving(false);
    setEditingRecord(undefined);
    setPrefillRecord(undefined);
    setIsEditorOpen(true);
  };

  const handleAddFromPrevious = () => {
    if (isSaving || sortedRecords.length === 0) return;
    const latest = sortedRecords[sortedRecords.length - 1];
    setIsSaving(false);
    setEditingRecord(undefined);
    setPrefillRecord(latest);
    setIsEditorOpen(true);
  };

  const handleExportCSV = () => {
    if (historyData.length === 0) return;

    const headers = [
      '対象月', '給与収入', '副業収入', '育児手当', '保育料',
      'カード支払', 'お小遣い', '投資購入額', '月末現金残高',
      '月末投資評価額', '現金増減', '総資産', 'メモ'
    ];

    const escape = (val: any): string => {
      const s = val === null || val === undefined ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = historyData.map(r => [
      r.id,
      r.salaryIncome,
      r.sideHustleIncome,
      r.childAllowanceIncome,
      r.nurseryExpense,
      r.creditCardExpense,
      r.pocketMoneyExpense,
      r.investmentTrust,
      r.calculatedTotalCash,
      r.calculatedTotalInvest,
      r.calculatedCashFlow ?? 0,
      r.calculatedTotalCash + r.calculatedTotalInvest,
      r.note || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(escape).join(','))
      .join('\r\n');

    // BOM for Excel UTF-8 compatibility
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifefree_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPreviousRecord = (targetId?: string) => {
    if (!targetId) {
      return sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : undefined;
    }
    const index = sortedRecords.findIndex(r => r.id === targetId);
    if (index > 0) return sortedRecords[index - 1];
    return undefined;
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const question = currentQuestion.trim();
    if (!question || isGeneratingAnswer) return;

    const newQuestion = { question, answer: '' };
    setAiQuestions(prev => [...prev, newQuestion]);
    setCurrentQuestion('');
    setIsGeneratingAnswer(true);

    try {
      const answer = await generateDashboardAnswer({
        config, currentCash, currentInvestTotal, historyData,
        monthsToGoal, cashGap,
        simulationMilestones: simulationResult.milestones,
        recentAvgCashFlow, question,
      });
      setAiQuestions(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer };
        return updated;
      });
    } catch (error) {
      setAiQuestions(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer: 'AI回答の取得中にエラーが発生しました。' };
        return updated;
      });
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  const handleConfigChange = (field: keyof FinancialConfig, value: string) => {
    const num = parseFloat(value) || 0;
    setConfig(prev => ({ ...prev, [field]: num }));
  };

  // Common classes
  const cardClass = "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl";
  const subtleText = "text-zinc-500 dark:text-zinc-500";
  const primaryText = "text-zinc-900 dark:text-zinc-100";

  // ===== Sub Renderers =====
  const renderHome = () => {
    const cashProgress = Math.min((currentCash / config.targetCash) * 100, 100);
    const recentRecords = historyData.slice(-3).reverse();

    return (
      <div className="space-y-4">
        {/* Hero Total Assets — flat, single dark accent */}
        <div className="rounded-3xl bg-zinc-950 dark:bg-zinc-900 dark:border dark:border-zinc-800 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">総資産</span>
            <Wallet size={18} className="text-zinc-500" />
          </div>
          <div className="text-[40px] leading-none font-bold tracking-tight mb-4">
            {formatYen(totalAssets)}
          </div>

          {/* Month over month */}
          {monthOverMonthDiff !== null && !isMasked && (
            <div className="flex items-center gap-1.5 mb-5 text-sm">
              {monthOverMonthDiff >= 0 ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-rose-400" />
              )}
              <span className={monthOverMonthDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {monthOverMonthDiff > 0 ? '+' : ''}{monthOverMonthDiff.toLocaleString()}
                {monthOverMonthPct !== null && (
                  <span className="text-xs ml-1 opacity-80">
                    ({monthOverMonthPct > 0 ? '+' : ''}{monthOverMonthPct.toFixed(1)}%)
                  </span>
                )}
              </span>
              <span className="text-xs text-zinc-500 ml-1">先月比</span>
            </div>
          )}
          {monthOverMonthDiff === null && <div className="mb-5"></div>}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
            <div>
              <div className="text-xs text-zinc-500 mb-1">現金残高</div>
              <div className="text-base font-semibold">{formatYen(currentCash)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500 mb-1">投資評価額</div>
              <div className="text-base font-semibold">{formatYen(currentInvestTotal)}</div>
            </div>
          </div>
        </div>

        {/* Cash Goal Progress */}
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={16} className={subtleText} />
              <span className={`text-sm font-medium ${primaryText}`}>現金目標</span>
              <span className={`text-xs ${subtleText}`}>¥{(config.targetCash / 10000).toFixed(0)}万</span>
            </div>
            <span className={`text-xs ${subtleText}`}>
              {isMasked ? MASK : `${Math.round(cashProgress)}%`}
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${currentCash >= config.targetCash ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-zinc-100'}`}
              style={{ width: `${cashProgress}%` }}
            ></div>
          </div>
          <div className="text-xs">
            {cashGap > 0 ? (
              <span className={subtleText}>
                {isMasked ? `あと ${MASK}` : `あと ${formatYen(cashGap)}`}
                {!isMasked && monthsToGoal > 0 && ` · 約${monthsToGoal}ヶ月`}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">目標達成</span>
            )}
          </div>
        </div>

        {/* Recent Records */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <span className={`text-sm font-medium ${primaryText}`}>最近の記録</span>
            <button
              onClick={() => setActiveTab('records')}
              className={`text-xs ${subtleText} hover:${primaryText} flex items-center gap-0.5`}
            >
              すべて見る<ChevronRight size={12} />
            </button>
          </div>
          {recentRecords.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className={`text-sm ${subtleText} mb-4`}>まだ記録がありません</div>
              <button
                onClick={handleAddNew}
                className="text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} />最初の記録を追加
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentRecords.map((record, idx) => {
                const flow = record.calculatedCashFlow || 0;
                // Calculate this record's month-over-month
                const recordIdx = historyData.findIndex(h => h.id === record.id);
                const prevRecord = recordIdx > 0 ? historyData[recordIdx - 1] : null;
                const prevTotal = prevRecord
                  ? prevRecord.calculatedTotalCash + prevRecord.calculatedTotalInvest
                  : null;
                const currTotal = record.calculatedTotalCash + record.calculatedTotalInvest;
                const diff = prevTotal !== null ? currTotal - prevTotal : null;

                return (
                  <button
                    key={record.id}
                    onClick={() => handleEdit(record)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div>
                      <div className={`text-sm font-semibold ${primaryText} mb-0.5`}>{record.id}</div>
                      <div className={`text-xs ${subtleText}`}>
                        {isMasked ? MASK : `総資産 ${formatYen(currTotal)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {diff !== null && !isMasked && (
                        <span className={`text-sm font-semibold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Strategy Phase (simplified, single card) */}
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className={subtleText} />
            <span className={`text-xs ${subtleText}`}>現在の戦略</span>
          </div>
          {currentCash < config.targetCash ? (
            <>
              <div className={`text-base font-bold ${primaryText} mb-1`}>現金優先フェーズ</div>
              <p className={`text-sm ${subtleText} leading-relaxed`}>
                生活防衛資金が{(config.targetCash / 10000).toFixed(0)}万円に達するまで、余剰資金は現金プールへ
              </p>
            </>
          ) : (
            <>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-1">投資最大化フェーズ</div>
              <p className={`text-sm ${subtleText} leading-relaxed`}>
                現金目標達成！余剰資金を積極的に投資へ
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRecords = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${primaryText}`}>月次レポート</h2>
            <p className={`text-xs ${subtleText} mt-1`}>{historyData.length}件の記録</p>
          </div>
          <div className="flex gap-2">
            {sortedRecords.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm p-2 rounded-xl font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  title="全記録をCSVでダウンロード"
                  aria-label="CSVダウンロード"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handleAddFromPrevious}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  title="前月のデータをコピーして新規作成"
                >
                  <Copy size={14} />
                  前月から
                </button>
              </>
            )}
            <button
              onClick={handleAddNew}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} />
              追加
            </button>
          </div>
        </div>

        {historyData.length === 0 ? (
          <div className={`${cardClass} py-16 text-center`}>
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={22} className="text-zinc-400" />
            </div>
            <div className={`text-sm ${subtleText} mb-4`}>まだ記録がありません</div>
            <button
              onClick={handleAddNew}
              className="text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={14} />最初の記録を追加
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {historyData.slice().reverse().map((record, idx) => {
              const income = record.salaryIncome + record.sideHustleIncome + record.childAllowanceIncome;
              const expense = record.nurseryExpense + record.creditCardExpense + record.pocketMoneyExpense;
              const flow = record.calculatedCashFlow || 0;

              const recordIdx = historyData.findIndex(h => h.id === record.id);
              const prevRecord = recordIdx > 0 ? historyData[recordIdx - 1] : null;
              const prevTotal = prevRecord
                ? prevRecord.calculatedTotalCash + prevRecord.calculatedTotalInvest
                : null;
              const currTotal = record.calculatedTotalCash + record.calculatedTotalInvest;
              const diff = prevTotal !== null ? currTotal - prevTotal : null;
              const [yearStr, monthStr] = record.id.split('-');

              return (
                <div key={record.id} className={`${cardClass} overflow-hidden`}>
                  {/* Header band */}
                  <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40">
                    <div>
                      <div className={`text-lg font-bold tracking-tight ${primaryText} leading-none`}>
                        {Number(monthStr)}<span className="text-sm font-medium">月</span>
                        <span className={`ml-1.5 text-xs font-medium ${subtleText}`}>{yearStr}</span>
                      </div>
                      {diff !== null && !isMasked ? (
                        <div className={`text-xs mt-1.5 font-semibold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {diff > 0 ? '+' : ''}{diff.toLocaleString()} <span className={`${subtleText} font-normal`}>先月比</span>
                        </div>
                      ) : (
                        <div className={`text-xs mt-1.5 ${subtleText}`}>初回記録</div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 -mr-1">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="編集"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className={`${subtleText} mb-0.5`}>収入</div>
                        <div className={`font-semibold ${primaryText}`}>{formatYen(income)}</div>
                      </div>
                      <div>
                        <div className={`${subtleText} mb-0.5`}>支出</div>
                        <div className={`font-semibold ${primaryText}`}>{formatYen(expense)}</div>
                      </div>
                      <div>
                        <div className={`${subtleText} mb-0.5`}>投資</div>
                        <div className={`font-semibold ${primaryText}`}>{formatYen(record.investmentTrust)}</div>
                      </div>
                      <div>
                        <div className={`${subtleText} mb-0.5`}>現金増減</div>
                        <div className={`font-semibold ${flow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isMasked ? MASK : `${flow > 0 ? '+' : ''}${flow.toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer balance */}
                  <div className="px-5 py-3 bg-zinc-50/60 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between text-xs">
                    <span className={subtleText}>月末残高</span>
                    <div className={`flex gap-3 ${primaryText}`}>
                      <span>現金 <span className="font-semibold">{formatYen(record.calculatedTotalCash)}</span></span>
                      <span>投資 <span className="font-semibold">{formatYen(record.calculatedTotalInvest)}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAnalysis = () => {
    return (
      <div className="space-y-4">
        <div>
          <h2 className={`text-xl font-bold ${primaryText}`}>分析 & AI相談</h2>
          <p className={`text-xs ${subtleText} mt-1`}>資産推移とAIアドバイス</p>
        </div>

        <AnalysisChart
          data={sortedRecords}
          config={config}
          accumulatedCash={historyData.map(h => h.calculatedTotalCash)}
          accumulatedInvest={historyData.map(h => h.calculatedTotalInvest)}
        />

        {/* AI Q&A */}
        <div className={`${cardClass} p-5`}>
          <div className="mb-4">
            <h3 className={`text-sm font-bold ${primaryText}`}>AI質問応答</h3>
            <p className={`text-[10px] ${subtleText} mt-0.5`}>ダッシュボード全体の情報を元に回答</p>
          </div>

          <div className="mb-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
            {aiQuestions.length === 0 && !isGeneratingAnswer && (
              <div className={`text-center py-6 text-xs ${subtleText}`}>
                下のフォームから質問を入力してください
              </div>
            )}
            {aiQuestions.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-white dark:text-zinc-900" />
                  </div>
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl">
                    <p className={`text-sm ${primaryText} whitespace-pre-wrap`}>{item.question}</p>
                  </div>
                </div>
                {item.answer && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={13} className="text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl">
                      <p className={`text-sm ${primaryText} leading-relaxed whitespace-pre-wrap`}>{item.answer}</p>
                    </div>
                  </div>
                )}
                {!item.answer && isGeneratingAnswer && idx === aiQuestions.length - 1 && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={13} className="text-zinc-500" />
                    </div>
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl">
                      <div className={`flex items-center gap-2 ${subtleText}`}>
                        <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">回答生成中...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              type="text"
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              placeholder="例: 投資を増やしたほうがいいですか？"
              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-transparent"
              disabled={isGeneratingAnswer}
            />
            <button
              type="submit"
              disabled={!currentQuestion.trim() || isGeneratingAnswer}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const fields: { key: keyof FinancialConfig; label: string; help?: string }[] = [
      { key: 'baseSalary', label: '基本給（手取り）', help: '月の給与手取り額' },
      { key: 'nurseryFee', label: '保育料', help: '月額' },
      { key: 'defaultCreditCard', label: 'カード支払（標準）' },
      { key: 'pocketMoneyTarget', label: 'お小遣い目標上限' },
      { key: 'childAllowance', label: '育児手当' },
      { key: 'initialCash', label: '初期現金残高' },
      { key: 'targetCash', label: '現金目標額' },
      { key: 'targetInvestmentBase', label: '投資基本額' },
      { key: 'targetInvestmentAddon', label: '投資追加額' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h2 className={`text-xl font-bold ${primaryText}`}>設定</h2>
        </div>

        {/* Theme */}
        <div className={`${cardClass} p-5`}>
          <div className={`text-[11px] font-semibold ${subtleText} mb-3 uppercase tracking-wider`}>テーマ</div>
          <div className="flex gap-2">
            {([
              { id: 'light', label: 'ライト', icon: Sun },
              { id: 'dark', label: 'ダーク', icon: Moon },
              { id: 'auto', label: '自動', icon: Smartphone },
            ] as const).map(opt => {
              const Icon = opt.icon;
              const isActive = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setThemeMode(opt.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy */}
        <div className={`${cardClass} p-5`}>
          <div className={`text-[11px] font-semibold ${subtleText} mb-3 uppercase tracking-wider`}>プライバシー</div>
          <button
            onClick={() => setIsMasked(prev => !prev)}
            className="w-full flex items-center justify-between py-1 -mx-1 px-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {isMasked ? <EyeOff size={18} className={subtleText} /> : <Eye size={18} className={subtleText} />}
              <div className="text-left">
                <div className={`text-sm font-medium ${primaryText}`}>金額のマスキング</div>
                <div className={`text-xs ${subtleText}`}>金額を伏せ字で表示</div>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${isMasked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 ${isMasked ? 'bg-white dark:bg-zinc-900' : 'bg-white'} rounded-full transition-transform shadow ${isMasked ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </div>
          </button>
        </div>

        {/* Financial Config */}
        <div className={`${cardClass} p-5`}>
          <div className={`text-[11px] font-semibold ${subtleText} mb-4 uppercase tracking-wider`}>財務パラメータ</div>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className={`block text-sm font-medium ${primaryText} mb-1.5`}>{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm">¥</span>
                  <input
                    type="number"
                    value={config[f.key]}
                    onChange={(e) => handleConfigChange(f.key, e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-transparent outline-none transition-colors"
                  />
                </div>
                {f.help && <p className={`text-[10px] ${subtleText} mt-1`}>{f.help}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className={`text-center text-xs ${subtleText} py-4`}>
          Life free · v0.3
        </div>
      </div>
    );
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<any> }> = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'records', label: '記録', icon: BookOpen },
    { id: 'simulator', label: '予測', icon: Calculator },
    { id: 'analysis', label: '分析', icon: BarChart3 },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24 transition-colors">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-900">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-end">
          <button
            onClick={() => setIsMasked(prev => !prev)}
            className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${subtleText}`}
            title="金額マスキング切替"
            aria-label="金額マスキング切替"
          >
            {isMasked ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'records' && renderRecords()}
        {activeTab === 'simulator' && (
          <div className="space-y-3">
            <div className="mb-2">
              <h2 className={`text-xl font-bold ${primaryText}`}>シミュレーター</h2>
              <p className={`text-xs ${subtleText} mt-1`}>将来の資産推移を予測</p>
            </div>
            <Simulator
              initialCash={currentCash}
              initialInvest={currentInvestTotal}
              initialMonthlyInvest={simMonthlyInvest}
              sharedRate={simRate}
              onSharedChange={(rate, invest) => {
                setSimRateStr(rate.toString());
                setSimMonthlyInvestStr(invest.toString());
              }}
              isMasked={isMasked}
            />
          </div>
        )}
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Floating Add Button (Home only) */}
      {activeTab === 'home' && historyData.length > 0 && (
        <button
          onClick={handleAddNew}
          className="fixed bottom-24 right-5 z-20 w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          aria-label="記録を追加"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-900">
        <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 transition-colors ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {isEditorOpen && (
        <MonthEditor
          key={`${editingRecord?.id || prefillRecord?.id || 'new'}-${isEditorOpen}`}
          config={config}
          initialData={editingRecord}
          prefillFromRecord={prefillRecord}
          previousRecord={getPreviousRecord(editingRecord?.id)}
          onSave={handleSaveRecord}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingRecord(undefined);
            setPrefillRecord(undefined);
            setIsSaving(false);
          }}
          currentTotalCash={currentCash}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

export default App;
