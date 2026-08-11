import { GoogleGenAI } from "@google/genai";
import { FinancialConfig, MonthlyRecord, LifePlanEvent } from "../types";

export const generateFinancialAdvice = async (
  currentMonth: MonthlyRecord,
  config: FinancialConfig,
  currentCashTotal: number
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    あなたはプロのファイナンシャルプランナーです。以下の家計状況に基づいて、300文字以内で簡潔かつ具体的なアドバイスをください。
    
    【目標】
    - 生活防衛資金（現金）目標: ${config.targetCash.toLocaleString()}円 (現在: ${currentCashTotal.toLocaleString()}円)
    - 毎月の投資目標: ${(config.targetInvestmentBase + config.targetInvestmentAddon).toLocaleString()}円
    - お小遣い上限: ${config.pocketMoneyTarget.toLocaleString()}円

    【今月の実績 (${currentMonth.monthStr})】
    - 給与手取り: ${currentMonth.salaryIncome.toLocaleString()}円
    - 副業収入: ${currentMonth.sideHustleIncome.toLocaleString()}円 (全額現金補充推奨)
    - 児童手当: ${currentMonth.childAllowanceIncome.toLocaleString()}円 (全額投資推奨)
    - お小遣い使用額: ${currentMonth.pocketMoneyExpense.toLocaleString()}円
    - 実際の投資額: ${currentMonth.investmentTrust.toLocaleString()}円
    - 現金収支（今月の増減）: ${currentMonth.calculatedCashFlow?.toLocaleString()}円

    【判定ルール】
    1. 現金目標(${config.targetCash}円)に到達していない場合、副業収入や余剰資金は投資より現金の積み上げを優先すべきと助言してください。
    2. お小遣いが目標(${config.pocketMoneyTarget}円)を超えている場合は警告してください。
    3. 児童手当(${config.childAllowance}円)がしっかり投資に回せているか確認してください。
    4. 励ましを含めてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "アドバイスを生成できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AIアドバイスの取得中にエラーが発生しました。";
  }
};

export interface DashboardAdviceParams {
  config: FinancialConfig;
  currentCash: number;
  currentInvestTotal: number;
  historyData: Array<MonthlyRecord & { calculatedTotalCash: number; calculatedTotalInvest: number }>;
  monthsToGoal: number;
  cashGap: number;
  simulationMilestones: {
    m1000: Date | null;
    m3000: Date | null;
    m5000: Date | null;
  };
  recentAvgCashFlow: number;
}

export const generateDashboardAnswer = async (params: DashboardAdviceParams & { question: string }): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const { config, currentCash, currentInvestTotal, historyData, monthsToGoal, cashGap, simulationMilestones, recentAvgCashFlow, question } = params;

  // 直近6ヶ月分のデータを取得
  const recentRecords = historyData.slice(-6);
  const cashGoalPercentage = Math.round((currentCash / config.targetCash) * 100);
  const isCashPhase = currentCash < config.targetCash;
  const targetMonthlyInvest = config.targetInvestmentBase + config.targetInvestmentAddon;

  // 直近の収入・支出の平均を計算
  const avgIncome = recentRecords.length > 0 
    ? recentRecords.reduce((sum, r) => sum + r.salaryIncome + r.sideHustleIncome + r.childAllowanceIncome, 0) / recentRecords.length
    : 0;
  const avgExpense = recentRecords.length > 0
    ? recentRecords.reduce((sum, r) => sum + r.nurseryExpense + r.creditCardExpense + r.pocketMoneyExpense, 0) / recentRecords.length
    : 0;
  const avgInvest = recentRecords.length > 0
    ? recentRecords.reduce((sum, r) => sum + r.investmentTrust, 0) / recentRecords.length
    : 0;

  const prompt = `
あなたはプロのファイナンシャルプランナーです。ユーザーからの質問に対して、以下のダッシュボード全体の情報を元に回答してください。

【ユーザーの質問】
${question}

【現在の資産状況】
- 現金残高: ${currentCash.toLocaleString()}円 (目標: ${config.targetCash.toLocaleString()}円、達成率: ${cashGoalPercentage}%)
- 投資信託総額: ${currentInvestTotal.toLocaleString()}円
- 資産合計: ${(currentCash + currentInvestTotal).toLocaleString()}円
- 現在の戦略フェーズ: ${isCashPhase ? '現金優先フェーズ（生活防衛資金の積み上げ中）' : '投資最大化フェーズ（現金目標達成済み）'}

【目標設定】
- 生活防衛資金目標: ${config.targetCash.toLocaleString()}円
- 毎月の投資目標: ${targetMonthlyInvest.toLocaleString()}円
- お小遣い上限: ${config.pocketMoneyTarget.toLocaleString()}円

【直近6ヶ月の実績（平均値）】
- 平均月収入: ${avgIncome.toLocaleString()}円 (給与+副業+児童手当)
- 平均月支出: ${avgExpense.toLocaleString()}円 (保育園+クレカ+お小遣い)
- 平均月投資額: ${avgInvest.toLocaleString()}円
- 平均現金収支: ${recentAvgCashFlow > 0 ? '+' : ''}${recentAvgCashFlow.toLocaleString()}円

【目標達成までの見込み】
${cashGap > 0 
  ? `- 現金目標まで: あと ${cashGap.toLocaleString()}円${monthsToGoal > 0 ? `（約${monthsToGoal}ヶ月）` : '（期間未定）'}`
  : '- 現金目標を達成済み'}
${monthsToGoal === -1 ? '- 現金収支がマイナスのため、目標達成までの期間を計算できません' : ''}

【将来の資産予測マイルストーン】
- 資産1,000万円達成予測: ${simulationMilestones.m1000 ? `${simulationMilestones.m1000.getFullYear()}年${simulationMilestones.m1000.getMonth() + 1}月` : '未達'}
- 資産3,000万円達成予測: ${simulationMilestones.m3000 ? `${simulationMilestones.m3000.getFullYear()}年${simulationMilestones.m3000.getMonth() + 1}月` : '未達'}
- 資産5,000万円達成予測: ${simulationMilestones.m5000 ? `${simulationMilestones.m5000.getFullYear()}年${simulationMilestones.m5000.getMonth() + 1}月` : '未達'}

【月次レポート詳細（直近6ヶ月）】
${recentRecords.map((r, idx) => `
${idx + 1}. ${r.id}:
   - 給与: ${r.salaryIncome.toLocaleString()}円、副業: ${r.sideHustleIncome.toLocaleString()}円、児童手当: ${r.childAllowanceIncome.toLocaleString()}円
   - 保育園: ${r.nurseryExpense.toLocaleString()}円、クレカ: ${r.creditCardExpense.toLocaleString()}円、お小遣い: ${r.pocketMoneyExpense.toLocaleString()}円
   - 投資: ${r.investmentTrust.toLocaleString()}円、現金収支: ${(r.calculatedCashFlow || 0) > 0 ? '+' : ''}${(r.calculatedCashFlow || 0).toLocaleString()}円
   - 現金残高: ${r.calculatedTotalCash.toLocaleString()}円、投資残高: ${r.calculatedTotalInvest.toLocaleString()}円
`).join('')}

上記の情報を基に、ユーザーの質問に対して具体的で実践的な回答を提供してください。数値やデータを引用しながら、分かりやすく説明してください。
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "回答を生成できませんでした。";
  } catch (error) {
    console.error("Gemini API Error (Dashboard Q&A):", error);
    return "AI回答の取得中にエラーが発生しました。";
  }
};

export interface YearSuggestionInput {
  calendarYear: number;
  yearOffset: number;        // 何年後か
  selfAge?: number;
  childAges: Array<{ name: string; age: number }>;
  lifeStageLabel?: string;
}

export interface YearSuggestionResult {
  events: Array<Omit<LifePlanEvent, 'id' | 'source'>>;
  rationale: string;
}

// その年に予想される収支イベントをAIに提案させる
export const suggestLifeEvents = async (input: YearSuggestionInput): Promise<YearSuggestionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const childInfo = input.childAges.length > 0
    ? input.childAges.map(c => `${c.name}: ${c.age}歳`).join(', ')
    : '子供なし';

  const prompt = `
あなたは日本のファイナンシャルプランナーです。以下の家庭が「${input.calendarYear}年」(${input.yearOffset === 0 ? '今年' : `${input.yearOffset}年後`})に直面する可能性のある月次の収入・支出イベントを予測してください。

【家庭の状況】
- 自分の年齢: ${input.selfAge !== undefined ? `${input.selfAge}歳` : '不明'}
- 子供: ${childInfo}
- ライフステージ: ${input.lifeStageLabel || '不明'}

【出力フォーマット】
以下のJSONを **そのまま** 返してください。説明文や前置きは一切不要です。コードブロックや \`\`\`json も付けないでください。

{
  "events": [
    { "label": "保育料", "monthlyAmount": 24000, "category": "expense" },
    { "label": "児童手当", "monthlyAmount": 30000, "category": "income" }
  ],
  "rationale": "保育園期のため保育料が発生。児童手当は中学卒業まで継続。"
}

【ルール】
1. monthlyAmount は **正の整数** (月額・円)。category で支出か収入か判別。
2. 一般的かつ標準的な金額を使用（保育料は地域差ありますが2-3万円目安、習い事1万円目安、塾2万円目安など）
3. eventsは最大6件まで
4. rationaleは100文字以内
5. 子供が複数いる場合、それぞれに対応した支出を別エントリで列挙
6. その年に "新たに発生する" or "継続する" 主要な収支イベントのみ
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text || '';

    // JSON取り出し（コードブロックで囲まれていても対応）
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const events: Array<Omit<LifePlanEvent, 'id' | 'source'>> = (parsed.events || []).map((e: any) => ({
      label: String(e.label || ''),
      monthlyAmount: Math.max(0, Math.round(Number(e.monthlyAmount) || 0)),
      category: e.category === 'income' ? 'income' : 'expense',
    }));

    return {
      events,
      rationale: String(parsed.rationale || ''),
    };
  } catch (error) {
    console.error("Gemini API Error (Year Suggestion):", error);
    throw error;
  }
};
export interface NoteCommentaryInput {
  monthLabel: string;        // 例: 2026年3月
  totalAssets: number;
  totalAssetsDiff: number | null;
  cash: number;
  invest: number;
  targetCash: number;
  salaryIncome: number;
  sideHustleIncome: number;
  prevSideHustleIncome: number | null;
  childAllowanceIncome: number;
  nurseryExpense: number;
  creditCardExpense: number;
  pocketMoneyExpense: number;
  pocketMoneyTarget: number;
  recentPocketMoney: Array<{ month: string; amount: number }>;
  investmentTrust: number;
  targetInvest: number;
  cashFlow: number;
}

// 記事の「地の文」だけをAIに書かせる。金額はアプリ側で埋めるため、
// ここで数値を出力させると二重表示や桁の取り違えが起きる。
export const generateNoteCommentary = async (input: NoteCommentaryInput) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const pocketHistory = input.recentPocketMoney
    .map(p => `${p.month}: ${p.amount.toLocaleString()}円`)
    .join(' / ');

  const prompt = `
あなたは家計・資産形成を発信するブロガー本人です。${input.monthLabel}の資産公開記事に添える
コメント文だけを書いてください。

【今月の状況】
- 総資産: ${input.totalAssets.toLocaleString()}円 ${input.totalAssetsDiff !== null ? `(先月比 ${input.totalAssetsDiff >= 0 ? '+' : ''}${input.totalAssetsDiff.toLocaleString()}円)` : ''}
- 現金: ${input.cash.toLocaleString()}円 / 生活防衛資金の目標: ${input.targetCash.toLocaleString()}円
- 投資信託: ${input.invest.toLocaleString()}円
- 給与: ${input.salaryIncome.toLocaleString()}円
- 副業: ${input.sideHustleIncome.toLocaleString()}円 ${input.prevSideHustleIncome !== null ? `(先月 ${input.prevSideHustleIncome.toLocaleString()}円)` : ''}
- 児童手当: ${input.childAllowanceIncome.toLocaleString()}円
- 保育園: ${input.nurseryExpense.toLocaleString()}円
- カード(生活費): ${input.creditCardExpense.toLocaleString()}円
- お小遣い: ${input.pocketMoneyExpense.toLocaleString()}円 (上限の設定は ${input.pocketMoneyTarget.toLocaleString()}円)
- お小遣いの推移: ${pocketHistory}
- 投資額: ${input.investmentTrust.toLocaleString()}円 (目標 ${input.targetInvest.toLocaleString()}円)
- 現金収支: ${input.cashFlow >= 0 ? '+' : ''}${input.cashFlow.toLocaleString()}円

【出力フォーマット】
以下のJSONだけを返してください。前置き・説明・コードブロックは不要です。

{
  "assetComment": "",
  "incomeComment": "",
  "sideJobComment": "",
  "expenseComment": "",
  "balanceComment": "",
  "topicHeading": "",
  "topicBody": "",
  "closing": ""
}

【書き方のルール】
1. ですます調。読者に語りかける個人ブログの文体
2. 各コメントは1〜3文。短く
3. 絵文字は多くて1つ。🎉✅😅 程度にとどめる。無くてもよい
4. **金額の数字は書かない**。金額はアプリ側で表を作るので、
   ここで書くと重複する。「目標を大きく超えました」のように言葉で表現する
5. 良くない月は正直に書く。無理に前向きにまとめない
6. topicHeading はその月で一番語る価値のある一点。
   例:「お小遣いが目標を大きく超えました」「投資額を守り切れた月」
   topicBody はその掘り下げを2〜4文で
7. closing は記事全体の締め。翌月への一言を含める
8. 誇張しない。断定しすぎない
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON not found');

    const p = JSON.parse(match[0]);
    const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    return {
      assetComment: s(p.assetComment),
      incomeComment: s(p.incomeComment),
      sideJobComment: s(p.sideJobComment),
      expenseComment: s(p.expenseComment),
      balanceComment: s(p.balanceComment),
      topicHeading: s(p.topicHeading),
      topicBody: s(p.topicBody),
      closing: s(p.closing),
    };
  } catch (error) {
    console.error('Gemini API Error (note commentary):', error);
    throw error;
  }
};
