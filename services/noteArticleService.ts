import { FinancialConfig, MonthlyRecord, NoteProfile, UserProfile } from '../types';

export interface RecordWithTotals extends MonthlyRecord {
  calculatedTotalCash: number;
  calculatedTotalInvest: number;
}

export interface MilestoneRow {
  label: string;   // 例: 1,000万円
  achieved: string; // 例: 2027年11月 / 30年以内に未達
}

export interface NoteArticleInput {
  record: RecordWithTotals;
  history: RecordWithTotals[];
  config: FinancialConfig;
  profile: UserProfile;
  noteProfile: NoteProfile;
  milestones: MilestoneRow[];
  /** AIが書いた本文パーツ。取得できなければ省略される */
  commentary?: NoteCommentary;
}

export interface NoteCommentary {
  assetComment: string;     // 資産状況へのひとこと
  incomeComment: string;    // 収入について
  sideJobComment: string;   // 副業について
  expenseComment: string;   // 支出について
  balanceComment: string;   // 収支まとめ
  topicHeading: string;     // その月のトピック見出し
  topicBody: string;        // トピック本文
  closing: string;          // まとめの締め
}

const yen = (n: number) => `${Math.round(n).toLocaleString()}円`;
const man = (n: number) => `約${Math.round(n / 10000).toLocaleString()}万円`;

const monthLabel = (id: string) => {
  const [y, m] = id.split('-');
  return `${y}年${Number(m)}月`;
};

export const buildNoteArticle = (input: NoteArticleInput): string => {
  const { record, history, config, profile, noteProfile, milestones, commentary } = input;

  const cash = record.calculatedTotalCash;
  const invest = record.calculatedTotalInvest;
  const total = cash + invest;

  const income =
    record.salaryIncome + record.sideHustleIncome + record.childAllowanceIncome;
  const expense =
    record.nurseryExpense + record.creditCardExpense + record.pocketMoneyExpense;
  const flow = record.calculatedCashFlow ?? income - expense - record.investmentTrust;

  const achieveRate = config.targetCash > 0
    ? Math.round((cash / config.targetCash) * 100)
    : 0;

  const currentYear = new Date().getFullYear();
  const selfAge = profile.selfBirthYear ? currentYear - profile.selfBirthYear : undefined;
  const familySize = 2 + (profile.children?.length ?? 0);

  // お小遣いの推移（直近4ヶ月）
  const recentPocket = history
    .slice(-4)
    .map(r => `${Number(r.id.split('-')[1])}月　${yen(r.pocketMoneyExpense)}`);

  const L: string[] = [];
  const add = (s = '') => L.push(s);

  // ---- 冒頭 ----
  add(`こんにちは、${noteProfile.penName || '（ペンネーム未設定）'}です。`);
  add();
  add('このブログでは');
  add();
  add(noteProfile.intro);
  add();
  add('などについて発信しています。');
  add();
  const ageText = selfAge !== undefined ? `現在${selfAge}歳の` : '';
  add(`私は${ageText}会社員で、${familySize}人家族です。`);
  if (noteProfile.background) {
    add();
    add(noteProfile.background);
  }
  add();
  add('現在は');
  add();
  add(`「${noteProfile.goal}」`);
  add();
  add('ことを目標に資産形成を進めています。');
  add();
  add(`今回は${monthLabel(record.id)}の家計と資産状況を公開します。`);
  add();

  // ---- 資産状況 ----
  add('## 現在の資産状況');
  add();
  add(`・現金　${yen(cash)}`);
  add(`・投資信託　${yen(invest)}`);
  add(`・総資産　${yen(total)}（${man(total)}）`);
  if (commentary?.assetComment) {
    add();
    add(commentary.assetComment);
  }
  add();

  // ---- 生活防衛資金 ----
  add('## 生活防衛資金の状況');
  add();
  add(`・目標　${yen(config.targetCash)}`);
  add(`・現在の現金　${yen(cash)}`);
  add(`・達成率　${achieveRate}%`);
  add();
  add(
    cash >= config.targetCash
      ? '目標を上回っているため、引き続き投資最大化フェーズで運用しています。'
      : '目標に届いていないため、現金を優先して積み上げるフェーズです。'
  );
  add();

  // ---- 積立額 ----
  add('## 毎月の積立額');
  add();
  add(`・基本積立　${yen(config.targetInvestmentBase)}`);
  add(`・育児（児童手当）から　${yen(config.targetInvestmentAddon)}`);
  add(`・合計　${yen(config.targetInvestmentBase + config.targetInvestmentAddon)} / 月`);
  add();

  // ---- 将来予測 ----
  if (milestones.length > 0) {
    add('## 将来の資産到達予測');
    add();
    add('現在のペースで投資を続けた場合の予測です。');
    add();
    milestones.forEach(m => add(`・${m.label}　${m.achieved}`));
    add();
  }

  // ---- 収入 ----
  add(`## ${monthLabel(record.id)}の収支`);
  add();
  add(`・給与　${yen(record.salaryIncome)}`);
  add(`・副業　${yen(record.sideHustleIncome)}`);
  add(`・児童手当　${yen(record.childAllowanceIncome)}`);
  add(`・収入合計　${yen(income)}`);
  if (commentary?.incomeComment) {
    add();
    add(commentary.incomeComment);
  }
  add();

  // ---- 副業 ----
  if (record.sideHustleIncome > 0) {
    add('### 副業について');
    add();
    if (noteProfile.sideJobName) {
      add(`現在、${noteProfile.sideJobName}として副業を行っています。`);
      add();
    }
    add(`・今月の収益　${yen(record.sideHustleIncome)}`);
    if (commentary?.sideJobComment) {
      add();
      add(commentary.sideJobComment);
    }
    add();
  }

  // ---- 支出 ----
  add(`## ${monthLabel(record.id)}の支出`);
  add();
  add(`・保育園　${yen(record.nurseryExpense)}`);
  add(`・クレジットカード（生活費）　${yen(record.creditCardExpense)}`);
  add(`・お小遣い　${yen(record.pocketMoneyExpense)}`);
  add(`・支出合計　${yen(expense)}`);
  if (commentary?.expenseComment) {
    add();
    add(commentary.expenseComment);
  }
  add();

  // ---- 収支まとめ ----
  add(`## ${monthLabel(record.id)}の収支まとめ`);
  add();
  add(`・総収入　${yen(income)}`);
  add(`・総支出（投資除く）　${yen(expense)}`);
  add(`・投資額　${yen(record.investmentTrust)}`);
  add(`・現金収支　${flow >= 0 ? '+' : ''}${yen(flow)}`);
  if (commentary?.balanceComment) {
    add();
    add(commentary.balanceComment);
  }
  add();

  // ---- その月のトピック ----
  if (commentary?.topicHeading && commentary?.topicBody) {
    add(`## ${commentary.topicHeading}`);
    add();
    add(commentary.topicBody);
    add();
    if (record.pocketMoneyExpense > config.pocketMoneyTarget && recentPocket.length > 1) {
      add('お小遣いの推移です。');
      add();
      recentPocket.forEach(p => add(`・${p}`));
      add();
    }
  }

  // ---- まとめ ----
  add('## まとめ');
  add();
  add(`・家族　${familySize}人`);
  add(`・総資産　${man(total)}`);
  add(`・毎月積立　${yen(config.targetInvestmentBase + config.targetInvestmentAddon)}`);
  if (milestones[0]) {
    add(`・${milestones[0].label}到達　${milestones[0].achieved}`);
  }
  if (commentary?.closing) {
    add();
    add(commentary.closing);
  }
  add();
  add('次回もぜひフォローして応援いただけると嬉しいです！');

  return L.join('\n');
};
