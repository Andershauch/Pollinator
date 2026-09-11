import { describe, it, expect } from "vitest";
import { tallyDilemma, tallyScale, normalizeWord, isValidTextAnswer, MAX_TEXT_ANSWER_LENGTH, tallyRanking, isValidRanking } from "./aggregate";

describe("tallyDilemma", () => {
  it("builds one bucket per option, defaulting to zero votes", () => {
    const { tally, total } = tallyDilemma(["Ja", "Nej"], []);
    expect(tally).toEqual([
      { index: 0, label: "Ja", votes: 0, pct: 0 },
      { index: 1, label: "Nej", votes: 0, pct: 0 },
    ]);
    expect(total).toBe(0);
  });

  it("tallies votes by option_index and computes percentages", () => {
    const { tally, total } = tallyDilemma(
      ["Ja", "Nej"],
      [
        { option_index: 0, votes: 3 },
        { option_index: 1, votes: 1 },
      ]
    );
    expect(total).toBe(4);
    expect(tally).toEqual([
      { index: 0, label: "Ja", votes: 3, pct: 75 },
      { index: 1, label: "Nej", votes: 1, pct: 25 },
    ]);
  });

  it("rounds percentages independently per option", () => {
    const { tally } = tallyDilemma(
      ["A", "B", "C"],
      [
        { option_index: 0, votes: 1 },
        { option_index: 1, votes: 1 },
        { option_index: 2, votes: 1 },
      ]
    );
    // 1/3 rounds to 33% for each — percentages need not sum to 100.
    expect(tally.map((t) => t.pct)).toEqual([33, 33, 33]);
  });

  it("ignores counts for option_index values with no matching option", () => {
    const { tally, total } = tallyDilemma(
      ["Only option"],
      [
        { option_index: 0, votes: 2 },
        { option_index: 5, votes: 9 },
      ]
    );
    // total reflects all counts passed in, even orphaned ones
    expect(total).toBe(11);
    expect(tally).toEqual([{ index: 0, label: "Only option", votes: 2, pct: 18 }]);
  });
});

describe("tallyScale", () => {
  it("builds a bucket for every value from 1 to scaleMax", () => {
    const { tally } = tallyScale(5, []);
    expect(tally.map((t) => t.index)).toEqual([1, 2, 3, 4, 5]);
    expect(tally.every((t) => t.votes === 0)).toBe(true);
  });

  it("computes a vote-weighted average", () => {
    const { average, total } = tallyScale(10, [
      { option_index: 10, votes: 2 },
      { option_index: 2, votes: 1 },
    ]);
    expect(total).toBe(3);
    // (10*2 + 2*1) / 3 = 22/3
    expect(average).toBeCloseTo(22 / 3, 5);
  });

  it("returns average 0 when there are no votes, without dividing by zero", () => {
    const { average, total } = tallyScale(10, []);
    expect(total).toBe(0);
    expect(average).toBe(0);
    expect(Number.isFinite(average)).toBe(true);
  });

  it("respects a non-default scaleMax (e.g. a 1-5 scale)", () => {
    const { tally, total, average } = tallyScale(5, [
      { option_index: 5, votes: 4 },
      { option_index: 1, votes: 1 },
    ]);
    expect(tally).toHaveLength(5);
    expect(total).toBe(5);
    // (5*4 + 1*1) / 5 = 21/5
    expect(average).toBeCloseTo(21 / 5, 5);
  });
});

describe("normalizeWord", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeWord("  hygge  ")).toBe("hygge");
  });

  it("lowercases so dedup is case-insensitive", () => {
    expect(normalizeWord("Fællesskab")).toBe("fællesskab");
  });

  it("treats differently-cased/whitespaced input as the same word", () => {
    expect(normalizeWord(" Trivsel")).toBe(normalizeWord("trivsel "));
  });
});

describe("isValidTextAnswer", () => {
  it("rejects an empty string", () => {
    expect(isValidTextAnswer("")).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    expect(isValidTextAnswer("   \n\t  ")).toBe(false);
  });

  it("accepts ordinary text", () => {
    expect(isValidTextAnswer("Jeg bruger for meget tid på at sortere papirer")).toBe(true);
  });

  it("accepts an answer exactly at the max length", () => {
    expect(isValidTextAnswer("a".repeat(MAX_TEXT_ANSWER_LENGTH))).toBe(true);
  });

  it("rejects an answer one character over the max length", () => {
    expect(isValidTextAnswer("a".repeat(MAX_TEXT_ANSWER_LENGTH + 1))).toBe(false);
  });

  it("measures length after trimming surrounding whitespace", () => {
    const padded = "  " + "a".repeat(MAX_TEXT_ANSWER_LENGTH) + "  ";
    expect(isValidTextAnswer(padded)).toBe(true);
  });
});

describe("tallyRanking", () => {
  const options = ["A", "B", "C"];

  it("scores 1st choice highest (N points) down to 1 point for last", () => {
    const { ranking, total } = tallyRanking(options, [[0, 1, 2]]);
    expect(total).toBe(1);
    expect(ranking).toEqual([
      { index: 0, label: "A", points: 3 },
      { index: 1, label: "B", points: 2 },
      { index: 2, label: "C", points: 1 },
    ]);
  });

  it("sums Borda points across multiple rankings and sorts descending", () => {
    const { ranking, total } = tallyRanking(options, [
      [0, 1, 2], // A=3, B=2, C=1
      [1, 0, 2], // B=3, A=2, C=1
      [1, 2, 0], // B=3, C=2, A=1
    ]);
    expect(total).toBe(3);
    // A: 3+2+1=6, B: 2+3+3=8, C: 1+1+2=4
    expect(ranking).toEqual([
      { index: 1, label: "B", points: 8 },
      { index: 0, label: "A", points: 6 },
      { index: 2, label: "C", points: 4 },
    ]);
  });

  it("breaks ties by preserving the original option order (stable sort)", () => {
    const { ranking } = tallyRanking(["A", "B"], [[0, 1], [1, 0]]);
    // Both score 3 points each — original order (A before B) should win the tie.
    expect(ranking).toEqual([
      { index: 0, label: "A", points: 3 },
      { index: 1, label: "B", points: 3 },
    ]);
  });

  it("returns all-zero points and no crash when there are no rankings yet", () => {
    const { ranking, total } = tallyRanking(options, []);
    expect(total).toBe(0);
    expect(ranking.every((r) => r.points === 0)).toBe(true);
    expect(ranking.map((r) => r.index)).toEqual([0, 1, 2]);
  });
});

describe("isValidRanking", () => {
  it("accepts a full permutation of option indices", () => {
    expect(isValidRanking([2, 0, 1], 3)).toBe(true);
  });

  it("rejects a ranking with the wrong length", () => {
    expect(isValidRanking([0, 1], 3)).toBe(false);
  });

  it("rejects a ranking with a duplicate index", () => {
    expect(isValidRanking([0, 0, 1], 3)).toBe(false);
  });

  it("rejects a ranking with an out-of-range index", () => {
    expect(isValidRanking([0, 1, 5], 3)).toBe(false);
  });

  it("rejects a non-array value", () => {
    expect(isValidRanking("not an array", 3)).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(isValidRanking([0, 1.5, 2], 3)).toBe(false);
  });
});
