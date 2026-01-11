import React, { useState, useEffect } from 'react';
import { FinancialConfig, MonthlyRecord } from '../types';
import { Save, X, Calculator, AlertTriangle, Lightbulb, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { generateFinancialAdvice } from '../services/geminiService';

interface MonthEditorProps {
  config: FinancialConfig;
  initialData?: MonthlyRecord;
  previousRecord?: MonthlyRecord; // Added to calculate expected totals
  onSave: (record: MonthlyRecord) => void;
  onCancel: () => void;
  currentTotalCash: number;
}

const MonthEditor: React.FC<MonthEditorProps> = ({ config, initialData, previousRecord, onSave, onCancel, currentTotalCash }) => {
  // Use 'any' type for state to allow temporary empty strings in number inputs for better UX
  const [formData, setFormData] = useState<any>(initialData || {
    id: new Date().toISOString().slice(0, 7), // YYYY-MM
    monthStr: new Date().toISOString().slice(0, 7),
    salaryIncome: config.baseSalary,
    sideHustleIncome: 60000, // Default estimate
    childAllowanceIncome: config.childAllowance,
    nurseryExpense: config.nurseryFee,
    creditCardExpense: config.defaultCreditCard,
    pocketMoneyExpense: 0,
    investmentTrust: config.targetInvestmentBase + config.targetInvestmentAddon, 
    totalCashSnapshot: undefined,
    totalInvestmentSnapshot: undefined,
    note: '',
  });

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Helper to safely parse numbers
  const getNum = (val: any) => val === '' || val === undefined ? 0 : Number(val);

  // 1. Calculate Flows
  const totalIncome = getNum(formData.salaryIncome) + getNum(formData.sideHustleIncome) + getNum(formData.childAllowanceIncome);
  const totalExpense = getNum(formData.nurseryExpense) + getNum(formData.creditCardExpense) + getNum(formData.pocketMoneyExpense);
  const cashSurplusBeforeInvest = totalIncome - totalExpense;
  const cashFlowResult = cashSurplusBeforeInvest - getNum(formData.investmentTrust);

  // 2. Calculate Theoretical Totals (Expected)
  const prevCash = previousRecord?.totalCashSnapshot ?? (previousRecord ? 0 : config.initialCash); 
  // If no previous record found (first entry), use config.initialCash. If prev record exists but no snapshot, assume 0 (edge case).
  
  const prevInvest = previousRecord?.totalInvestmentSnapshot ?? 0;

  const expectedCash = prevCash + cashFlowResult;
  const expectedInvest = prevInvest + getNum(formData.investmentTrust);

  // 3. Current User Inputs for Totals
  const currentCashSnapshot = formData.totalCashSnapshot !== undefined && formData.totalCashSnapshot !== '' 
    ? Number(formData.totalCashSnapshot) 
    : expectedCash; // Default to expected if not entered yet for display logic, but input remains controlled

  const currentInvestSnapshot = formData.totalInvestmentSnapshot !== undefined && formData.totalInvestmentSnapshot !== ''
    ? Number(formData.totalInvestmentSnapshot)
    : expectedInvest;

  // 4. Calculate Gaps (Market Fluctuation or Unaccounted)
  const cashGap = (formData.totalCashSnapshot !== undefined && formData.totalCashSnapshot !== '') 
    ? Number(formData.totalCashSnapshot) - expectedCash 
    : 0;

  const investGap = (formData.totalInvestmentSnapshot !== undefined && formData.totalInvestmentSnapshot !== '')
    ? Number(formData.totalInvestmentSnapshot) - expectedInvest
    : 0;

  // Effect: Pre-fill snapshots if editing a new record and they are empty
  useEffect(() => {
    if (!initialData) {
        // If it's a new record, we might want to suggest the expected values?
        // Let's not auto-fill the state to force user to confirm, 
        // OR we can just leave them undefined and save the expected value if left blank.
        // For this UI, let's let the placeholders do the work.
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGetAdvice = async () => {
    setIsThinking(true);
    setAiAdvice(null);
    try {
      const tempRecord: MonthlyRecord = {
        ...formData,
        salaryIncome: getNum(formData.salaryIncome),
        sideHustleIncome: getNum(formData.sideHustleIncome),
        childAllowanceIncome: getNum(formData.childAllowanceIncome),
        nurseryExpense: getNum(formData.nurseryExpense),
        creditCardExpense: getNum(formData.creditCardExpense),
        pocketMoneyExpense: getNum(formData.pocketMoneyExpense),
        investmentTrust: getNum(formData.investmentTrust),
        totalCashSnapshot: formData.totalCashSnapshot !== undefined ? getNum(formData.totalCashSnapshot) : expectedCash,
        totalInvestmentSnapshot: formData.totalInvestmentSnapshot !== undefined ? getNum(formData.totalInvestmentSnapshot) : expectedInvest,
        calculatedCashFlow: cashFlowResult
      };

      const advice = await generateFinancialAdvice(
        tempRecord,
        config,
        currentTotalCash
      );
      setAiAdvice(advice);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: formData.id,
      monthStr: formData.id,
      salaryIncome: getNum(formData.salaryIncome),
      sideHustleIncome: getNum(formData.sideHustleIncome),
      childAllowanceIncome: getNum(formData.childAllowanceIncome),
      nurseryExpense: getNum(formData.nurseryExpense),
      creditCardExpense: getNum(formData.creditCardExpense),
      pocketMoneyExpense: getNum(formData.pocketMoneyExpense),
      investmentTrust: getNum(formData.investmentTrust),
      // If user didn't input snapshots, save the calculated expected values
      totalCashSnapshot: formData.totalCashSnapshot !== undefined && formData.totalCashSnapshot !== '' 
        ? getNum(formData.totalCashSnapshot) 
        : expectedCash,
      totalInvestmentSnapshot: formData.totalInvestmentSnapshot !== undefined && formData.totalInvestmentSnapshot !== '' 
        ? getNum(formData.totalInvestmentSnapshot) 
        : expectedInvest,
      note: formData.note,
      calculatedCashFlow: cashFlowResult
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden my-8">
        {/* Header - Changed from black to white */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center text-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator size={20} className="text-blue-600" />
            {initialData ? '実績を編集' : '新しい月を記録'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Top Section: Date & Income/Expense inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-slate-100 pb-8">
            {/* Left: Metadata & Income/Expense (Width 5/12) */}
            <div className="lg:col-span-5 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象月</label>
                  <input
                    type="month"
                    name="id"
                    required
                    value={formData.id}
                    onChange={handleInputChange}
                    className="w-full bg-white rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-blue-600 border-b pb-1">収入 +</h3>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">給与手取り</label>
                            <input type="number" name="salaryIncome" value={formData.salaryIncome} onChange={handleInputChange} className="w-full bg-white text-slate-900 border-slate-300 border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">副業 (現金補充)</label>
                            <input type="number" name="sideHustleIncome" value={formData.sideHustleIncome} onChange={handleInputChange} className="w-full bg-white text-slate-900 border-slate-300 border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">育児手当 (投資)</label>
                            <input type="number" name="childAllowanceIncome" value={formData.childAllowanceIncome} onChange={handleInputChange} className="w-full bg-white text-slate-900 border-slate-300 border rounded p-2" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-red-500 border-b pb-1">支出 -</h3>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">保育料</label>
                            <input type="number" name="nurseryExpense" value={formData.nurseryExpense} onChange={handleInputChange} className="w-full bg-white text-slate-900 border-slate-300 border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">カード支払等</label>
                            <input type="number" name="creditCardExpense" value={formData.creditCardExpense} onChange={handleInputChange} className="w-full bg-white text-slate-900 border-slate-300 border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">お小遣い</label>
                            <input type="number" name="pocketMoneyExpense" value={formData.pocketMoneyExpense} onChange={handleInputChange} className={`w-full border rounded p-2 text-slate-900 ${getNum(formData.pocketMoneyExpense) > config.pocketMoneyTarget ? 'border-red-300 bg-red-50 text-red-700' : 'bg-white border-slate-300'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Assets Management (Width 7/12) */}
            <div className="lg:col-span-7 bg-gray-50 rounded-xl p-5 border border-slate-200">
                 <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Wallet size={18} />
                    資産残高の確定 (Assets Confirmation)
                 </h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Investment Column */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-blue-700 font-medium">
                            <TrendingUp size={18} /> 投資信託
                        </div>
                        
                        {/* Flow Input */}
                        <div className="mb-4">
                            <label className="block text-xs text-slate-500 mb-1">今月の購入額 (Flow)</label>
                            <div className="flex items-center">
                                <span className="text-slate-400 mr-1">¥</span>
                                <input 
                                    type="number" 
                                    name="investmentTrust" 
                                    value={formData.investmentTrust} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-white text-slate-900 border-b border-blue-200 focus:border-blue-600 outline-none text-lg font-semibold"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Stock Input */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">月末の評価額合計 (Stock)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    name="totalInvestmentSnapshot" 
                                    value={formData.totalInvestmentSnapshot ?? ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xl font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={expectedInvest.toString()}
                                />
                                <div className="absolute right-3 top-3.5 text-xs text-slate-400">円</div>
                            </div>
                            {/* Gap Display */}
                            <div className="mt-2 flex justify-between text-xs">
                                <span className="text-slate-400">前回残 + 購入: ¥{expectedInvest.toLocaleString()}</span>
                                {investGap !== 0 && (
                                    <span className={investGap > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                        (損益: {investGap > 0 ? '+' : ''}{investGap.toLocaleString()})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cash Column */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-emerald-700 font-medium">
                            <Wallet size={18} /> 現金残高
                        </div>

                         {/* Flow Display (Calculated) */}
                         <div className="mb-4">
                            <label className="block text-xs text-slate-500 mb-1">今月の収支 (Flow)</label>
                            <div className={`text-lg font-semibold border-b ${cashFlowResult >= 0 ? 'text-emerald-600 border-emerald-200' : 'text-red-500 border-red-200'}`}>
                                {cashFlowResult > 0 ? '+' : ''}{cashFlowResult.toLocaleString()}
                            </div>
                        </div>

                        {/* Stock Input */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">月末の現金実残高 (Stock)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    name="totalCashSnapshot" 
                                    value={formData.totalCashSnapshot ?? ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder={expectedCash.toString()}
                                />
                                <div className="absolute right-3 top-3.5 text-xs text-slate-400">円</div>
                            </div>
                             {/* Gap Display */}
                             <div className="mt-2 flex justify-between text-xs">
                                <span className="text-slate-400">前回残 + 収支: ¥{expectedCash.toLocaleString()}</span>
                                {cashGap !== 0 && (
                                    <span className={cashGap > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                        (調整: {cashGap > 0 ? '+' : ''}{cashGap.toLocaleString()})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">メモ</label>
             <textarea name="note" value={formData.note} onChange={handleInputChange} className="w-full bg-white border-slate-300 border rounded p-2 h-16 text-sm text-slate-900" placeholder="相場変動や臨時出費のメモ..." />
          </div>

          {/* AI Advisor Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-700 font-semibold flex items-center gap-2">
                   <Lightbulb size={18} className="text-amber-500"/>
                   AIファイナンシャル・チェック
                </h4>
                <button 
                  type="button" 
                  onClick={handleGetAdvice}
                  disabled={isThinking}
                  className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-full hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {isThinking ? '分析中...' : 'アドバイスをもらう'}
                </button>
             </div>
             {aiAdvice && (
               <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                 {aiAdvice}
               </div>
             )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors">
              キャンセル
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
              <Save size={18} />
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthEditor;