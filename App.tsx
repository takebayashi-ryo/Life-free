import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Settings, Wallet, Target, Calculator,
  Coins, Trash2, Send, User, Bot, Eye, EyeOff,
  Home, BookOpen, BarChart3, Sparkles, ChevronRight, Edit3, PiggyBank
} from 'lucide-react';
import { MonthlyRecord, FinancialConfig, DEFAULT_CONFIG } from './types';
import AnalysisChart from './components/AnalysisChart';
import MonthEditor from './components/MonthEditor';
import Simulator from './components/Simulator';
import { calculateSimulation } from './services/simulationService';
import { loadRecords, upsertRecord, deleteRecord } from './services/dataService';
import { generateDashboardAnswer } from './services/geminiService';

const STORAGE_KEY_CONFIG = 'assetflow_config_v1';

type Tab = 'home' | 'records' | 'simulator' | 'analysis' | 'settings';

const MASK = '✳︎✳︎✳︎✳︎✳︎✳︎';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [config, setConfig] = useState<FinancialConfig>(DEFAULT_CONFIG);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyRecord | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [simRateStr, setSimRateStr] = useState("6.0");
  const [simMonthlyInvestStr, setSimMonthlyInvestStr] = useState("0");

  const [aiQuestions, setAiQuestions] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [isMasked, setIsMasked] = useState(false);

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
  const currentCash = isLoadingRecords
    ? config.initialCash
    : (latestHistory ? latestHistory.calculatedTotalCash : config.initialCash);
  const currentInvestTotal = latestHistory ? latestHistory.calculatedTotalInvest : 0;
  const totalAssets = currentCash + currentInvestTotal;

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

  const formatYenMan = (valueInMan: number) => {
    if (isMasked) return MASK;
    return `¥${valueInMan.toFixed(0)}万`;
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
      if (result.error) {
        alert(`保存に失敗しました。\n\nエラー: ${result.error}\n\nID: ${record.id}`);
        return;
      }
      if (!result.data) {
        alert(`保存に失敗しました。\n\nデータが返されませんでした。\n\nID: ${record.id}`);
        return;
      }

      setIsLoadingRecords(true);
      const reloadedRecords = await loadRecords();
      setRecords(reloadedRecords);
      setIsLoadingRecords(false);

      setIsEditorOpen(false);
      alert('保存しました');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`保存中に予期しないエラーが発生しました: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: MonthlyRecord) => {
    if (isSaving) return;
    setIsSaving(false);
    const latestRecord = records.find(r => r.id === record.id) || record;
    setEditingRecord(latestRecord);
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
    setIsEditorOpen(true);
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
      console.error('Error generating answer:', error);
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

  // ===== Sub Renderers =====
  const renderHome = () => {
    const cashProgress = Math.min((currentCash / config.targetCash) * 100, 100);
    const recentRecords = historyData.slice(-3).reverse();

    return (
      <div className="space-y-5">
        {/* Hero Total Assets Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 p-6 shadow-xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 font-medium">総資産</span>
              <div className="w-10 h-10 bg-zinc-800/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Wallet size={20} className="text-blue-400" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-white tracking-tight mb-6">
              {formatYen(totalAssets)}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/80">
              <div>
                <div className="text-xs text-zinc-500 mb-1">現金残高</div>
                <div className="text-lg font-bold text-white">{formatYen(currentCash)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500 mb-1">投資評価額</div>
                <div className="text-lg font-bold text-white">{formatYen(currentInvestTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Goal Progress */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-emerald-400" />
              <span className="text-sm font-medium text-zinc-300">現金目標 (¥{(config.targetCash / 10000).toFixed(0)}万)</span>
            </div>
            <span className="text-xs text-zinc-500">
              {isMasked ? MASK : `${Math.round(cashProgress)}%`}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${currentCash >= config.targetCash ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`}
              style={{ width: `${cashProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs">
            {cashGap > 0 ? (
              <span className="text-zinc-400">
                {isMasked ? `あと ${MASK}` : `あと ${formatYen(cashGap)}`}
                {!isMasked && monthsToGoal > 0 && ` · 約${monthsToGoal}ヶ月`}
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">目標達成！</span>
            )}
          </div>
        </div>

        {/* Strategy Phase */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-amber-400" />
            <span className="text-xs font-medium text-zinc-400">現在の戦略</span>
          </div>
          {currentCash < config.targetCash ? (
            <>
              <div className="text-lg font-bold text-amber-400 mb-1.5">現金優先フェーズ</div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                生活防衛資金が{(config.targetCash / 10000).toFixed(0)}万円に達するまで、副業収入と余剰資金はすべて現金としてプール
              </p>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-emerald-400 mb-1.5">投資最大化フェーズ</div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                現金目標を達成！余剰資金を積極的に投資信託へ回し、資産拡大を加速させましょう
              </p>
            </>
          )}
        </div>

        {/* Quick Sim Preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">将来予測（年利{simRate}%）</span>
            </div>
            <button
              onClick={() => setActiveTab('simulator')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
            >
              詳細<ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 1000, date: simulationResult.milestones.m1000 },
              { val: 3000, date: simulationResult.milestones.m3000 },
              { val: 5000, date: simulationResult.milestones.m5000 }
            ].map((m) => (
              <div key={m.val} className="bg-zinc-800/60 border border-zinc-800 rounded-xl p-3">
                <div className="text-[10px] text-zinc-500 mb-1">
                  {isMasked ? MASK : `${m.val}万円`}
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  {isMasked
                    ? MASK
                    : (m.date ? `${m.date.getFullYear()}/${m.date.getMonth() + 1}` : '---')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Records */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <span className="text-sm font-medium text-zinc-300">最近の記録</span>
            <button
              onClick={() => setActiveTab('records')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
            >
              すべて見る<ChevronRight size={12} />
            </button>
          </div>
          {recentRecords.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="text-sm text-zinc-500 mb-3">まだ記録がありません</div>
              <button
                onClick={handleAddNew}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} />最初の記録を追加
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentRecords.map(record => {
                const flow = record.calculatedCashFlow || 0;
                return (
                  <button
                    key={record.id}
                    onClick={() => handleEdit(record)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-100 mb-0.5">{record.id}</div>
                      <div className="text-xs text-zinc-500">
                        {isMasked ? MASK : `現金 ${formatYen(record.calculatedTotalCash)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isMasked ? MASK : `${flow > 0 ? '+' : ''}${flow.toLocaleString()}`}
                      </span>
                      <ChevronRight size={16} className="text-zinc-600" />
                    </div>
                  </button>
                );
              })}
            </div>
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
            <h2 className="text-xl font-bold text-white">月次レポート</h2>
            <p className="text-xs text-zinc-500 mt-1">{historyData.length}件の記録</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
          >
            <Plus size={16} />
            追加
          </button>
        </div>

        {historyData.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-16 text-center">
            <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={26} className="text-zinc-500" />
            </div>
            <div className="text-sm text-zinc-400 mb-4">まだ記録がありません</div>
            <button
              onClick={handleAddNew}
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={14} />最初の記録を追加
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {historyData.slice().reverse().map(record => {
                const income = record.salaryIncome + record.sideHustleIncome + record.childAllowanceIncome;
                const expense = record.nurseryExpense + record.creditCardExpense + record.pocketMoneyExpense;
                const flow = record.calculatedCashFlow || 0;

                return (
                  <div key={record.id} className="px-5 py-4 hover:bg-zinc-800/40 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-base font-bold text-white">{record.id}</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(record)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                        <div className="text-zinc-500 mb-0.5">収入</div>
                        <div className="text-emerald-400 font-semibold">{formatYen(income)}</div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                        <div className="text-zinc-500 mb-0.5">支出</div>
                        <div className="text-rose-400 font-semibold">{formatYen(expense)}</div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                        <div className="text-zinc-500 mb-0.5">投資</div>
                        <div className="text-blue-400 font-semibold">{formatYen(record.investmentTrust)}</div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                        <div className="text-zinc-500 mb-0.5">現金増減</div>
                        <div className={`font-semibold ${flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isMasked ? MASK : `${flow > 0 ? '+' : ''}${flow.toLocaleString()}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50 text-xs">
                      <span className="text-zinc-500">月末残高</span>
                      <div className="flex gap-3">
                        <span className="text-zinc-300">現金 <span className="font-semibold text-white">{formatYen(record.calculatedTotalCash)}</span></span>
                        <span className="text-zinc-300">投資 <span className="font-semibold text-white">{formatYen(record.calculatedTotalInvest)}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysis = () => {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">分析 & AI相談</h2>
          <p className="text-xs text-zinc-500 mt-1">資産の推移とAIによるアドバイス</p>
        </div>

        {/* Chart */}
        <AnalysisChart
          data={sortedRecords}
          config={config}
          accumulatedCash={historyData.map(h => h.calculatedTotalCash)}
          accumulatedInvest={historyData.map(h => h.calculatedTotalInvest)}
        />

        {/* AI Q&A */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI質問応答</h3>
              <p className="text-[10px] text-zinc-500">ダッシュボード全体の情報を元に回答</p>
            </div>
          </div>

          <div className="mb-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-dark pr-1">
            {aiQuestions.length === 0 && !isGeneratingAnswer && (
              <div className="text-center py-6 text-xs text-zinc-500">
                下のフォームから質問を入力してください
              </div>
            )}
            {aiQuestions.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-white" />
                  </div>
                  <div className="flex-1 bg-zinc-800/60 border border-zinc-800 p-3 rounded-xl">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{item.question}</p>
                  </div>
                </div>
                {item.answer && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="flex-1 bg-zinc-800/60 border border-amber-500/20 p-3 rounded-xl">
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  </div>
                )}
                {!item.answer && isGeneratingAnswer && idx === aiQuestions.length - 1 && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="flex-1 bg-zinc-800/60 border border-zinc-800 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <div className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
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
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGeneratingAnswer}
            />
            <button
              type="submit"
              disabled={!currentQuestion.trim() || isGeneratingAnswer}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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
      { key: 'defaultCreditCard', label: 'カード支払（標準）', help: '月の平均的なカード支出' },
      { key: 'pocketMoneyTarget', label: 'お小遣い目標上限' },
      { key: 'childAllowance', label: '育児手当', help: '月額' },
      { key: 'initialCash', label: '初期現金残高', help: '記録開始時の現金残高' },
      { key: 'targetCash', label: '現金目標額', help: '生活防衛資金として確保したい額' },
      { key: 'targetInvestmentBase', label: '投資基本額（月額）' },
      { key: 'targetInvestmentAddon', label: '投資追加額（月額）', help: '育児手当などを上乗せ' },
    ];

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">設定</h2>
          <p className="text-xs text-zinc-500 mt-1">アプリの動作と財務パラメータ</p>
        </div>

        {/* Privacy */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">プライバシー</div>
          <button
            onClick={() => setIsMasked(prev => !prev)}
            className="w-full flex items-center justify-between py-2.5 hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {isMasked ? <EyeOff size={18} className="text-zinc-400" /> : <Eye size={18} className="text-zinc-400" />}
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-100">金額のマスキング</div>
                <div className="text-xs text-zinc-500">他人に画面を見せるときに金額を隠す</div>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${isMasked ? 'bg-blue-600' : 'bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${isMasked ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </div>
          </button>
        </div>

        {/* Financial Config */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-xs font-medium text-zinc-500 mb-4 uppercase tracking-wide">財務パラメータ</div>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  {f.label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">¥</span>
                  <input
                    type="number"
                    value={config[f.key]}
                    onChange={(e) => handleConfigChange(f.key, e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2.5 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  />
                </div>
                {f.help && <p className="text-[10px] text-zinc-500 mt-1">{f.help}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-zinc-600 py-4">
          Life free · v0.2
        </div>
      </div>
    );
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<any> }> = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'records', label: '記録', icon: BookOpen },
    { id: 'simulator', label: 'シミュ', icon: Calculator },
    { id: 'analysis', label: '分析', icon: BarChart3 },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-900">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-xs">Lf</span>
            </div>
            <h1 className="font-bold text-base tracking-tight">Life free</h1>
          </div>
          <button
            onClick={() => setIsMasked(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="金額マスキング切替"
          >
            {isMasked ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{isMasked ? 'OFF' : 'ON'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-5 py-5">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'records' && renderRecords()}
        {activeTab === 'simulator' && (
          <div className="space-y-2">
            <div className="mb-3">
              <h2 className="text-xl font-bold text-white">シミュレーター</h2>
              <p className="text-xs text-zinc-500 mt-1">将来の資産推移を予測</p>
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
          className="fixed bottom-24 right-5 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-900/50 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="記録を追加"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-900">
        <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${
                  isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Editor Modal */}
      {isEditorOpen && (
        <MonthEditor
          key={`${editingRecord?.id || 'new'}-${isEditorOpen}`}
          config={config}
          initialData={editingRecord}
          previousRecord={getPreviousRecord(editingRecord?.id)}
          onSave={handleSaveRecord}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingRecord(undefined);
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
