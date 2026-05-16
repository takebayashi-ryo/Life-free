import React, { useState, useEffect } from 'react';
import { FinancialConfig, MonthlyRecord } from '../types';
import { Save, X, Calculator, Lightbulb, TrendingUp, Wallet } from 'lucide-react';
import { generateFinancialAdvice } from '../services/geminiService';

interface MonthEditorProps {
  config: FinancialConfig;
  initialData?: MonthlyRecord;
  prefillFromRecord?: MonthlyRecord;
  previousRecord?: MonthlyRecord;
  onSave: (record: MonthlyRecord) => void;
  onCancel: () => void;
  currentTotalCash: number;
  isSaving?: boolean;
}

const incrementMonth = (id: string): string => {
  const [y, m] = id.split('-').map(Number);
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const MonthEditor: React.FC<MonthEditorProps> = ({
  config, initialData, prefillFromRecord, previousRecord, onSave, onCancel, currentTotalCash, isSaving = false
}) => {
  const buildPrefilled = () => {
    if (!prefillFromRecord) return null;
    const nextMonth = incrementMonth(prefillFromRecord.id);
    return {
      id: nextMonth,
      monthStr: nextMonth,
      salaryIncome: prefillFromRecord.salaryIncome,
      sideHustleIncome: prefillFromRecord.sideHustleIncome,
      childAllowanceIncome: prefillFromRecord.childAllowanceIncome,
      nurseryExpense: prefillFromRecord.nurseryExpense,
      creditCardExpense: prefillFromRecord.creditCardExpense,
      pocketMoneyExpense: prefillFromRecord.pocketMoneyExpense,
      investmentTrust: prefillFromRecord.investmentTrust,
      totalCashSnapshot: undefined,
      totalInvestmentSnapshot: undefined,
      note: '',
    };
  };

  const buildDefault = () => ({
    id: new Date().toISOString().slice(0, 7),
    monthStr: new Date().toISOString().slice(0, 7),
    salaryIncome: config.baseSalary,
    sideHustleIncome: 60000,
    childAllowanceIncome: config.childAllowance,
    nurseryExpense: config.nurseryFee,
    creditCardExpense: config.defaultCreditCard,
    pocketMoneyExpense: 0,
    investmentTrust: config.targetInvestmentBase + config.targetInvestmentAddon,
    totalCashSnapshot: undefined,
    totalInvestmentSnapshot: undefined,
    note: '',
  });

  const [formData, setFormData] = useState<any>(
    initialData || buildPrefilled() || buildDefault()
  );

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const getNum = (val: any) => val === '' || val === undefined ? 0 : Number(val);

  const totalIncome = getNum(formData.salaryIncome) + getNum(formData.sideHustleIncome) + getNum(formData.childAllowanceIncome);
  const totalExpense = getNum(formData.nurseryExpense) + getNum(formData.creditCardExpense) + getNum(formData.pocketMoneyExpense);
  const cashSurplusBeforeInvest = totalIncome - totalExpense;
  const cashFlowResult = cashSurplusBeforeInvest - getNum(formData.investmentTrust);

  const prevCash = previousRecord?.totalCashSnapshot ?? (previousRecord ? 0 : config.initialCash);
  const prevInvest = previousRecord?.totalInvestmentSnapshot ?? 0;

  const expectedCash = prevCash + cashFlowResult;
  const expectedInvest = prevInvest + getNum(formData.investmentTrust);

  const cashGap = (formData.totalCashSnapshot !== undefined && formData.totalCashSnapshot !== '')
    ? Number(formData.totalCashSnapshot) - expectedCash : 0;

  const investGap = (formData.totalInvestmentSnapshot !== undefined && formData.totalInvestmentSnapshot !== '')
    ? Number(formData.totalInvestmentSnapshot) - expectedInvest : 0;

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        monthStr: initialData.monthStr,
        salaryIncome: initialData.salaryIncome,
        sideHustleIncome: initialData.sideHustleIncome,
        childAllowanceIncome: initialData.childAllowanceIncome,
        nurseryExpense: initialData.nurseryExpense,
        creditCardExpense: initialData.creditCardExpense,
        pocketMoneyExpense: initialData.pocketMoneyExpense,
        investmentTrust: initialData.investmentTrust,
        totalCashSnapshot: initialData.totalCashSnapshot,
        totalInvestmentSnapshot: initialData.totalInvestmentSnapshot,
        note: initialData.note || '',
      });
    } else if (prefillFromRecord) {
      setFormData(buildPrefilled());
    } else {
      setFormData(buildDefault());
    }
  }, [initialData, prefillFromRecord, config]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
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

      const advice = await generateFinancialAdvice(tempRecord, config, currentTotalCash);
      setAiAdvice(advice);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

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
      totalCashSnapshot: formData.totalCashSnapshot !== undefined && formData.totalCashSnapshot !== ''
        ? getNum(formData.totalCashSnapshot) : expectedCash,
      totalInvestmentSnapshot: formData.totalInvestmentSnapshot !== undefined && formData.totalInvestmentSnapshot !== ''
        ? getNum(formData.totalInvestmentSnapshot) : expectedInvest,
      note: formData.note,
      calculatedCashFlow: cashFlowResult
    });
  };

  const inputClass = "w-full bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-transparent outline-none transition-colors text-sm";
  const labelClass = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";

  const titleText = initialData ? '実績を編集' : prefillFromRecord ? '新しい月を記録（前月コピー）' : '新しい月を記録';

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:my-8 overflow-y-auto max-h-screen">
        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Calculator size={18} className="text-zinc-500" />
            {titleText}
          </h2>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-1 -mr-1">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className={labelClass}>対象月</label>
            <input
              type="month"
              name="id"
              required
              value={formData.id}
              onChange={handleInputChange}
              className={inputClass}
              style={{ colorScheme: 'light dark' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">収入 +</h3>
              <div>
                <label className={labelClass}>給与手取り</label>
                <input type="number" name="salaryIncome" value={formData.salaryIncome} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>副業</label>
                <input type="number" name="sideHustleIncome" value={formData.sideHustleIncome} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>育児手当</label>
                <input type="number" name="childAllowanceIncome" value={formData.childAllowanceIncome} onChange={handleInputChange} className={inputClass} />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">支出 -</h3>
              <div>
                <label className={labelClass}>保育料</label>
                <input type="number" name="nurseryExpense" value={formData.nurseryExpense} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>カード支払等</label>
                <input type="number" name="creditCardExpense" value={formData.creditCardExpense} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>お小遣い</label>
                <input
                  type="number"
                  name="pocketMoneyExpense"
                  value={formData.pocketMoneyExpense}
                  onChange={handleInputChange}
                  className={`${inputClass} ${getNum(formData.pocketMoneyExpense) > config.pocketMoneyTarget ? 'border-rose-500/60 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-3 flex items-center gap-2">
              <Wallet size={16} className="text-zinc-500" />
              資産残高の確定
            </h3>

            <div className="space-y-3">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  <TrendingUp size={14} className="text-zinc-500" /> 投資信託
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>今月の購入額 (Flow)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                      <input type="number" name="investmentTrust" value={formData.investmentTrust} onChange={handleInputChange} className={`${inputClass} pl-7 text-base font-semibold`} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>月末の評価額合計 (Stock)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                      <input type="number" name="totalInvestmentSnapshot" value={formData.totalInvestmentSnapshot ?? ''} onChange={handleInputChange} className={`${inputClass} pl-7 text-base font-bold`} placeholder={expectedInvest.toString()} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px]">
                      <span className="text-zinc-500">期待値: ¥{expectedInvest.toLocaleString()}</span>
                      {investGap !== 0 && (
                        <span className={investGap > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                          (損益: {investGap > 0 ? '+' : ''}{investGap.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  <Wallet size={14} className="text-zinc-500" /> 現金残高
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>今月の収支 (Flow)</label>
                    <div className={`text-base font-semibold py-1.5 ${cashFlowResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {cashFlowResult > 0 ? '+' : ''}¥{cashFlowResult.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>月末の現金実残高 (Stock)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                      <input type="number" name="totalCashSnapshot" value={formData.totalCashSnapshot ?? ''} onChange={handleInputChange} className={`${inputClass} pl-7 text-base font-bold`} placeholder={expectedCash.toString()} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px]">
                      <span className="text-zinc-500">期待値: ¥{expectedCash.toLocaleString()}</span>
                      {cashGap !== 0 && (
                        <span className={cashGap > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
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
            <label className={labelClass}>メモ</label>
            <textarea name="note" value={formData.note} onChange={handleInputChange} className={`${inputClass} h-20 resize-none`} placeholder="相場変動や臨時出費のメモ..." />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold flex items-center gap-2">
                <Lightbulb size={15} className="text-zinc-500" />
                AIファイナンシャル・チェック
              </h4>
              <button
                type="button"
                onClick={handleGetAdvice}
                disabled={isThinking}
                className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {isThinking ? '分析中...' : 'アドバイスをもらう'}
              </button>
            </div>
            {aiAdvice && (
              <div className="text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-950/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed mt-3">
                {aiAdvice}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2 -mx-5 px-5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存する
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthEditor;
