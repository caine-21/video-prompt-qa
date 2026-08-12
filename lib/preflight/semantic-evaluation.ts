import { z } from "zod";
import { SemanticFindingSchema, type SemanticFinding } from "./semantic-analyst.ts";

export const SemanticCategorySchema = z.enum([
  "ambiguity",
  "conflict",
  "continuity",
  "intent",
  "feasibility"
]);

export const GroundTruthFindingSchema = z.object({
  finding_id: z.string().min(1),
  category: SemanticCategorySchema,
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().min(1),
  preventable: z.boolean(),
  evidence_span: z.string().min(1),
  acceptable_alternatives: z.array(z.string().min(1)),
  meaning_keywords: z.array(z.string().min(1)).min(1),
  label_confidence: z.enum(["high", "medium", "provisional"]),
  label_provenance: z.string().min(1)
}).strict();

export const SemanticEvalCaseSchema = z.object({
  eval_case_id: z.string().min(1),
  split: z.enum(["DEV", "HOLDOUT"]),
  source_case_id: z.string().nullable(),
  prompt: z.string().min(20),
  safe_prompt: z.boolean(),
  slice_tags: z.array(z.string().min(1)).min(1),
  expected_findings: z.array(GroundTruthFindingSchema)
}).strict();

export const SemanticEvalDatasetSchema = z.object({
  version: z.literal("semantic_eval_dataset_v1"),
  created_at: z.string().datetime(),
  label_freeze_status: z.literal("FROZEN_BEFORE_MODEL_RUN"),
  label_policy: z.object({
    provenance: z.string().min(1),
    human_review_status: z.enum(["PENDING", "COMPLETE"]),
    notes: z.string().min(1)
  }).strict(),
  label_revision_history: z.array(z.object({
    eval_case_id: z.string().min(1),
    before_first_provider_run: z.literal(true),
    change: z.string().min(1),
    reason: z.string().min(1)
  }).strict()),
  matching_policy_version: z.literal("semantic_matching_v1"),
  cases: z.array(SemanticEvalCaseSchema).min(1)
}).strict();

export const SemanticRuntimeErrorSchema = z.object({
  domain: z.literal("INFRA_ERROR"),
  code: z.enum([
    "TIMEOUT",
    "RATE_LIMIT",
    "AUTH",
    "MALFORMED_OUTPUT",
    "PROVIDER_UNAVAILABLE",
    "CONFIG",
    "UNKNOWN"
  ]),
  provider: z.string().min(1).optional(),
  message: z.string().min(1),
  retryable: z.boolean()
}).strict();

export const SemanticCaseRunSchema = z.object({
  eval_case_id: z.string().min(1),
  status: z.enum(["OK", "INFRA_ERROR"]),
  predictions: z.array(SemanticFindingSchema),
  structured_output_valid: z.boolean(),
  errors: z.array(SemanticRuntimeErrorSchema)
}).strict();

export type GroundTruthFinding = z.infer<typeof GroundTruthFindingSchema>;
export type SemanticEvalCase = z.infer<typeof SemanticEvalCaseSchema>;
export type SemanticCaseRun = z.infer<typeof SemanticCaseRunSchema>;

const CATEGORY_BY_TYPE: Record<SemanticFinding["type"], z.infer<typeof SemanticCategorySchema>> = {
  AMBIGUITY: "ambiguity",
  SEMANTIC_CONFLICT: "conflict",
  TEMPORAL_CONTINUITY: "continuity",
  INTENT_RISK: "intent",
  SEMANTIC_RISK: "feasibility"
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "in", "into", "is", "it", "of", "on", "or", "same", "that", "the", "then",
  "this", "to", "with", "within"
]);

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function overlapCoefficient(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / Math.min(leftTokens.size, rightTokens.size);
}

function containsNormalized(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function containsExactExcerpt(prompt: string, excerpt: string): boolean {
  return prompt.toLocaleLowerCase().includes(excerpt.trim().toLocaleLowerCase());
}

function meaningMatch(expected: GroundTruthFinding, predicted: SemanticFinding): {
  matched: boolean;
  keyword_hits: string[];
  alternative_overlap: number;
} {
  const predictionText = `${predicted.summary} ${predicted.recommended_action}`;
  const normalizedPrediction = normalize(predictionText);
  const keywordHits = expected.meaning_keywords.filter((keyword) => normalizedPrediction.includes(normalize(keyword)));
  const requiredHits = expected.meaning_keywords.length === 1 ? 1 : 2;
  const alternativeOverlap = expected.acceptable_alternatives.reduce(
    (maximum, alternative) => Math.max(maximum, overlapCoefficient(alternative, predictionText)),
    overlapCoefficient(expected.description, predictionText)
  );
  return {
    matched: keywordHits.length >= requiredHits || alternativeOverlap >= 0.35,
    keyword_hits: keywordHits,
    alternative_overlap: alternativeOverlap
  };
}

function candidateMatch(prompt: string, expected: GroundTruthFinding, predicted: SemanticFinding) {
  const categoryMatches = CATEGORY_BY_TYPE[predicted.type] === expected.category;
  const promptSupported = containsExactExcerpt(prompt, predicted.evidence_excerpt);
  const expectedEvidenceSupported = containsExactExcerpt(prompt, expected.evidence_span);
  const directContainment = containsNormalized(expected.evidence_span, predicted.evidence_excerpt) ||
    containsNormalized(predicted.evidence_excerpt, expected.evidence_span);
  const evidenceOverlap = directContainment ? 1 : overlapCoefficient(expected.evidence_span, predicted.evidence_excerpt);
  const evidenceMatches = promptSupported && expectedEvidenceSupported && evidenceOverlap >= 0.35;
  const meaning = meaningMatch(expected, predicted);
  return {
    matched: categoryMatches && evidenceMatches && meaning.matched,
    score: (categoryMatches ? 1 : 0) + evidenceOverlap + meaning.alternative_overlap + meaning.keyword_hits.length / 10,
    category_matches: categoryMatches,
    prompt_supported: promptSupported,
    expected_evidence_supported: expectedEvidenceSupported,
    evidence_overlap: evidenceOverlap,
    meaning_matches: meaning.matched,
    meaning_keyword_hits: meaning.keyword_hits,
    meaning_alternative_overlap: meaning.alternative_overlap
  };
}

export function matchSemanticFindings(
  prompt: string,
  expectedInput: GroundTruthFinding[],
  predictedInput: SemanticFinding[]
) {
  const expected = expectedInput.map((item) => GroundTruthFindingSchema.parse(item));
  const predicted = predictedInput.map((item) => SemanticFindingSchema.parse(item));
  const candidates = [];
  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    for (let predictedIndex = 0; predictedIndex < predicted.length; predictedIndex += 1) {
      const detail = candidateMatch(prompt, expected[expectedIndex], predicted[predictedIndex]);
      if (detail.matched) candidates.push({ expectedIndex, predictedIndex, detail });
    }
  }
  candidates.sort((left, right) => right.detail.score - left.detail.score);

  const matchedExpected = new Map<number, { predictedIndex: number; detail: ReturnType<typeof candidateMatch> }>();
  const matchedPredicted = new Map<number, { expectedIndex: number; detail: ReturnType<typeof candidateMatch> }>();
  for (const candidate of candidates) {
    if (matchedExpected.has(candidate.expectedIndex) || matchedPredicted.has(candidate.predictedIndex)) continue;
    matchedExpected.set(candidate.expectedIndex, { predictedIndex: candidate.predictedIndex, detail: candidate.detail });
    matchedPredicted.set(candidate.predictedIndex, { expectedIndex: candidate.expectedIndex, detail: candidate.detail });
  }

  const expectedAudit = expected.map((item, index) => {
    const match = matchedExpected.get(index);
    if (!match) {
      return {
        expected: item,
        predicted: null,
        status: "MISSED" as const,
        error_domain: "SEMANTIC_ERROR" as const,
        reason: "No one-to-one prediction satisfied category + grounded evidence overlap + meaning equivalence."
      };
    }
    return {
      expected: item,
      predicted: predicted[match.predictedIndex],
      status: "MATCHED" as const,
      error_domain: null,
      reason: "Matched on category + grounded evidence overlap + meaning equivalence.",
      match_detail: match.detail
    };
  });
  const predictedAudit = predicted.map((item, index) => {
    const match = matchedPredicted.get(index);
    const promptSupported = containsExactExcerpt(prompt, item.evidence_excerpt);
    if (!match) {
      return {
        predicted: item,
        expected: null,
        status: "SPURIOUS" as const,
        error_domain: "SEMANTIC_ERROR" as const,
        prompt_supported: promptSupported,
        reason: promptSupported
          ? "Grounded excerpt, but no expected finding met category/evidence/meaning matching policy."
          : "Evidence excerpt is not supported by the prompt."
      };
    }
    return {
      predicted: item,
      expected: expected[match.expectedIndex],
      status: "MATCHED" as const,
      error_domain: null,
      prompt_supported: promptSupported,
      reason: "Matched on category + grounded evidence overlap + meaning equivalence.",
      match_detail: match.detail
    };
  });

  return {
    policy_version: "semantic_matching_v1",
    counts: {
      true_positive: matchedExpected.size,
      false_positive: predicted.length - matchedPredicted.size,
      false_negative: expected.length - matchedExpected.size
    },
    expected: expectedAudit,
    predicted: predictedAudit
  };
}

function ratio(numerator: number, denominator: number) {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

export function evaluateSemanticCases(casesInput: SemanticEvalCase[], resultsInput: SemanticCaseRun[]) {
  const cases = casesInput.map((item) => SemanticEvalCaseSchema.parse(item));
  const results = resultsInput.map((item) => SemanticCaseRunSchema.parse(item));
  const resultById = new Map(results.map((item) => [item.eval_case_id, item]));
  const providerFailures = results.filter((item) => item.status === "INFRA_ERROR");
  const auditableCases: Array<{
    eval_case_id: string;
    split: "DEV" | "HOLDOUT";
    prompt: string;
    slice_tags: string[];
    audit: ReturnType<typeof matchSemanticFindings>;
  }> = [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let supportedEvidence = 0;
  let predictedFindings = 0;
  let safeFalsePositives = 0;
  let highSeverityExpected = 0;
  let highSeverityMissed = 0;

  for (const evalCase of cases) {
    const result = resultById.get(evalCase.eval_case_id);
    if (!result || result.status === "INFRA_ERROR") continue;
    const audit = matchSemanticFindings(evalCase.prompt, evalCase.expected_findings, result.predictions);
    truePositive += audit.counts.true_positive;
    falsePositive += audit.counts.false_positive;
    falseNegative += audit.counts.false_negative;
    predictedFindings += audit.predicted.length;
    supportedEvidence += audit.predicted.filter((item) => item.prompt_supported).length;
    if (evalCase.safe_prompt && result.predictions.some((item) => ["MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"].includes(item.severity))) {
      safeFalsePositives += 1;
    }
    for (const expectedAudit of audit.expected) {
      if (expectedAudit.expected.severity !== "high") continue;
      highSeverityExpected += 1;
      if (expectedAudit.status === "MISSED") highSeverityMissed += 1;
    }
    auditableCases.push({
      eval_case_id: evalCase.eval_case_id,
      split: evalCase.split,
      prompt: evalCase.prompt,
      slice_tags: evalCase.slice_tags,
      audit
    });
  }

  const safeCasesInDenominator = cases.filter((item) => {
    const result = resultById.get(item.eval_case_id);
    return item.safe_prompt && result?.status === "OK";
  }).length;
  const structuredValid = results.filter((item) => item.structured_output_valid).length;
  const sliceNames = [...new Set(auditableCases.flatMap((item) => item.slice_tags))].sort();
  const failureSlices = Object.fromEntries(sliceNames.map((slice) => {
    const members = auditableCases.filter((item) => item.slice_tags.includes(slice));
    const counts = members.reduce((total, item) => ({
      true_positive: total.true_positive + item.audit.counts.true_positive,
      false_positive: total.false_positive + item.audit.counts.false_positive,
      false_negative: total.false_negative + item.audit.counts.false_negative
    }), { true_positive: 0, false_positive: 0, false_negative: 0 });
    return [slice, {
      case_count: members.length,
      ...counts,
      precision: ratio(counts.true_positive, counts.true_positive + counts.false_positive),
      recall: ratio(counts.true_positive, counts.true_positive + counts.false_negative)
    }];
  }));
  const missedFindings = auditableCases.flatMap((item) => item.audit.expected
    .filter((finding) => finding.status === "MISSED")
    .map((finding) => ({
      eval_case_id: item.eval_case_id,
      expected: finding.expected,
      reason: finding.reason
    })));
  const spuriousFindings = auditableCases.flatMap((item) => item.audit.predicted
    .filter((finding) => finding.status === "SPURIOUS")
    .map((finding) => ({
      eval_case_id: item.eval_case_id,
      predicted: finding.predicted,
      prompt_supported: finding.prompt_supported,
      reason: finding.reason
    })));

  return {
    matching_policy_version: "semantic_matching_v1",
    finding_metrics: {
      denominator_cases: auditableCases.length,
      true_positive: truePositive,
      false_positive: falsePositive,
      false_negative: falseNegative,
      precision: ratio(truePositive, truePositive + falsePositive),
      recall: ratio(truePositive, truePositive + falseNegative)
    },
    safe_false_positive_rate: ratio(safeFalsePositives, safeCasesInDenominator),
    high_severity_miss_rate: ratio(highSeverityMissed, highSeverityExpected),
    evidence_span_support_rate: ratio(supportedEvidence, predictedFindings),
    structured_output_validity: ratio(structuredValid, results.length),
    provider_failures: {
      count: providerFailures.length,
      rate: ratio(providerFailures.length, results.length),
      excluded_from_semantic_denominators: true,
      cases: providerFailures.map((item) => ({ eval_case_id: item.eval_case_id, errors: item.errors }))
    },
    failure_slices: failureSlices,
    missed_findings: missedFindings,
    spurious_findings: spuriousFindings,
    cases: auditableCases
  };
}

const REQUIRED_SPLIT_SLICES = [
  "safe",
  "ambiguity",
  "conflict",
  "continuity",
  "camera",
  "style",
  "intent",
  "feasibility",
  "protected-intent",
  "apparent-risk-valid",
  "professional-incomplete",
  "injection-adversarial"
];

export function validateSemanticDataset(input: unknown) {
  const parsed = SemanticEvalDatasetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      split_counts: { DEV: 0, HOLDOUT: 0 },
      safe_counts: { DEV: 0, HOLDOUT: 0 }
    };
  }

  const errors: string[] = [];
  const ids = new Set<string>();
  const splitCounts = { DEV: 0, HOLDOUT: 0 };
  const safeCounts = { DEV: 0, HOLDOUT: 0 };
  for (const evalCase of parsed.data.cases) {
    if (ids.has(evalCase.eval_case_id)) errors.push(`Duplicate eval_case_id: ${evalCase.eval_case_id}`);
    ids.add(evalCase.eval_case_id);
    splitCounts[evalCase.split] += 1;
    if (evalCase.safe_prompt) safeCounts[evalCase.split] += 1;
    if (evalCase.safe_prompt && evalCase.expected_findings.length > 0) {
      errors.push(`${evalCase.eval_case_id}: safe prompt must have expected_findings: []`);
    }
    for (const finding of evalCase.expected_findings) {
      if (!containsExactExcerpt(evalCase.prompt, finding.evidence_span)) {
        errors.push(`${evalCase.eval_case_id}/${finding.finding_id}: evidence_span is not in prompt`);
      }
      if (finding.label_provenance !== parsed.data.label_policy.provenance) {
        errors.push(`${evalCase.eval_case_id}/${finding.finding_id}: label provenance differs from dataset policy`);
      }
    }
    const forbiddenKeys = ["expected_decision", "prompt_side_risk_tags", "risk_tags", "legacy_decision"];
    for (const key of forbiddenKeys) {
      if (key in evalCase) errors.push(`${evalCase.eval_case_id}: forbidden leakage key ${key}`);
    }
  }
  for (const split of ["DEV", "HOLDOUT"] as const) {
    const tags = new Set(parsed.data.cases.filter((item) => item.split === split).flatMap((item) => item.slice_tags));
    for (const required of REQUIRED_SPLIT_SLICES) {
      if (!tags.has(required)) errors.push(`${split}: missing required slice ${required}`);
    }
  }

  return { valid: errors.length === 0, errors, split_counts: splitCounts, safe_counts: safeCounts };
}
