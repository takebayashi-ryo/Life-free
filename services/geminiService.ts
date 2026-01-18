import { GoogleGenAI } from "@google/genai";
import { FinancialConfig, MonthlyRecord } from "../types";

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