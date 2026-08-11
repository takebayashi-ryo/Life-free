import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { FinancialConfig, NoteProfile, UserProfile } from '../types';
import {
  buildNoteArticle,
  MilestoneRow,
  NoteCommentary,
  RecordWithTotals,
} from '../services/noteArticleService';
import { generateNoteCommentary } from '../services/geminiService';

interface NoteArticleModalProps {
  record: RecordWithTotals;
  history: RecordWithTotals[];
  config: FinancialConfig;
  profile: UserProfile;
  noteProfile: NoteProfile;
  milestones: MilestoneRow[];
  onClose: () => void;
}

const NoteArticleModal: React.FC<NoteArticleModalProps> = ({
  record, history, config, profile, noteProfile, milestones, onClose,
}) => {
  const [commentary, setCommentary] = useState<NoteCommentary | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const article = buildNoteArticle({
    record, history, config, profile, noteProfile, milestones, commentary,
  });

  const index = history.findIndex(h => h.id === record.id);
  const prev = index > 0 ? history[index - 1] : null;

  const runAI = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const income = record.salaryIncome + record.sideHustleIncome + record.childAllowanceIncome;
      const expense = record.nurseryExpense + record.creditCardExpense + record.pocketMoneyExpense;
      const total = record.calculatedTotalCash + record.calculatedTotalInvest;
      const prevTotal = prev ? prev.calculatedTotalCash + prev.calculatedTotalInvest : null;

      const result = await generateNoteCommentary({
        monthLabel: `${record.id.split('-')[0]}年${Number(record.id.split('-')[1])}月`,
        totalAssets: total,
        totalAssetsDiff: prevTotal !== null ? total - prevTotal : null,
        cash: record.calculatedTotalCash,
        invest: record.calculatedTotalInvest,
        targetCash: config.targetCash,
        salaryIncome: record.salaryIncome,
        sideHustleIncome: record.sideHustleIncome,
        prevSideHustleIncome: prev ? prev.sideHustleIncome : null,
        childAllowanceIncome: record.childAllowanceIncome,
        nurseryExpense: record.nurseryExpense,
        creditCardExpense: record.creditCardExpense,
        pocketMoneyExpense: record.pocketMoneyExpense,
        pocketMoneyTarget: config.pocketMoneyTarget,
        recentPocketMoney: history.slice(-4).map(h => ({
          month: `${Number(h.id.split('-')[1])}月`,
          amount: h.pocketMoneyExpense,
        })),
        investmentTrust: record.investmentTrust,
        targetInvest: config.targetInvestmentBase + config.targetInvestmentAddon,
        cashFlow: record.calculatedCashFlow ?? income - expense - record.investmentTrust,
      });
      setCommentary(result);
    } catch {
      setError('コメントの生成に失敗しました。数字だけの下書きはこのまま使えます。');
    } finally {
      setIsGenerating(false);
    }
  };

  // 開いた時点で一度だけ自動生成する
  useEffect(() => { runAI(); /* eslint-disable-next-line */ }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(article);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('コピーできませんでした。本文を長押しして選択してください。');
    }
  };

  const profileMissing = !noteProfile.penName;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:my-8 flex flex-col max-h-screen">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">note記事の下書き</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{record.id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 -mr-1">
            <X size={22} />
          </button>
        </div>

        {/* Notices */}
        <div className="px-5 pt-4 space-y-2 flex-shrink-0">
          {profileMissing && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                設定タブの<strong>「note記事のプロフィール」</strong>を入力すると、冒頭の自己紹介が入ります。
              </div>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
              {error}
            </div>
          )}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 py-1">
              <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              コメント文を生成中…（数字はすでに埋まっています）
            </div>
          )}
        </div>

        {/* Article */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-900 dark:text-zinc-100 font-sans">
            {article}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 flex-shrink-0">
          <button
            onClick={runAI}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            書き直す
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5"
          >
            {copied ? <><Check size={16} />コピーしました</> : <><Copy size={16} />全文をコピー</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteArticleModal;
