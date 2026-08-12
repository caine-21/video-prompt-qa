import { z } from "zod";
import {
  EvidenceSchema,
  PreflightIssueSchema,
  PreflightRequestSchema,
  type Evidence,
  type PreflightIssue
} from "./contracts.ts";
import { findModelCapability, ModelCapabilitySchema } from "./capability-registry.ts";

const ToolErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean()
});

export const GetModelCapabilitiesInputSchema = z.object({ target_model: z.string().min(1) });
export const GetModelCapabilitiesOutputSchema = z.object({
  deterministic: z.literal(true),
  status: z.enum(["FOUND", "UNKNOWN_MODEL"]),
  capability: ModelCapabilitySchema.nullable(),
  evidence: z.array(EvidenceSchema).min(1),
  errors: z.array(ToolErrorSchema)
});

export type GetModelCapabilitiesOutput = z.infer<typeof GetModelCapabilitiesOutputSchema>;

export function getModelCapabilities(input: unknown): GetModelCapabilitiesOutput {
  const parsed = GetModelCapabilitiesInputSchema.parse(input);
  const capability = findModelCapability(parsed.target_model);
  if (!capability) {
    return GetModelCapabilitiesOutputSchema.parse({
      deterministic: true,
      status: "UNKNOWN_MODEL",
      capability: null,
      evidence: [{
        source: "CAPABILITY",
        ref: `model:${parsed.target_model}`,
        detail: "The local capability registry has no evidence for this model.",
        evidence_status: "UNKNOWN"
      }],
      errors: [{
        code: "UNKNOWN_MODEL",
        message: `No capability record exists for ${parsed.target_model}.`,
        retryable: false
      }]
    });
  }

  return GetModelCapabilitiesOutputSchema.parse({
    deterministic: true,
    status: "FOUND",
    capability,
    evidence: [{
      source: "CAPABILITY",
      ref: `${capability.registry_version}:${capability.model_id}`,
      detail: capability.evidence_note,
      evidence_status: capability.evidence_status
    }],
    errors: []
  });
}

export const ValidateGenerationParametersInputSchema = z.object({
  request: PreflightRequestSchema,
  capabilities: GetModelCapabilitiesOutputSchema
});
export const ValidateGenerationParametersOutputSchema = z.object({
  deterministic: z.literal(true),
  valid: z.boolean(),
  issues: z.array(PreflightIssueSchema),
  warnings: z.array(PreflightIssueSchema),
  uncertainties: z.array(PreflightIssueSchema),
  errors: z.array(ToolErrorSchema)
});

function parameterIssue(id: string, summary: string, evidence: Evidence, action: string): PreflightIssue {
  return PreflightIssueSchema.parse({
    id,
    type: "PARAMETER_INVALID",
    severity: "HIGH",
    summary,
    evidence: [evidence],
    classification: "PREVENTABLE",
    recommended_action: action
  });
}

export function validateGenerationParameters(input: unknown): z.infer<typeof ValidateGenerationParametersOutputSchema> {
  const { request, capabilities } = ValidateGenerationParametersInputSchema.parse(input);
  const issues: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const uncertainties: PreflightIssue[] = [];
  const capabilityEvidence = capabilities.evidence[0];

  if (capabilities.status === "UNKNOWN_MODEL" || !capabilities.capability) {
    uncertainties.push(PreflightIssueSchema.parse({
      id: "capability-unknown",
      type: "CAPABILITY_UNKNOWN",
      severity: "UNKNOWN",
      summary: `Generation parameters cannot be verified for ${request.target_model}.`,
      evidence: capabilities.evidence,
      classification: "UNCERTAIN",
      recommended_action: "Select a model with a verified capability record or confirm the parameters manually."
    }));
  } else {
    const capability = capabilities.capability;
    if (request.duration !== null && capability.duration_seconds && (
      request.duration < capability.duration_seconds.min || request.duration > capability.duration_seconds.max
    )) {
      issues.push(parameterIssue(
        "duration-out-of-range",
        `Duration ${request.duration}s is outside the registered ${capability.duration_seconds.min}-${capability.duration_seconds.max}s range.`,
        capabilityEvidence,
        "Choose a supported duration or another model."
      ));
    } else if (
      request.duration !== null &&
      capability.duration_seconds?.allowed_values &&
      !capability.duration_seconds.allowed_values.includes(request.duration)
    ) {
      issues.push(parameterIssue(
        "duration-value-unsupported",
        `Duration ${request.duration}s is not one of the registered values: ${capability.duration_seconds.allowed_values.join(", ")}s.`,
        capabilityEvidence,
        "Choose a registered duration or another model."
      ));
    }
    if (request.aspect_ratio !== null && !capability.aspect_ratios.includes(request.aspect_ratio)) {
      issues.push(parameterIssue(
        "aspect-ratio-unsupported",
        `Aspect ratio ${request.aspect_ratio} is not in the registered capability list.`,
        capabilityEvidence,
        "Choose a registered aspect ratio or another model."
      ));
    }
    if (request.mode !== null && !capability.modes.includes(request.mode)) {
      issues.push(parameterIssue(
        "mode-unsupported",
        `Mode ${request.mode} is not in the registered capability list.`,
        capabilityEvidence,
        "Choose a registered generation mode or another model."
      ));
    }
    if (request.references.length > 0 && capability.reference_support === false) {
      issues.push(parameterIssue(
        "references-unsupported",
        "The request includes references but the registered model profile does not support them.",
        capabilityEvidence,
        "Remove the references or select a model that supports them."
      ));
    }
    if (capability.evidence_status !== "VERIFIED") {
      warnings.push(PreflightIssueSchema.parse({
        id: "capability-evidence-not-verified",
        type: "CAPABILITY_LIMITATION",
        severity: "LOW",
        summary: "The capability record is not externally verified.",
        evidence: capabilities.evidence,
        classification: "UNCERTAIN",
        recommended_action: "Treat this as a contract check, not a provider guarantee."
      }));
    }
  }

  return ValidateGenerationParametersOutputSchema.parse({
    deterministic: true,
    valid: issues.length === 0 && uncertainties.length === 0,
    issues,
    warnings,
    uncertainties,
    errors: []
  });
}

const failurePatternCatalog = {
  too_many_subjects: { intervention: "Reduce simultaneous subjects.", status: "UNKNOWN" },
  too_many_actions: { intervention: "Keep one primary action or split into shots.", status: "EXPERIMENTAL" },
  complex_camera_movement: { intervention: "Simplify or pre-plan the camera path.", status: "EXPERIMENTAL" },
  identity_reference_missing: { intervention: "Add identity reference material.", status: "EXPERIMENTAL" },
  product_features_not_locked: { intervention: "Lock product attributes and references.", status: "EXPERIMENTAL" },
  prompt_conflict: { intervention: "Resolve the conflicting instructions.", status: "UNKNOWN" },
  too_much_story_in_one_clip: { intervention: "Split the story into shot-level prompts.", status: "EXPERIMENTAL" },
  no_shot_decomposition: { intervention: "Create a shot plan before generation.", status: "EXPERIMENTAL" },
  model_task_mismatch: { intervention: "Select a model and mode suited to the task.", status: "EXPERIMENTAL" },
  duration_too_ambitious: { intervention: "Reduce duration or story density.", status: "UNKNOWN" },
  physical_motion_risk: { intervention: "Simplify physical interactions and motion.", status: "EXPERIMENTAL" },
  text_logo_risk: { intervention: "Use references or post-production for exact text.", status: "UNKNOWN" }
} as const;

export const RetrieveFailurePatternsInputSchema = z.object({ risk_pattern_ids: z.array(z.string()).max(20) });
export const RetrieveFailurePatternsOutputSchema = z.object({
  deterministic: z.literal(true),
  patterns: z.array(z.object({
    id: z.string(),
    intervention: z.string(),
    evidence_status: z.enum(["VERIFIED", "EXPERIMENTAL", "UNKNOWN"])
  })),
  unknown_pattern_ids: z.array(z.string()),
  errors: z.array(ToolErrorSchema)
});

export function retrieveFailurePatterns(input: unknown): z.infer<typeof RetrieveFailurePatternsOutputSchema> {
  const parsed = RetrieveFailurePatternsInputSchema.parse(input);
  const patterns = [];
  const unknownPatternIds = [];
  for (const id of [...new Set(parsed.risk_pattern_ids)]) {
    const pattern = failurePatternCatalog[id as keyof typeof failurePatternCatalog];
    if (!pattern) unknownPatternIds.push(id);
    else patterns.push({ id, intervention: pattern.intervention, evidence_status: pattern.status });
  }
  return RetrieveFailurePatternsOutputSchema.parse({
    deterministic: true,
    patterns,
    unknown_pattern_ids: unknownPatternIds,
    errors: []
  });
}

export const CheckProtectedConstraintsInputSchema = z.object({
  original_prompt: z.string().min(1),
  candidate_prompt: z.string().min(1),
  hard_constraints: z.array(z.string().min(1)).max(30)
});
export const CheckProtectedConstraintsOutputSchema = z.object({
  deterministic: z.literal(true),
  preserved: z.boolean(),
  missing_constraints: z.array(z.string()),
  evidence: z.array(EvidenceSchema),
  errors: z.array(ToolErrorSchema)
});

export function checkProtectedConstraints(input: unknown): z.infer<typeof CheckProtectedConstraintsOutputSchema> {
  const parsed = CheckProtectedConstraintsInputSchema.parse(input);
  const normalizedCandidate = parsed.candidate_prompt.toLocaleLowerCase();
  const missing = parsed.hard_constraints.filter((constraint) => (
    !normalizedCandidate.includes(constraint.toLocaleLowerCase())
  ));
  const evidence = parsed.hard_constraints.map((constraint) => EvidenceSchema.parse({
    source: "USER_CONSTRAINT",
    ref: `constraint:${constraint}`,
    detail: missing.includes(constraint) ? "Missing from candidate revision." : "Preserved in candidate revision.",
    evidence_status: "VERIFIED"
  }));
  return CheckProtectedConstraintsOutputSchema.parse({
    deterministic: true,
    preserved: missing.length === 0,
    missing_constraints: missing,
    evidence,
    errors: []
  });
}

export interface PreflightTools {
  getModelCapabilities: typeof getModelCapabilities;
  validateGenerationParameters: typeof validateGenerationParameters;
  retrieveFailurePatterns: typeof retrieveFailurePatterns;
  checkProtectedConstraints: typeof checkProtectedConstraints;
}

export const defaultPreflightTools: PreflightTools = {
  getModelCapabilities,
  validateGenerationParameters,
  retrieveFailurePatterns,
  checkProtectedConstraints
};

export const PREFLIGHT_TOOL_CONTRACTS = {
  get_model_capabilities: {
    deterministic: true,
    input_schema: GetModelCapabilitiesInputSchema,
    output_schema: GetModelCapabilitiesOutputSchema,
    possible_errors: ["INVALID_INPUT", "UNKNOWN_MODEL"]
  },
  validate_generation_parameters: {
    deterministic: true,
    input_schema: ValidateGenerationParametersInputSchema,
    output_schema: ValidateGenerationParametersOutputSchema,
    possible_errors: ["INVALID_INPUT", "CAPABILITY_UNKNOWN", "PARAMETER_UNSUPPORTED"]
  },
  retrieve_failure_patterns: {
    deterministic: true,
    input_schema: RetrieveFailurePatternsInputSchema,
    output_schema: RetrieveFailurePatternsOutputSchema,
    possible_errors: ["INVALID_INPUT", "UNKNOWN_PATTERN"]
  },
  check_protected_constraints: {
    deterministic: true,
    input_schema: CheckProtectedConstraintsInputSchema,
    output_schema: CheckProtectedConstraintsOutputSchema,
    possible_errors: ["INVALID_INPUT", "CONSTRAINT_MISSING"]
  }
} as const;
