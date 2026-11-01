import { describe, expect, it } from "vitest";
import { isCompleteQuestionOrder } from "./question-order";

describe("isCompleteQuestionOrder", () => {
  const questionIds = ["first", "second", "third"];

  it("accepts a complete permutation", () => {
    expect(isCompleteQuestionOrder(["third", "first", "second"], questionIds)).toBe(true);
  });

  it("rejects missing, duplicate, and foreign question IDs", () => {
    expect(isCompleteQuestionOrder(["first", "second"], questionIds)).toBe(false);
    expect(isCompleteQuestionOrder(["first", "first", "third"], questionIds)).toBe(false);
    expect(isCompleteQuestionOrder(["first", "second", "other"], questionIds)).toBe(false);
  });
});
