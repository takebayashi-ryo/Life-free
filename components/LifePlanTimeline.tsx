import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, Plus, Trash2, MessageSquare, TrendingUp, TrendingDown, AlertCircle, User, Baby } from 'lucide-react';
import { LifePlan, LifePlanYear, LifePlanEvent, UserProfile } from '../types';
import { buildYearContext, YearContext } from '../services/lifePlanService';
import { suggestLifeEvents } from '../services/geminiService';

interface LifePlanTimelineProps {
  profile: UserProfile;
  plan: LifePlan;
  onChange: (plan: LifePlan) => void;
  onResetFromProfile: () => void;
  isMasked?: boolean;
}

const MASK = '✳︎✳︎✳︎✳︎✳︎✳︎';
const DEFAULT_VISIBLE = 10;

const LifePlanTimeline: React.FC<LifePlanTimelineProps> = ({
  profile, plan, onChange, onResetFromProfile, isMasked = false,
}) => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([0]));
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [loadingAiYears, setLoadingAiYears] = useState<Set<number>>(new Set());
  const [errorYears, setErrorYears] = useState<Map<number, string>>(new Map());

  const sortedYears = [...plan.years].sort((a, b) => a.yearOffset - b.yearOffset);
  const visibleYears = sortedYears.slice(0, visibleCount);

  const toggleExpand = (yearOffset: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(yearOffset)) {
        next.delete(yearOffset);
      } else {
        next.add(yearOffset);
      }
      return next;
    });
  };

  const updateYear = (yearOffset: number, patch: Partial<LifePlanYear>) => {
    onChange({
      ...plan,
      years: plan.years.map(y => y.yearOffset === yearOffset ? { ...y, ...patch } : y),
    });
  };

  const updateEvent = (yearOffset: number, eventId: string, patch: Partial<LifePlanEvent>) => {
    const year = plan.years.find(y => y.yearOffset === yearOffset);
    if (!year) return;
    const events = year.events.map(e => e.id === eventId ? { ...e, ...patch } : e);
    updateYear(yearOffset, { events });
  };

  const addEvent = (yearOffset: number) => {
    const year = plan.years.find(y => y.yearOffset === yearOffset);
    if (!year) return;
    const newEvent: LifePlanEvent = {
      id: Date.now().toString(),
      label: '',
      monthlyAmount: 0,
      category: 'expense',
      source: 'user',
    };
    updateYear(yearOffset, { events: [...year.events, newEvent] });
  };

  const removeEvent = (yearOffset: number, eventId: string) => {
    const year = plan.years.find(y => y.yearOffset === yearOffset);
    if (!year) return;
    updateYear(yearOffset, { events: year.events.filter(e => e.id !== eventId) });
  };

  const handleAskAI = async (yearOffset: number) => {
    const ctx = buildYearContext(yearOffset, profile);
    if (!profile.selfBirthYear && (!profile.children || profile.children.length === 0)) {
      setErrorYears(prev => new Map(prev).set(yearOffset, '設定タブでプロフィールを登録してください'));
      return;
    }

    setLoadingAiYears(prev => new Set(prev).add(yearOffset));
    setErrorYears(prev => {
      const next = new Map(prev);
      next.delete(yearOffset);
      return next;
    });

    try {
      const result = await suggestLifeEvents({
        calendarYear: ctx.calendarYear,
        yearOffset: ctx.yearOffset,
        selfAge: ctx.selfAge,
        childAges: ctx.childAges,
        lifeStageLabel: ctx.lifeStageLabel,
      });

      const year = plan.years.find(y => y.yearOffset === yearOffset);
      if (!year) return;

      // 既存のAI生成イベントを置き換え、ユーザー編集分は残す
      const userEvents = year.events.filter(e => e.source === 'user');
      const newAiEvents: LifePlanEvent[] = result.events.map((e, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        label: e.label,
        monthlyAmount: e.monthlyAmount,
        category: e.category,
        source: 'ai',
      }));

      updateYear(yearOffset, {
        events: [...newAiEvents, ...userEvents],
        aiGeneratedAt: Date.now(),
      });
    } catch (error) {
      setErrorYears(prev => new Map(prev).set(yearOffset, 'AI提案の取得に失敗しました'));
    } finally {
      setLoadingAiYears(prev => {
        const next = new Set(prev);
        next.delete(yearOffset);
        return next;
      });
    }
  };

  const formatAmount = (n: number) => isMasked ? MASK : `¥${n.toLocaleString()}`;

  const profileSet = profile.selfBirthYear !== undefined || profile.children.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles size={14} className="text-zinc-500" /> ライフプラン
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">年ごとの積立額と予想イベントを管理</p>
        </div>
        <button
          onClick={onResetFromProfile}
          className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
          title="プロフィールに基づいて初期値を再生成"
        >
          初期値に戻す
        </button>
      </div>

      {!profileSet && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>設定タブでプロフィールを登録</strong>すると、AIが各年の年齢を踏まえた予想イベントを提案できます。
          </div>
        </div>
      )}

      <div className="space-y-2">
        {visibleYears.map(year => {
          const ctx = buildYearContext(year.yearOffset, profile);
          const isExpanded = expandedYears.has(year.yearOffset);
          const isLoading = loadingAiYears.has(year.yearOffset);
          const errorMsg = errorYears.get(year.yearOffset);

          const totalExpense = year.events.filter(e => e.category === 'expense').reduce((s, e) => s + e.monthlyAmount, 0);
          const totalIncome = year.events.filter(e => e.category === 'income').reduce((s, e) => s + e.monthlyAmount, 0);

          return (
            <div
              key={year.yearOffset}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-shadow"
            >
              {/* Header (clickable) */}
              <button
                onClick={() => toggleExpand(year.yearOffset)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{ctx.calendarYear}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {year.yearOffset === 0 ? '今年' : `${year.yearOffset}年後`}
                    </span>
                    {ctx.lifeStageLabel && (
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                        {ctx.lifeStageLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {ctx.selfAge !== undefined && (
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5">
                        <User size={10} /> {ctx.selfAge}歳
                      </span>
                    )}
                    {ctx.childAges.map((c, idx) => (
                      <span key={idx} className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5">
                        <Baby size={10} /> {c.name} {c.age >= 0 ? `${c.age}歳` : '未生'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatAmount(year.monthlyInvest)}
                  </div>
                  <div className="text-[10px] text-zinc-500">月積立</div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3 pt-3">
                  {/* Monthly invest input */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">月の積立額</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">¥</span>
                      <input
                        type="number"
                        value={year.monthlyInvest}
                        onChange={(e) => updateYear(year.yearOffset, { monthlyInvest: Number(e.target.value) || 0 })}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm font-bold"
                      />
                    </div>
                  </div>

                  {/* Events section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">想定される収支イベント</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAskAI(year.yearOffset)}
                          disabled={isLoading}
                          className="text-[10px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2.5 py-1 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin"></div>
                              提案中
                            </>
                          ) : (
                            <>
                              <Sparkles size={10} />
                              {year.aiGeneratedAt ? '再提案' : 'AIに提案'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => addEvent(year.yearOffset)}
                          className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-0.5"
                        >
                          <Plus size={10} /> 追加
                        </button>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded px-2 py-1 mb-2">
                        {errorMsg}
                      </div>
                    )}

                    {year.events.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center py-3 bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                        AIに提案してもらうか、+追加で記入してください
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {year.events.map(event => (
                          <div
                            key={event.id}
                            className={`flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/60 border rounded-lg p-1.5 ${
                              event.category === 'income'
                                ? 'border-emerald-200/60 dark:border-emerald-500/20'
                                : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {event.category === 'income' ? (
                              <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-0.5" />
                            ) : (
                              <TrendingDown size={12} className="text-rose-500 flex-shrink-0 ml-0.5" />
                            )}
                            <input
                              type="text"
                              value={event.label}
                              onChange={(e) => updateEvent(year.yearOffset, event.id, { label: e.target.value })}
                              placeholder="項目名"
                              className="flex-1 min-w-0 text-[11px] bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zinc-400"
                            />
                            <select
                              value={event.category}
                              onChange={(e) => updateEvent(year.yearOffset, event.id, { category: e.target.value as 'income' | 'expense' })}
                              className="text-[10px] bg-transparent text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 outline-none"
                            >
                              <option value="expense">支出</option>
                              <option value="income">収入</option>
                            </select>
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] text-zinc-500">¥</span>
                              <input
                                type="number"
                                value={event.monthlyAmount}
                                onChange={(e) => updateEvent(year.yearOffset, event.id, { monthlyAmount: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-16 text-[11px] bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zinc-400 text-right font-semibold"
                              />
                              <span className="text-[9px] text-zinc-500">/月</span>
                            </div>
                            {event.source === 'ai' && (
                              <span className="text-[9px] text-zinc-400" title="AI提案">✨</span>
                            )}
                            <button
                              onClick={() => removeEvent(year.yearOffset, event.id)}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}

                        {(totalExpense > 0 || totalIncome > 0) && (
                          <div className="flex justify-end gap-4 pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            {totalIncome > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{formatAmount(totalIncome)}/月</span>}
                            {totalExpense > 0 && <span className="text-rose-600 dark:text-rose-400">-{formatAmount(totalExpense)}/月</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Memo */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <MessageSquare size={10} /> メモ
                    </label>
                    <textarea
                      value={year.memo}
                      onChange={(e) => updateYear(year.yearOffset, { memo: e.target.value })}
                      placeholder="例) 昇進で年収+30万予定、配偶者の育休復帰..."
                      rows={2}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-[12px] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visibleCount < sortedYears.length && (
        <button
          onClick={() => setVisibleCount(prev => Math.min(prev + 10, sortedYears.length))}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 py-2.5 rounded-xl transition-colors"
        >
          さらに {Math.min(10, sortedYears.length - visibleCount)}年分を表示（残り {sortedYears.length - visibleCount}年）
        </button>
      )}
    </div>
  );
};

export default LifePlanTimeline;
