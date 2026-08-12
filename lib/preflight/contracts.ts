import { z } from "zod";

export const PREFLIGHT_CONTRACT_VERSION = "preflight_contract_v1";
export const PREFLIGHT_POLICY_VERSION = "preflight_policy_v1";
export const CAPABILITY_REGISTRY_VERSION = "capability_registry_v2";

export const PreflightDecisionSchema = z.enum([
  "READY_TO_GENERATE",
  "NEEDS_REVISION",
  "NEEDS_USER_DECISION"
]);

export const PreflightRequestSchema = z.object({
  prompt: z.string().trim().min(20).max(8000),
  target_model: z.string().trim().min(1).max(120),
  duration: z.number().positive().max(600).nullable(),
  aspect_ratio: z.string().trim().min(3).max(20).nullable(),
  mode: z.string().trim().min(1).max(80).nullable(),
  references: z.array(z.object({
    type: z.enum(["image", "video", "character", "product", "style"]),
    uri: z.string().trim().min(1).max(2000).nullable().default(null),
    description: z.string().trim().min(1).max(500).nullable().default(null)
  })).max(12),
  hard_constraints: z.array(z.string().trim().min(1).max(500)).max(30)
});

export const EvidenceSchema = z.object({
  source: z.enum([
    "RULE",
    "CAPABILITY",
    "FAILURE_PATTERN",
    "SEMANTIC_FINDING",
    "USER_CONSTRAINT"
  ]),
  ref: z.string().min(1),
  detail: z.string().min(1),
  evidence_status: z.enum(["VERIFIED", "EXPERIMENTAL", "UNKNOWN"])
});

export const PreflightIssueSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "PARAMETER_INVALID",
    "CAPABILITY_UNKNOWN",
    "CAPABILITY_LIMITATION",
    "SEMANTIC_RISK",
    "PROTECTED_CONSTRAINT_VIOLATION",
    "ANALYSIS_UNAVAILABLE"
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]),
  summary: z.string().min(1),
  evidence: z.array(EvidenceSchema).min(1),
  classification: z.enum(["PREVENTABLE", "UNCERTAIN"]),
  recommended_action: z.string().min(1)
});

export const PreflightTraceSchema = z.object({
  run_id: z.string().uuid(),
  request_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  policy_version: z.string().min(1),
  capability_version: z.string().min(1),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  checks_executed: z.array(z.string()),
  findings: z.array(z.string()),
  decision: PreflightDecisionSchema,
  latency_ms: z.number().nonnegative(),
  provider_calls: z.number().int().nonnegative(),
  retry_count: z.number().int().nonnegative(),
  token_usage: z.number().int().nonnegative().nullable()
});

export const PreflightResultSchema = z.object({
  decision: PreflightDecisionSchema,
  issues: z.array(PreflightIssueSchema),
  warnings: z.array(PreflightIssueSchema),
  uncertainties: z.array(PreflightIssueSchema),
  evidence: z.array(EvidenceSchema),
  suggested_revision: z.string().min(1).optional(),
  trace_id: z.string().uuid(),
  trace: PreflightTraceSchema,
  metadata: z.object({
    contract_version: z.string().min(1),
    policy_version: z.string().min(1),
    capability_version: z.string().min(1)
  })
});

export type PreflightDecision = z.infer<typeof PreflightDecisionSchema>;
export type PreflightRequest = z.infer<typeof PreflightRequestSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type PreflightIssue = z.infer<typeof PreflightIssueSchema>;
export type PreflightTrace = z.infer<typeof PreflightTraceSchema>;
export type PreflightResult = z.infer<typeof PreflightResultSchema>;
