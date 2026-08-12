import assert from "node:assert/strict";
import test from "node:test";
import { PreflightSession } from "../../lib/preflight/session.ts";

const noRiskAnalyst = {
  async analyze() {
    return {
      status: "OK",
      findings: [],
      uncertainties: [],
      suggested_revision: null,
      provider: "fixture",
      model: "fixture-semantic-v1",
      provider_calls: 1,
      retry_count: 0,
      token_usage: null,
      errors: []
    };
  }
};

test("a constrained request with no detected risk is ready and auditable", async () => {
  const session = new PreflightSession({ semanticAnalyst: noRiskAnalyst });
  const result = await session.run({
    prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
    target_model: "benchmark-generic-video-v1",
    duration: 5,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: ["One ceramic mug", "locked camera", "no text"]
  });

  assert.equal(result.decision, "READY_TO_GENERATE");
  assert.equal(result.issues.length, 0);
  assert.ok(result.evidence.some((item) => item.source === "CAPABILITY"));
  assert.equal(result.trace.decision, result.decision);
  assert.match(result.trace.run_id, /^[0-9a-f-]{36}$/);
  assert.equal(result.metadata.contract_version, "preflight_contract_v1");
});

test("a deterministic parameter failure short-circuits semantic provider calls", async () => {
  let calls = 0;
  const session = new PreflightSession({
    semanticAnalyst: {
      async analyze() {
        calls += 1;
        return noRiskAnalyst.analyze();
      }
    }
  });

  const result = await session.run({
    prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
    target_model: "benchmark-generic-video-v1",
    duration: 20,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: []
  });

  assert.equal(result.decision, "NEEDS_REVISION");
  assert.equal(calls, 0);
  assert.equal(result.trace.provider_calls, 0);
  assert.ok(!result.trace.checks_executed.includes("semantic_analysis"));
});

test("an unknown model produces a user decision without inventing capabilities", async () => {
  let calls = 0;
  const session = new PreflightSession({
    semanticAnalyst: {
      async analyze() {
        calls += 1;
        return noRiskAnalyst.analyze();
      }
    }
  });
  const result = await session.run({
    prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
    target_model: "unregistered-video-model",
    duration: 5,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: []
  });

  assert.equal(result.decision, "NEEDS_USER_DECISION");
  assert.equal(calls, 0);
  assert.equal(result.uncertainties[0].type, "CAPABILITY_UNKNOWN");
  assert.equal(result.uncertainties[0].evidence[0].evidence_status, "UNKNOWN");
});

test("a preventable semantic conflict produces revision with pattern evidence", async () => {
  const session = new PreflightSession({
    semanticAnalyst: {
      async analyze() {
        return {
          status: "OK",
          findings: [{
            id: "conflicting-camera",
            type: "SEMANTIC_CONFLICT",
            severity: "HIGH",
            confidence: "HIGH",
            summary: "The camera cannot be locked and orbit simultaneously.",
            evidence_excerpt: "locked camera that orbits 360 degrees",
            preventability: "PREVENTABLE",
            risk_pattern_ids: ["prompt_conflict"],
            recommended_action: "Choose one camera behavior."
          }],
          uncertainties: [],
          suggested_revision: null,
          provider: "fixture",
          model: "fixture-semantic-v1",
          provider_calls: 1,
          retry_count: 0,
          token_usage: 20,
          errors: []
        };
      }
    }
  });
  const result = await session.run({
    prompt: "Show a product with a locked camera that orbits 360 degrees around it.",
    target_model: "benchmark-generic-video-v1",
    duration: 5,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: []
  });

  assert.equal(result.decision, "NEEDS_REVISION");
  assert.deepEqual(result.issues[0].evidence.map((item) => item.source), [
    "SEMANTIC_FINDING",
    "FAILURE_PATTERN"
  ]);
  assert.ok(result.trace.checks_executed.includes("retrieve_failure_patterns"));
});
