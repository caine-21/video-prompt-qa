import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PreflightSession } from "../lib/preflight/session.ts";
import { BoundedSemanticAnalyst } from "../lib/preflight/semantic-analyst.ts";
import { evaluateSemanticCases, validateSemanticDataset } from "../lib/preflight/semantic-evaluation.ts";
import {
  buildSemanticProviderInput,
  createDeepSeekSemanticProvider,
  DEEPSEEK_SEMANTIC_MODEL,
  SEMANTIC_OUTPUT_SCHEMA_VERSION,
  SEMANTIC_PROMPT_VERSION,
  SEMANTIC_SYSTEM_PROMPT,
  SEMANTIC_SYSTEM_PROMPT_VERSION
} from "../lib/preflight/semantic-providers.ts";

const allowMissingProvider = process.argv.includes("--allow-missing-provider");
const dataset = JSON.parse(readFileSync("data/semantic_eval_dataset_v1.json", "utf8"));
const manifest = JSON.parse(readFileSync("data/semantic_eval_manifest_v1.json", "utf8"));
const declaredContaminationAudit = JSON.parse(readFileSync("data/benchmark_contamination_audit_v1.json", "utf8"));
const promptHistory = JSON.parse(readFileSync("data/semantic_prompt_history_v1.json", "utf8"));
const datasetValidation = validateSemanticDataset(dataset);
if (!datasetValidation.valid) throw new Error(`Invalid semantic dataset: ${datasetValidation.errors.join(" | ")}`);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonicalize(value))).digest("hex");
}

function generationRequest(evalCase) {
  return {
    prompt: evalCase.prompt,
    target_model: "veo-3.1-generate-001",
    duration: 4,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: []
  };
}

function runContaminationAudit() {
  const allowedProviderKeys = ["prompt"];
  const boundaryChecks = dataset.cases.map((evalCase) => {
    const providerInput = buildSemanticProviderInput(generationRequest(evalCase));
    const actualKeys = Object.keys(providerInput).sort();
    return {
      eval_case_id: evalCase.eval_case_id,
      allowed_keys_only: JSON.stringify(actualKeys) === JSON.stringify(allowedProviderKeys),
      excludes_eval_case_id: !("eval_case_id" in providerInput),
      excludes_split: !("split" in providerInput),
      excludes_slice_tags: !("slice_tags" in providerInput),
      excludes_expected_findings: !("expected_findings" in providerInput),
      excludes_safe_label: !("safe_prompt" in providerInput)
    };
  });
  const runtimeFiles = [
    "lib/preflight/semantic-analyst.ts",
    "lib/preflight/semantic-providers.ts",
    "lib/preflight/session.ts",
    "lib/preflight/tools.ts"
  ];
  const runtimeImportsDataset = runtimeFiles.filter((file) => (
    readFileSync(file, "utf8").includes("semantic_eval_dataset")
  ));
  const leakedCaseIds = dataset.cases
    .map((item) => item.eval_case_id)
    .filter((id) => SEMANTIC_SYSTEM_PROMPT.includes(id));
  const leakedDescriptions = dataset.cases
    .flatMap((item) => item.expected_findings.map((finding) => finding.description))
    .filter((description) => SEMANTIC_SYSTEM_PROMPT.includes(description));
  const failedBoundaryChecks = boundaryChecks.filter((item) => (
    !item.allowed_keys_only || !item.excludes_eval_case_id || !item.excludes_split ||
    !item.excludes_slice_tags || !item.excludes_expected_findings || !item.excludes_safe_label
  ));
  return {
    declared_audit_version: declaredContaminationAudit.version,
    declared_verdict: declaredContaminationAudit.verdict,
    programmatic_verdict: failedBoundaryChecks.length === 0 && runtimeImportsDataset.length === 0 &&
      leakedCaseIds.length === 0 && leakedDescriptions.length === 0 ? "PASS" : "FAIL",
    provider_boundary_case_count: boundaryChecks.length,
    failed_boundary_checks: failedBoundaryChecks,
    runtime_files_importing_dataset: runtimeImportsDataset,
    case_ids_in_system_prompt: leakedCaseIds,
    finding_descriptions_in_system_prompt: leakedDescriptions,
    note: "Prompt text necessarily contains the source evidence spans. The enforced boundary excludes label fields and case metadata, not the prompt itself."
  };
}

function expectedDecision(evalCase) {
  if (evalCase.safe_prompt) return "READY_TO_GENERATE";
  if (evalCase.expected_findings.some((finding) => finding.preventable && ["medium", "high"].includes(finding.severity))) {
    return "NEEDS_REVISION";
  }
  return "NEEDS_USER_DECISION";
}

function ratio(numerator, denominator) {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

function decisionMetrics(cases, traces) {
  const valid = traces.filter((item) => item.semantic_status === "OK" && item.decision);
  const byId = new Map(cases.map((item) => [item.eval_case_id, item]));
  const falseBlocks = valid.filter((item) => byId.get(item.eval_case_id).safe_prompt && item.decision !== "READY_TO_GENERATE");
  const unsafePasses = valid.filter((item) => !byId.get(item.eval_case_id).safe_prompt && item.decision === "READY_TO_GENERATE");
  const safeDenominator = valid.filter((item) => byId.get(item.eval_case_id).safe_prompt).length;
  const unsafeDenominator = valid.filter((item) => !byId.get(item.eval_case_id).safe_prompt).length;
  const userDecisions = valid.filter((item) => item.decision === "NEEDS_USER_DECISION");
  const matches = valid.filter((item) => item.decision === expectedDecision(byId.get(item.eval_case_id)));
  return {
    denominator_cases: valid.length,
    decision_agreement: ratio(matches.length, valid.length),
    false_block_rate: ratio(falseBlocks.length, safeDenominator),
    unsafe_pass_rate: ratio(unsafePasses.length, unsafeDenominator),
    needs_user_decision_rate: ratio(userDecisions.length, valid.length),
    distribution: Object.fromEntries(["READY_TO_GENERATE", "NEEDS_REVISION", "NEEDS_USER_DECISION"].map((decision) => [
      decision,
      valid.filter((item) => item.decision === decision).length
    ])),
    false_block_cases: falseBlocks.map((item) => item.eval_case_id),
    unsafe_pass_cases: unsafePasses.map((item) => item.eval_case_id),
    note: "Decision labels are derived only for decision-level reporting. They are never passed to or used to label Semantic Analyst findings."
  };
}

function latencySummary(traces) {
  if (traces.length === 0) return null;
  const values = traces.map((item) => item.semantic_latency_ms).sort((a, b) => a - b);
  const percentile = (point) => values[Math.min(values.length - 1, Math.floor(values.length * point))];
  return {
    mean_ms: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95)
  };
}

async function runLiveSemantic() {
  const analyst = new BoundedSemanticAnalyst([createDeepSeekSemanticProvider()], {
    timeout_ms: manifest.frozen_config.timeout_ms,
    max_provider_calls: manifest.frozen_config.max_provider_calls_per_case,
    retry_limit: manifest.frozen_config.retry_limit
  });
  const semanticRuns = [];
  const traces = [];
  for (const evalCase of dataset.cases) {
    const request = generationRequest(evalCase);
    const startedAt = Date.now();
    const outcome = await analyst.analyze(request);
    const semanticLatency = Date.now() - startedAt;
    const status = outcome.status === "OK" ? "OK" : "INFRA_ERROR";
    semanticRuns.push({
      eval_case_id: evalCase.eval_case_id,
      status,
      predictions: outcome.findings,
      structured_output_valid: outcome.status === "OK",
      errors: outcome.errors
    });
    let preflight = null;
    if (outcome.status === "OK") {
      const session = new PreflightSession({ semanticAnalyst: { async analyze() { return outcome; } } });
      preflight = await session.run(request);
    }
    traces.push({
      eval_case_id: evalCase.eval_case_id,
      split: evalCase.split,
      request_fingerprint: sha256(request),
      semantic_status: outcome.status,
      semantic_latency_ms: semanticLatency,
      provider: outcome.provider,
      model: outcome.model,
      provider_calls: outcome.provider_calls,
      retry_count: outcome.retry_count,
      token_usage: outcome.token_usage,
      errors: outcome.errors,
      uncertainties: outcome.uncertainties,
      suggested_revision_returned: outcome.suggested_revision !== null,
      decision: preflight?.decision ?? null,
      preflight_trace_id: preflight?.trace_id ?? null
    });
  }
  const bySplit = Object.fromEntries(["DEV", "HOLDOUT"].map((split) => {
    const splitCases = dataset.cases.filter((item) => item.split === split);
    const ids = new Set(splitCases.map((item) => item.eval_case_id));
    const splitRuns = semanticRuns.filter((item) => ids.has(item.eval_case_id));
    const splitTraces = traces.filter((item) => ids.has(item.eval_case_id));
    return [split, {
      semantic: evaluateSemanticCases(splitCases, splitRuns),
      decision: decisionMetrics(splitCases, splitTraces)
    }];
  }));
  return {
    status: semanticRuns.every((item) => item.status === "OK") ? "COMPLETED" : "COMPLETED_WITH_INFRA_FAILURES",
    execution_mode: "LIVE_SEMANTIC",
    combined: {
      semantic: evaluateSemanticCases(dataset.cases, semanticRuns),
      decision: decisionMetrics(dataset.cases, traces)
    },
    by_split: bySplit,
    latency: latencySummary(traces),
    total_provider_calls: traces.reduce((sum, item) => sum + item.provider_calls, 0),
    total_token_usage: traces.every((item) => item.token_usage !== null)
      ? traces.reduce((sum, item) => sum + item.token_usage, 0)
      : null,
    case_traces: traces
  };
}

const runId = randomUUID();
const contamination = runContaminationAudit();
const providerConfigured = Boolean(process.env[manifest.frozen_config.environment_key_name]);
let liveSemantic;
if (!providerConfigured) {
  liveSemantic = {
    status: "BLOCKED_LIVE_RUN",
    execution_mode: "LIVE_SEMANTIC",
    blocker: {
      domain: "INFRA_ERROR",
      code: "CONFIG",
      provider: manifest.frozen_config.provider,
      message: `${manifest.frozen_config.environment_key_name} is not available in the current process. No .env file was read.`,
      retryable: false
    },
    combined: null,
    by_split: { DEV: null, HOLDOUT: null },
    latency: null,
    total_provider_calls: 0,
    total_token_usage: null,
    case_traces: []
  };
} else {
  liveSemantic = await runLiveSemantic();
}

const report = {
  report_version: "gate2_semantic_eval_report_v1",
  run_id: runId,
  generated_at: new Date().toISOString(),
  gate2_status: liveSemantic.status === "BLOCKED_LIVE_RUN" ? "BLOCKED_LIVE_RUN" : "AWAITING_REVIEWER",
  execution_modes: {
    POLICY_REPLAY: {
      status: "GATE1_ONLY",
      report_json: "data/reports/gate1_eval_report.json",
      report_markdown: "data/reports/gate1_eval_report.md",
      allowed_claim: "Deterministic orchestration and decision-policy replay only.",
      prohibited_claim: "Not evidence of Semantic Analyst finding quality."
    },
    LIVE_SEMANTIC: liveSemantic
  },
  dataset: {
    version: dataset.version,
    label_freeze_status: dataset.label_freeze_status,
    label_provenance: dataset.label_policy.provenance,
    human_review_status: dataset.label_policy.human_review_status,
    split_counts: datasetValidation.split_counts,
    safe_counts: datasetValidation.safe_counts,
    label_revision_history: dataset.label_revision_history,
    label_warning: "Finding labels were authored directly from prompt semantics before the first provider run and were not derived from decision labels or model output. They are not independently human-adjudicated; metrics are provisional."
  },
  contamination_audit: contamination,
  frozen_config: {
    ...manifest.frozen_config,
    runtime_model: DEEPSEEK_SEMANTIC_MODEL,
    runtime_system_prompt_version: SEMANTIC_SYSTEM_PROMPT_VERSION,
    runtime_semantic_prompt_version: SEMANTIC_PROMPT_VERSION,
    runtime_output_schema_version: SEMANTIC_OUTPUT_SCHEMA_VERSION,
    manifest_sha256: sha256(manifest),
    system_prompt_sha256: sha256(SEMANTIC_SYSTEM_PROMPT)
  },
  prompt_tuning: {
    max_substantive_versions: promptHistory.max_substantive_versions,
    versions_used: promptHistory.versions.length,
    history: promptHistory.versions
  },
  capability_slice: {
    model_id: "veo-3.1-generate-001",
    registry_version: manifest.frozen_config.capability_registry_version,
    purpose: "One verified deterministic capability slice; it is not an input to semantic finding labels.",
    sources: [
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate",
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first-and-last-frames"
    ]
  },
  system_truth: {
    accurate_names: ["Hybrid Preflight Decision System", "Bounded Agentic Workflow"],
    llm_tool_calling: false,
    semantic_tools_available: [],
    deterministic_tools_called_by_orchestrator: [
      "get_model_capabilities",
      "validate_generation_parameters",
      "retrieve_failure_patterns",
      "check_protected_constraints"
    ]
  },
  claims: {
    supported_now: [
      "The semantic dataset was frozen before any Gate 2 provider run.",
      "DEV and HOLDOUT are explicit and labels are excluded from provider input.",
      "Finding matching and failure accounting are deterministic and auditable.",
      "The live runner is single-provider, zero-retry, no-fallback, and bounded to one call per case."
    ],
    unsupported_now: [
      "Production semantic accuracy",
      "Credit or ROI savings",
      "Generation-quality improvement",
      "Human-adjudicated benchmark quality",
      "LLM-native tool calling",
      "Multi-agent architecture"
    ]
  }
};

function percent(metric) {
  return metric?.value === null || metric?.value === undefined ? "N/A" : `${(metric.value * 100).toFixed(1)}%`;
}

function splitTable(split, value) {
  if (!value) return `| ${split} | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A |`;
  const semantic = value.semantic;
  return `| ${split} | ${semantic.finding_metrics.denominator_cases} | ${percent(semantic.finding_metrics.precision)} | ${percent(semantic.finding_metrics.recall)} | ${percent(semantic.safe_false_positive_rate)} | ${percent(semantic.high_severity_miss_rate)} | ${percent(semantic.evidence_span_support_rate)} | ${percent(semantic.structured_output_validity)} |`;
}

function decisionTable(split, value) {
  if (!value) return `| ${split} | BLOCKED | N/A | N/A | N/A |`;
  const decision = value.decision;
  return `| ${split} | ${decision.denominator_cases} | ${percent(decision.false_block_rate)} | ${percent(decision.unsafe_pass_rate)} | ${percent(decision.needs_user_decision_rate)} |`;
}

function failureSliceTable(live) {
  const slices = live?.combined?.semantic?.failure_slices;
  if (!slices) return "LIVE_SEMANTIC not run; failure slices are N/A.";
  const required = ["safe", "ambiguity", "conflict", "continuity", "intent", "feasibility", "injection-adversarial"];
  return `| Slice | Cases | TP | FP | FN | Precision | Recall |\n|---|---:|---:|---:|---:|---:|---:|\n` +
    required.map((slice) => {
      const value = slices[slice];
      if (!value) return `| ${slice} | 0 | 0 | 0 | 0 | N/A | N/A |`;
      return `| ${slice} | ${value.case_count} | ${value.true_positive} | ${value.false_positive} | ${value.false_negative} | ${percent(value.precision)} | ${percent(value.recall)} |`;
    }).join("\n");
}

function mismatchList(live, key) {
  const values = live?.combined?.semantic?.[key];
  if (!values) return "N/A — LIVE_SEMANTIC not run.";
  if (values.length === 0) return "None.";
  return values.slice(0, 10).map((item) => {
    const finding = key === "missed_findings" ? item.expected : item.predicted;
    return `- ${item.eval_case_id}: ${finding.category ?? finding.type} — ${finding.description ?? finding.summary}; evidence: \`${finding.evidence_span ?? finding.evidence_excerpt}\`; reason: ${item.reason}`;
  }).join("\n");
}

const markdown = `# Implementation Gate 2 — Semantic Reliability\n\n` +
  `Gate 2 status: **${report.gate2_status}**\n\n` +
  `POLICY_REPLAY and LIVE_SEMANTIC are deliberately separated. Gate 1 replay is not semantic-quality evidence.\n\n` +
  `## Frozen configuration\n\n` +
  `- Provider/model: ${manifest.frozen_config.provider} / ${manifest.frozen_config.model}\n` +
  `- Temperature: ${manifest.frozen_config.temperature}\n` +
  `- Per-case budget: ${manifest.frozen_config.max_provider_calls_per_case} call, ${manifest.frozen_config.retry_limit} retries, ${manifest.frozen_config.timeout_ms} ms\n` +
  `- Fallback: ${manifest.frozen_config.fallback_enabled}\n` +
  `- Manifest SHA-256: \`${report.frozen_config.manifest_sha256}\`\n\n` +
  `## Semantic finding metrics\n\n` +
  `| Split | Valid cases | Precision | Recall | Safe false positive | High-severity miss | Evidence support | Structured validity |\n` +
  `|---|---:|---:|---:|---:|---:|---:|---:|\n` +
  `${splitTable("DEV", liveSemantic.by_split.DEV)}\n` +
  `${splitTable("HOLDOUT", liveSemantic.by_split.HOLDOUT)}\n\n` +
  `## Decision metrics\n\n` +
  `| Split | Valid cases | False block | Unsafe PASS | NEEDS_USER_DECISION |\n` +
  `|---|---:|---:|---:|---:|\n` +
  `${decisionTable("DEV", liveSemantic.by_split.DEV)}\n` +
  `${decisionTable("HOLDOUT", liveSemantic.by_split.HOLDOUT)}\n\n` +
  `## Failure slices\n\n${failureSliceTable(liveSemantic)}\n\n` +
  `## Top missed findings\n\n${mismatchList(liveSemantic, "missed_findings")}\n\n` +
  `## Top spurious findings\n\n${mismatchList(liveSemantic, "spurious_findings")}\n\n` +
  `## Provider / infrastructure\n\n` +
  (liveSemantic.status === "BLOCKED_LIVE_RUN"
    ? `- LIVE_SEMANTIC was not started: ${liveSemantic.blocker.message}\n- Provider calls: 0\n`
    : `- Status: ${liveSemantic.status}\n- Provider calls: ${liveSemantic.total_provider_calls}\n- Provider failure rate: ${percent(liveSemantic.combined.semantic.provider_failures.rate)}\n`) +
  `\n## Dataset and claim boundary\n\n` +
  `- Dataset: ${dataset.version}; DEV ${datasetValidation.split_counts.DEV}, HOLDOUT ${datasetValidation.split_counts.HOLDOUT}.\n` +
  `- Safe cases: DEV ${datasetValidation.safe_counts.DEV}, HOLDOUT ${datasetValidation.safe_counts.HOLDOUT}.\n` +
  `- Labels were authored before the first provider run, but human adjudication is ${dataset.label_policy.human_review_status}; all quality metrics remain provisional.\n` +
  `- Contamination audit: ${contamination.programmatic_verdict}.\n` +
  `- No claims are made about real generation success, credits saved, production accuracy, or LLM-native tool calling.\n`;

mkdirSync("data/reports", { recursive: true });
writeFileSync("data/reports/gate2_semantic_eval_report.json", `${JSON.stringify(report, null, 2)}\n`);
writeFileSync("data/reports/gate2_semantic_eval_report.md", markdown);
console.log(JSON.stringify({
  gate2_status: report.gate2_status,
  run_id: report.run_id,
  live_semantic_status: liveSemantic.status,
  provider_calls: liveSemantic.total_provider_calls,
  contamination_audit: contamination.programmatic_verdict,
  report_json: "data/reports/gate2_semantic_eval_report.json",
  report_markdown: "data/reports/gate2_semantic_eval_report.md"
}, null, 2));

if (liveSemantic.status === "BLOCKED_LIVE_RUN" && !allowMissingProvider) process.exitCode = 1;
