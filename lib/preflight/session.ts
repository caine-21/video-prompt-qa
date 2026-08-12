import { createHash, randomUUID } from "node:crypto";
import {
  CAPABILITY_REGISTRY_VERSION,
  EvidenceSchema,
  PREFLIGHT_CONTRACT_VERSION,
  PREFLIGHT_POLICY_VERSION,
  PreflightIssueSchema,
  PreflightRequestSchema,
  PreflightResultSchema,
  type Evidence,
  type PreflightDecision,
  type PreflightIssue,
  type PreflightRequest,
  type PreflightResult
} from "./contracts.ts";
import type { SemanticAnalyst, SemanticAnalysisOutcome, SemanticFinding } from "./semantic-analyst.ts";
import { defaultPreflightTools, type PreflightTools } from "./tools.ts";

export interface PreflightSessionDependencies {
  semanticAnalyst: SemanticAnalyst;
  tools?: PreflightTools;
}

function semanticIssue(finding: SemanticFinding, patternEvidence: Evidence[]): PreflightIssue {
  return PreflightIssueSchema.parse({
    id: finding.id,
    type: "SEMANTIC_RISK",
    severity: finding.severity,
    summary: finding.summary,
    evidence: [
      {
        source: "SEMANTIC_FINDING",
        ref: finding.id,
        detail: finding.evidence_excerpt,
        evidence_status: "EXPERIMENTAL"
      },
      ...patternEvidence
    ],
    classification: finding.preventability,
    recommended_action: finding.recommended_action
  });
}

function decide(issues: PreflightIssue[], uncertainties: PreflightIssue[]): PreflightDecision {
  if (issues.length > 0) return "NEEDS_REVISION";
  if (uncertainties.length > 0) return "NEEDS_USER_DECISION";
  return "READY_TO_GENERATE";
}

function uniqueEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.source}|${item.ref}|${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class PreflightSession {
  private readonly semanticAnalyst: SemanticAnalyst;
  private readonly tools: PreflightTools;

  constructor(dependencies: PreflightSessionDependencies) {
    this.semanticAnalyst = dependencies.semanticAnalyst;
    this.tools = dependencies.tools ?? defaultPreflightTools;
  }

  async run(input: unknown): Promise<PreflightResult> {
    const startedAt = Date.now();
    const request: PreflightRequest = PreflightRequestSchema.parse(input);
    const runId = randomUUID();
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const checksExecuted = ["get_model_capabilities", "validate_generation_parameters"];

    const capabilities = this.tools.getModelCapabilities({ target_model: request.target_model });
    const parameterCheck = this.tools.validateGenerationParameters({ request, capabilities });
    let semantic: SemanticAnalysisOutcome;
    if (parameterCheck.issues.length > 0 || parameterCheck.uncertainties.length > 0) {
      semantic = {
        status: "SKIPPED",
        findings: [],
        uncertainties: [],
        suggested_revision: null,
        provider: null,
        model: null,
        provider_calls: 0,
        retry_count: 0,
        token_usage: null,
        errors: []
      };
    } else {
      checksExecuted.push("semantic_analysis");
      semantic = await this.semanticAnalyst.analyze(request);
    }
    const patternIds = semantic.findings.flatMap((finding) => finding.risk_pattern_ids);
    const patterns = this.tools.retrieveFailurePatterns({ risk_pattern_ids: patternIds });
    if (patternIds.length > 0) checksExecuted.push("retrieve_failure_patterns");

    const issues = [...parameterCheck.issues];
    const warnings = [...parameterCheck.warnings];
    const uncertainties = [...parameterCheck.uncertainties];

    const patternById = new Map(patterns.patterns.map((pattern) => [pattern.id, pattern]));
    for (const finding of semantic.findings) {
      const patternEvidence = finding.risk_pattern_ids
        .map((id) => patternById.get(id))
        .filter((pattern): pattern is NonNullable<typeof pattern> => Boolean(pattern))
        .map((pattern) => EvidenceSchema.parse({
          source: "FAILURE_PATTERN",
          ref: pattern.id,
          detail: pattern.intervention,
          evidence_status: pattern.evidence_status
        }));
      const item = semanticIssue(finding, patternEvidence);
      if (finding.preventability === "UNCERTAIN" || finding.severity === "UNKNOWN") {
        uncertainties.push(item);
      } else if (finding.severity === "LOW") {
        warnings.push(item);
      } else {
        issues.push(item);
      }
    }

    if (semantic.status === "UNAVAILABLE") {
      uncertainties.push(PreflightIssueSchema.parse({
        id: "semantic-analysis-unavailable",
        type: "ANALYSIS_UNAVAILABLE",
        severity: "UNKNOWN",
        summary: "Semantic checks did not return a valid structured result within the provider budget.",
        evidence: [{
          source: "SEMANTIC_FINDING",
          ref: "semantic-analysis-unavailable",
          detail: semantic.errors.map((error) => `${error.provider}:${error.code}:${error.message}`).join(" | ") || "No semantic provider was available.",
          evidence_status: "UNKNOWN"
        }],
        classification: "UNCERTAIN",
        recommended_action: "Review the prompt manually or retry the preflight analysis."
      }));
    }

    let suggestedRevision = semantic.suggested_revision ?? undefined;
    if (suggestedRevision) {
      checksExecuted.push("check_protected_constraints");
      const protectedCheck = this.tools.checkProtectedConstraints({
        original_prompt: request.prompt,
        candidate_prompt: suggestedRevision,
        hard_constraints: request.hard_constraints
      });
      if (!protectedCheck.preserved) {
        issues.push(PreflightIssueSchema.parse({
          id: "protected-constraints-not-preserved",
          type: "PROTECTED_CONSTRAINT_VIOLATION",
          severity: "HIGH",
          summary: `Suggested revision removed protected constraints: ${protectedCheck.missing_constraints.join(", ")}.`,
          evidence: protectedCheck.evidence.filter((item) => item.detail.startsWith("Missing")),
          classification: "PREVENTABLE",
          recommended_action: "Reject this revision and preserve every explicit hard constraint."
        }));
        suggestedRevision = undefined;
      }
    }

    const decision = decide(issues, uncertainties);
    const evidence = uniqueEvidence([
      ...capabilities.evidence,
      ...issues.flatMap((item) => item.evidence),
      ...warnings.flatMap((item) => item.evidence),
      ...uncertainties.flatMap((item) => item.evidence)
    ]);
    const trace = {
      run_id: runId,
      request_fingerprint: fingerprint,
      policy_version: PREFLIGHT_POLICY_VERSION,
      capability_version: CAPABILITY_REGISTRY_VERSION,
      provider: semantic.provider,
      model: semantic.model,
      checks_executed: checksExecuted,
      findings: [...issues, ...warnings, ...uncertainties].map((item) => item.id),
      decision,
      latency_ms: Date.now() - startedAt,
      provider_calls: semantic.provider_calls,
      retry_count: semantic.retry_count,
      token_usage: semantic.token_usage
    };

    return PreflightResultSchema.parse({
      decision,
      issues,
      warnings,
      uncertainties,
      evidence,
      ...(suggestedRevision ? { suggested_revision: suggestedRevision } : {}),
      trace_id: runId,
      trace,
      metadata: {
        contract_version: PREFLIGHT_CONTRACT_VERSION,
        policy_version: PREFLIGHT_POLICY_VERSION,
        capability_version: CAPABILITY_REGISTRY_VERSION
      }
    });
  }
}
