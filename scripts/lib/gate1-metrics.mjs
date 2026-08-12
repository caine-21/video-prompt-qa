const DECISIONS = ["READY_TO_GENERATE", "NEEDS_REVISION", "NEEDS_USER_DECISION"];

function ratio(numerator, denominator) {
  return {
    numerator,
    denominator,
    value: denominator === 0 ? null : numerator / denominator
  };
}
export function normalizeLegacyDecision(decision) {
  if (decision === "generate_ok") return "READY_TO_GENERATE";
  if (decision === "revise_first") return "NEEDS_REVISION";
  return "NEEDS_USER_DECISION";
}

export function calculateDecisionMetrics(cases, predictions) {
  const evaluated = cases.filter((item) => predictions.has(item.id));
  const safe = evaluated.filter((item) => item.expected_decision === "READY_TO_GENERATE");
  const unsafe = evaluated.filter((item) => item.expected_decision !== "READY_TO_GENERATE");
  const preventable = evaluated.filter((item) => item.preventable_failure === true);

  const distribution = Object.fromEntries(DECISIONS.map((decision) => [decision, 0]));
  for (const item of evaluated) {
    const predicted = predictions.get(item.id);
    if (predicted in distribution) distribution[predicted] += 1;
  }

  return {
    evaluated_cases: evaluated.length,
    missing_predictions: cases.length - evaluated.length,
    decision_distribution: distribution,
    false_block_rate: ratio(
      safe.filter((item) => predictions.get(item.id) !== "READY_TO_GENERATE").length,
      safe.length
    ),
    unsafe_pass_rate: ratio(
      unsafe.filter((item) => predictions.get(item.id) === "READY_TO_GENERATE").length,
      unsafe.length
    ),
    preventable_failure_recall: ratio(
      preventable.filter((item) => predictions.get(item.id) !== "READY_TO_GENERATE").length,
      preventable.length
    )
  };
}

export function calculateCoverage(items, predicate) {
  return ratio(items.filter(predicate).length, items.length);
}
