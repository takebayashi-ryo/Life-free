import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, Wallet, TrendingUp, PiggyBank, Target, ArrowRight, LayoutDashboard, Calculator, CalendarClock, Coins } from 'lucide-react';
import { MonthlyRecord, FinancialConfig, DEFAULT_CONFIG } from './types';
import AnalysisChart from './components/AnalysisChart';
import MonthEditor from './components/MonthEditor';
import Simulator from './components/Simulator';
import { calculateSimulation } from './services/simulationService';
import { loadRecords, insertRecord } from './services/dataService';

// Mock local storage keys
const STORAGE_KEY_DATA = 'assetflow_data_v1';
const STORAGE_KEY_CONFIG = 'assetflow_config_v1';

type Tab = 'dashboard' | 'simulator';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<FinancialConfig>(DEFAULT_CONFIG);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyRecord | undefined>(undefined);

  // Global Simulation State (Shared between Dashboard and Simulator)
  // Changed to strings to allow flexible input (decimals, empty state)
  const [simRateStr, setSimRateStr] = useState("5.0");
  const [simMonthlyInvestStr, setSimMonthlyInvestStr] = useState("0"); 

  // Load data on mount
  useEffect(() => {
    // Load records from Supabase
    loadRecords().then(loadedRecords => {
      setRecords(loadedRecords);
    });
    
    // Load config from localStorage (config is still using localStorage)
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Calculations
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.id.localeCompare(b.id));
  }, [records]);

  // Calculate History
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
  const currentCash = latestHistory ? latestHistory.calculatedTotalCash : config.initialCash;
  const currentInvestTotal = latestHistory ? latestHistory.calculatedTotalInvest : 0;
  
  // Initialize Sim Monthly Invest if not set yet (Run once or when logic dictates)
  useEffect(() => {
      // Only set if user hasn't typed anything yet (i.e., it's "0")
      if (simMonthlyInvestStr === "0") {
          if (latestHistory) {
              setSimMonthlyInvestStr(latestHistory.investmentTrust.toString());
          } else {
              setSimMonthlyInvestStr((config.targetInvestmentBase + config.targetInvestmentAddon).toString());
          }
      }
  }, [latestHistory, config]); // Removed simMonthlyInvestStr from dependency to prevent overwrite while typing

  // Derived numeric values for calculation
  const simRate = parseFloat(simRateStr) || 0;
  const simMonthlyInvest = parseFloat(simMonthlyInvestStr) || 0;

  // Run Global Simulation for Dashboard
  const simulationResult = useMemo(() => {
      return calculateSimulation(
          currentCash,
          currentInvestTotal,
          simMonthlyInvest,
          simRate
      );
  }, [currentCash, currentInvestTotal, simMonthlyInvest, simRate]);

  const cashGap = config.targetCash - currentCash;
  
  // Estimate months to goal (Cash only)
  const monthsToGoal = useMemo(() => {
    if (cashGap <= 0) return 0;
    const recentRecords = sortedRecords.slice(-3);
    if (recentRecords.length === 0) return -1;
    
    const avgFlow = recentRecords.reduce((sum, r) => sum + (r.calculatedCashFlow || 0), 0) / recentRecords.length;
    if (avgFlow <= 0) return -1; 
    
    return Math.ceil(cashGap / avgFlow);
  }, [cashGap, sortedRecords]);

  const handleSaveRecord = async (record: MonthlyRecord) => {
    // Insert new record to Supabase
    const insertedRecord = await insertRecord(record);
    if (insertedRecord) {
      // Update local state with the new record
      setRecords(prev => {
        // Check if record already exists (for safety, though we're only doing inserts)
        const exists = prev.findIndex(r => r.id === record.id);
        if (exists >= 0) {
          // If exists, replace it (though we're only doing inserts in this phase)
          const newRecords = [...prev];
          newRecords[exists] = insertedRecord;
          return newRecords;
        }
        return [...prev, insertedRecord];
      });
    }
    setIsEditorOpen(false);
    setEditingRecord(undefined);
  };

  const handleEdit = (record: MonthlyRecord) => {
    setEditingRecord(record);
    setIsEditorOpen(true);
  };

  const handleAddNew = () => {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">AssetFlow</h1>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <Settings size={20} />
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-6 -mb-px">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 py-3 border-b-2 transition-colors font-medium text-sm ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <LayoutDashboard size={18} />
                    ダッシュボード
                </button>
                <button 
                    onClick={() => setActiveTab('simulator')}
                    className={`flex items-center gap-2 py-3 border-b-2 transition-colors font-medium text-sm ${activeTab === 'simulator' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Calculator size={18} />
                    資産シミュレーター
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'dashboard' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Dashboard Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cash Status */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Wallet size={100} />
                     </div>
                     <h2 className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
                        <Wallet size={16} /> 現金残高 (目標 100万)
                     </h2>
                     <div className="text-3xl font-bold text-slate-900 mb-4">
                        ¥{currentCash.toLocaleString()}
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${currentCash >= config.targetCash ? 'bg-green-500' : 'bg-blue-600'}`} 
                          style={{width: `${Math.min((currentCash / config.targetCash) * 100, 100)}%`}}
                        ></div>
                     </div>
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-400">達成率 {Math.round((currentCash / config.targetCash) * 100)}%</span>
                        {cashGap > 0 ? (
                            <span className="text-blue-600">あと ¥{cashGap.toLocaleString()} ({monthsToGoal > 0 ? `約${monthsToGoal}ヶ月` : '未定'})</span>
                        ) : (
                            <span className="text-green-600 flex items-center gap-1">目標達成! <PiggyBank size={12}/></span>
                        )}
                     </div>
                  </div>
        
                  {/* Monthly Investment */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                     <h2 className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
                        <TrendingUp size={16} /> 投資信託・資産
                     </h2>
                     <div className="flex items-baseline gap-2 mb-4">
                        <div className="text-3xl font-bold text-slate-900">
                           ¥{currentInvestTotal.toLocaleString()}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">総額 (評価額)</span>
                     </div>
                     
                     <div className="border-t pt-3">
                       <p className="text-xs text-slate-500 mb-2">今月の積立: ¥{(latestHistory?.investmentTrust || 0).toLocaleString()}</p>
                       <div className="flex gap-2 text-xs">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                              基本: ¥{config.targetInvestmentBase.toLocaleString()}
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                              +育児: ¥{config.targetInvestmentAddon.toLocaleString()}
                          </span>
                       </div>
                     </div>
                  </div>
        
                  {/* Strategy Phase */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h2 className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-3">
                        <Target size={16} /> 現在の戦略
                     </h2>
                     {currentCash < config.targetCash ? (
                         <div>
                            <div className="text-lg font-bold text-amber-600 mb-1 flex items-center gap-2">
                                現金優先フェーズ
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                生活防衛資金が100万円に達するまで、副業収入と余剰資金はすべて現金としてプールしてください。
                            </p>
                         </div>
                     ) : (
                         <div>
                            <div className="text-lg font-bold text-emerald-600 mb-1 flex items-center gap-2">
                                投資最大化フェーズ
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                現金目標を達成しました！余剰資金を積極的に投資信託へ回し、資産拡大を加速させましょう。
                            </p>
                         </div>
                     )}
                  </div>
                </div>

                {/* Simulation Widget Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Coins className="text-amber-500" />
                            将来の資産予測 (Total Assets Projection)
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">想定年利</span>
                                <div className="relative w-20">
                                    <input 
                                        type="number" 
                                        value={simRateStr}
                                        onChange={(e) => setSimRateStr(e.target.value)}
                                        className="w-full pl-2 pr-6 py-1 bg-white text-slate-900 border border-slate-300 rounded-md font-bold focus:ring-2 focus:ring-blue-400 outline-none transition-colors"
                                        placeholder="5.0"
                                        step="0.1"
                                    />
                                    <span className="absolute right-2 top-1.5 text-slate-400 text-xs pointer-events-none">%</span>
                                </div>
                            </div>
                            <div className="w-px h-4 bg-slate-300 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">今後の毎月積立</span>
                                <div className="relative w-32">
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs pointer-events-none">¥</span>
                                    <input 
                                        type="number" 
                                        value={simMonthlyInvestStr}
                                        onChange={(e) => setSimMonthlyInvestStr(e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 bg-white text-slate-900 border border-slate-300 rounded-md font-bold focus:ring-2 focus:ring-blue-400 outline-none transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Milestones (Top or Left) */}
                        <div className="lg:col-span-12 flex flex-wrap gap-4 mb-2">
                             {[
                                 { val: 1000, date: simulationResult.milestones.m1000, color: 'bg-teal-50 border-teal-200 text-teal-800' },
                                 { val: 3000, date: simulationResult.milestones.m3000, color: 'bg-blue-50 border-blue-200 text-blue-800' },
                                 { val: 5000, date: simulationResult.milestones.m5000, color: 'bg-indigo-50 border-indigo-200 text-indigo-800' }
                             ].map((m) => (
                                 <div key={m.val} className={`flex-1 min-w-[200px] border rounded-xl p-4 flex items-center justify-between ${m.color}`}>
                                     <div>
                                         <div className="text-xs font-semibold opacity-70 mb-1">資産 {m.val}万円</div>
                                         <div className="text-xl font-bold">
                                             {m.date ? `${m.date.getFullYear()}年` : '---'}
                                             <span className="text-sm ml-1 font-normal">{m.date ? `${m.date.getMonth() + 1}月` : ''}</span>
                                         </div>
                                     </div>
                                     {m.date ? <CalendarClock size={24} className="opacity-30" /> : <span className="text-xs opacity-50">未達</span>}
                                 </div>
                             ))}
                        </div>

                        {/* Annual List */}
                        <div className="lg:col-span-12">
                            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="w-full text-sm text-left">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium bg-slate-50">経過年数</th>
                                            <th className="px-6 py-3 font-medium bg-slate-50">資産総額 (現金+投資)</th>
                                            <th className="px-6 py-3 font-medium bg-slate-50 text-blue-600">うち投資元本</th>
                                            <th className="px-6 py-3 font-medium bg-slate-50 text-amber-600">うち運用益</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {simulationResult.yearlyData.map((row) => (
                                            <tr key={row.month} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 text-slate-600 font-medium">
                                                    {row.yearIndex}年後 <span className="text-xs text-slate-400 ml-1">({row.displayYear})</span>
                                                </td>
                                                <td className="px-6 py-3 font-bold text-slate-900 text-base">
                                                    ¥{(row.total / 10000).toFixed(0)}万
                                                </td>
                                                <td className="px-6 py-3 text-slate-600">
                                                    ¥{(row.investPrincipal / 10000).toFixed(0)}万
                                                </td>
                                                <td className="px-6 py-3 text-amber-600 font-medium">
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
        
                {/* Charts */}
                <AnalysisChart 
                    data={sortedRecords} 
                    config={config} 
                    accumulatedCash={historyData.map(h => h.calculatedTotalCash)} 
                    accumulatedInvest={historyData.map(h => h.calculatedTotalInvest)}
                />
        
                {/* Recent Transactions List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-slate-700">月次レポート</h3>
                    <button 
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={16} />
                        記録を追加
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3 w-28">年月</th>
                                <th className="px-6 py-3">収入計</th>
                                <th className="px-6 py-3">支出計</th>
                                <th className="px-6 py-3 text-blue-600">投資(積立)</th>
                                <th className="px-6 py-3">現金増減</th>
                                <th className="px-6 py-3 bg-slate-50 border-l border-slate-200 text-slate-700">現金残高</th>
                                <th className="px-6 py-3 bg-slate-50 text-slate-700">投資残高</th>
                                <th className="px-6 py-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyData.slice().reverse().map((record) => {
                                const income = record.salaryIncome + record.sideHustleIncome + record.childAllowanceIncome;
                                const expense = record.nurseryExpense + record.creditCardExpense + record.pocketMoneyExpense;
                                const flow = record.calculatedCashFlow || 0;
                                
                                return (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{record.id}</td>
                                        <td className="px-6 py-4 text-slate-600">¥{income.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-600">¥{expense.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium text-blue-600">¥{record.investmentTrust.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${flow >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {flow > 0 ? '+' : ''}{flow.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 bg-slate-50/50 font-medium text-slate-900 border-l border-slate-100">
                                            ¥{record.calculatedTotalCash.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 bg-slate-50/50 font-medium text-slate-900">
                                            ¥{record.calculatedTotalInvest.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleEdit(record)}
                                                className="text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                編集
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {historyData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                        まだ記録がありません。「記録を追加」から始めましょう。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>
                </div>
            </div>
        ) : (
            <Simulator 
                initialCash={currentCash} 
                initialInvest={currentInvestTotal} 
                initialMonthlyInvest={simMonthlyInvest} 
                sharedRate={simRate}
                onSharedChange={(rate, invest) => {
                    setSimRateStr(rate.toString());
                    setSimMonthlyInvestStr(invest.toString());
                }}
            />
        )}
      </main>

      {/* Editor Modal */}
      {isEditorOpen && (
        <MonthEditor 
            config={config} 
            initialData={editingRecord}
            previousRecord={getPreviousRecord(editingRecord?.id)}
            onSave={handleSaveRecord} 
            onCancel={() => setIsEditorOpen(false)}
            currentTotalCash={currentCash}
        />
      )}
    </div>
  );
}

export default App;