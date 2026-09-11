export type VoteCount = { option_index: number; votes: number };

export type TallyItem = { index: number; label: string; votes: number; pct: number };

export type DilemmaResult = { tally: TallyItem[]; total: number };

export type ScaleResult = {
  tally: TallyItem[];
  total: number;
  average: number;
};

function pct(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0;
}

/** Tally votes for a dilemma question, one bucket per option label. */
export function tallyDilemma(options: string[], counts: VoteCount[]): DilemmaResult {
  const total = counts.reduce((s, c) => s + c.votes, 0);
  const tally: TallyItem[] = options.map((label, index) => {
    const votes = counts.find((c) => c.option_index === index)?.votes ?? 0;
    return { index, label, votes, pct: pct(votes, total) };
  });
  return { tally, total };
}

/** Tally votes for a scale question (1..scaleMax) and compute the average. */
export function tallyScale(scaleMax: number, counts: VoteCount[]): ScaleResult {
  const total = counts.reduce((s, c) => s + c.votes, 0);
  const tally: TallyItem[] = Array.from({ length: scaleMax }, (_, i) => {
    const value = i + 1;
    const votes = counts.find((c) => c.option_index === value)?.votes ?? 0;
    return { index: value, label: String(value), votes, pct: pct(votes, total) };
  });
  const average = total > 0
    ? tally.reduce((s, t) => s + t.index * t.votes, 0) / total
    : 0;
  return { tally, total, average };
}

/** Normalize a word-cloud submission the same way for storage and dedup. */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/** Max length (in characters) for an open-ended free-text answer. */
export const MAX_TEXT_ANSWER_LENGTH = 300;

/** A free-text answer is valid if it's non-empty after trimming and within the length limit. */
export function isValidTextAnswer(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TEXT_ANSWER_LENGTH;
}
