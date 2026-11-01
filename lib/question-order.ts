/** Returns true only when every session question occurs exactly once. */
export function isCompleteQuestionOrder(order: unknown, questionIds: Iterable<string>): order is string[] {
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    return false;
  }

  const expected = new Set(questionIds);
  const received = new Set(order);

  return expected.size === order.length && received.size === order.length && order.every((id) => expected.has(id));
}
