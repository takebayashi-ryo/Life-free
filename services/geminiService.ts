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