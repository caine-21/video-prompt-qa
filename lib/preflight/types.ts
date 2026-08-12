export type LegacyPreflightDecision = "generate_ok" | "revise_first" | "needs_review" | "unknown";

export type PreflightDecisionBucket =
  | "ready_to_try"
  | "revise_before_generation"
  | "review_before_generation"
  | "manual_check";

export type PreflightRiskLevel = "low" | "medium" | "high" | "unknown";

export interface RawPreflightRecordLike {
  record_id?: string;
  case_id?: string;
  run_id?: string;
  harness_version?: string;
  rubric_version?: string;
  should_generate_decision?: string;
  confidence?: string;
  evidence_level?: string;
  detected_risk_tags?: string[];
  matched_rule_ids?: string[];
  hypothesis_flags?: string[];
  recommended_interventions?: string[];
  intervention_priority?: string[];
  rationale?: string;
  notes_for_reviewer?: string;
  schema_limitation_notes?: string[];
  calibration_watchlist?: boolean;
}

export interface PreflightUserFacingResult {
  decision: LegacyPreflightDecision;
  decision_bucket: PreflightDecisionBucket;
  display_label: string;
  plain_language_summary: string;
  risk_level: PreflightRiskLevel;
  top_reasons: string[];
  suggested_revisions: string[];
  intervention_summary: string[];
  weak_evidence_warning: string | null;
  requires_human_review: boolean;
}

export interface PreflightAuditMetadata {
  source_record_id: string;
  source_case_id: string;
  source_run_id?: string;
  raw_decision: string;
  raw_confidence?: string;
  raw_evidence_level?: string;
  raw_risk_tags: string[];
  matched_rule_ids: string[];
  hypothesis_flags: string[];
  intervention_priority: string[];
  rationale?: string;
  notes_for_reviewer?: string;
  calibration_watchlist: boolean;
  schema_limitation_notes: string[];
  harness_version?: string;
  rubric_version?: string;
}

export interface PreflightContractResult {
  result_id: string;
  case_id: string;
  user_facing: PreflightUserFacingResult;
  audit: PreflightAuditMetadata;
}
