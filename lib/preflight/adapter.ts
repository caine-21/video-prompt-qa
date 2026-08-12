import type {
  PreflightContractResult,
  LegacyPreflightDecision,
  PreflightDecisionBucket,
  PreflightRiskLevel,
  RawPreflightRecordLike
} from "./types";

const decisionLabels: Record<LegacyPreflightDecision, string> = {
  generate_ok: "Looks safe enough to try",
  revise_first: "Revise before generating",
  needs_review: "Needs human review",
  unknown: "Needs manual check"
};

const decisionBuckets: Record<LegacyPreflightDecision, PreflightDecisionBucket> = {
  generate_ok: "ready_to_try",
  revise_first: "revise_before_generation",
  needs_review: "review_before_generation",
  unknown: "manual_check"
};

const riskReasons: Record<string, string> = {
  too_many_subjects: "The prompt asks the model to coordinate many important subjects at once.",
  too_many_actions: "The prompt chains multiple actions into one generation.",
  complex_camera_movement: "The requested camera movement may create framing or continuity risk.",
  identity_reference_missing: "Identity or character consistency may need stronger reference material.",
  product_features_not_locked: "Product details may need clearer locked attributes or reference assets.",
  prompt_conflict: "Some prompt requirements may compete with each other.",
  too_much_story_in_one_clip: "The prompt compresses multiple story beats into one clip.",
  no_shot_decomposition: "The prompt may need shot-level planning before generation.",
  model_task_mismatch: "The requested task may not fit the selected model or mode.",
  duration_too_ambitious: "The prompt may expect more continuity or action than the duration can support.",
  physical_motion_risk: "The prompt depends on physical motion that may create artifacts.",
  text_logo_risk: "Exact text, logo, or typography fidelity is weakly evidenced."
};

const interventionCopy: Record<string, string> = {
  simplify_prompt: "Simplify the prompt before generation.",
  split_into_shots: "Split the idea into smaller shot-level prompts.",
  reduce_simultaneous_constraints: "Reduce competing constraints and keep the most important ones.",
  reduce_camera_complexity: "Use simpler camera movement or plan the camera path first.",
  create_storyboard_first: "Create a storyboard or shot plan before generation.",
  generate_image_keyframe_first: "Generate or attach an image keyframe first.",
  add_reference_image: "Add a reference image for identity, product, or style continuity.",
  lock_product_attributes: "Lock the product attributes that must not change.",
  choose_better_model_task_mode: "Review whether the selected model or mode fits the task.",
  do_not_generate_yet: "Pause before spending credits until the missing setup is resolved."
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function normalizeDecision(value: string): LegacyPreflightDecision {
  if (value === "generate_ok" || value === "revise_first" || value === "needs_review" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function deriveRiskLevel(decision: LegacyPreflightDecision, hypothesisFlags: string[] = []): PreflightRiskLevel {
  if (decision === "needs_review") return "high";
  if (decision === "revise_first") return "medium";
  if (decision === "generate_ok") return hypothesisFlags.length > 0 ? "medium" : "low";
  return "unknown";
}

function buildSummary(decision: LegacyPreflightDecision, riskTags: string[], hypothesisFlags: string[]): string {
  if (decision === "generate_ok") {
    return "This prompt looks constrained enough to try, but output quality is not guaranteed.";
  }
  if (decision === "revise_first") {
    return "Revise the prompt before spending generation credits.";
  }
  if (decision === "needs_review") {
    return "Review this prompt before generation, especially references, shot planning, or model fit.";
  }
  if (riskTags.length === 0 && hypothesisFlags.length === 0) {
    return "The preflight adapter cannot make a useful recommendation from the current record.";
  }
  return "Manual review is needed because the record does not support a clear recommendation.";
}

function buildWeakEvidenceWarning(hypothesisFlags: string[]): string | null {
  if (hypothesisFlags.length === 0) return null;
  return `Weak evidence detected: ${hypothesisFlags.join(", ")}. Treat these as audit flags, not validated blockers.`;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Cannot map preflight record: missing required ${label}`);
  }
  return value;
}

export function mapPreflightRecordToContract(record: RawPreflightRecordLike): PreflightContractResult {
  const sourceRecordId = requireString(record.record_id, "record_id");
  const sourceCaseId = requireString(record.case_id, "case_id");
  const rawDecision = requireString(record.should_generate_decision, "should_generate_decision");

  const decision = normalizeDecision(rawDecision);
  const riskTags = asStringArray(record.detected_risk_tags);
  const hypothesisFlags = asStringArray(record.hypothesis_flags);
  const interventions = unique(asStringArray(record.recommended_interventions));
  const matchedRuleIds = asStringArray(record.matched_rule_ids);
  const interventionPriority = asStringArray(record.intervention_priority);
  const schemaLimitationNotes = asStringArray(record.schema_limitation_notes);

  const topReasons = riskTags.map(tag => riskReasons[tag] ?? `Prompt risk detected: ${tag}.`);
  const interventionSummary = interventions.map(item => interventionCopy[item] ?? `Review intervention: ${item}.`);

  return {
    result_id: sourceRecordId,
    case_id: sourceCaseId,
    user_facing: {
      decision,
      decision_bucket: decisionBuckets[decision],
      display_label: decisionLabels[decision],
      plain_language_summary: buildSummary(decision, riskTags, hypothesisFlags),
      risk_level: deriveRiskLevel(decision, hypothesisFlags),
      top_reasons: topReasons,
      suggested_revisions: interventionSummary,
      intervention_summary: interventionSummary,
      weak_evidence_warning: buildWeakEvidenceWarning(hypothesisFlags),
      requires_human_review: decision === "needs_review" || hypothesisFlags.length > 0
    },
    audit: {
      source_record_id: sourceRecordId,
      source_case_id: sourceCaseId,
      source_run_id: record.run_id,
      raw_decision: rawDecision,
      raw_confidence: record.confidence,
      raw_evidence_level: record.evidence_level,
      raw_risk_tags: riskTags,
      matched_rule_ids: matchedRuleIds,
      hypothesis_flags: hypothesisFlags,
      intervention_priority: interventionPriority,
      rationale: record.rationale,
      notes_for_reviewer: record.notes_for_reviewer,
      calibration_watchlist: record.calibration_watchlist === true,
      schema_limitation_notes: schemaLimitationNotes,
      harness_version: record.harness_version,
      rubric_version: record.rubric_version
    }
  };
}
