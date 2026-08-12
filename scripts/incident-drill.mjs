import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setProviderEventObserver, safeProviderCall } from "../lib/providers/base.ts";

function errorWithStatus(message, status) {
  return Object.assign(new Error(message), { status });
}

async function runCase(name, failurePlan, recovery, retries = 0) {
  const events = [];
  let calls = 0;
  setProviderEventObserver((event) => events.push(event));
  let result;
  try {
    result = await safeProviderCall(
      async () => {
        calls += 1;
        if (calls <= failurePlan.count) throw failurePlan.error;
        return recovery;
      },
      "deepseek",
      "incident-drill",
      retries,
    );
  } finally {
    setProviderEventObserver(undefined);
  }
  const failed = events.filter((event) => event.event === "provider_attempt_failed");
  return {
    name,
    injection: "synthetic provider function; no network egress",
    observed: {
      success: result.success,
      error_type: result.success ? null : result.error.type,
      attempt_count: events.filter((event) => event.event === "provider_attempt_started").length,
      failure_types: failed.map((event) => event.error_type),
      retries_scheduled: events.filter((event) => event.event === "provider_retry_scheduled").length,
    },
    events,
  };
}

async function main() {
  const timeoutRecovery = await runCase("provider_timeout_recovery", { count: 1, error: new Error("request timed out") }, "recovered", 1);
  const rateLimit = await runCase("provider_rate_limit_bounded_retry", { count: 2, error: errorWithStatus("rate limited", 429) }, "unused", 1);
  const malformed = await runCase("malformed_structured_output_fail_closed", { count: 1, error: new SyntaxError("Unexpected token") }, "unused", 0);

  assert.equal(timeoutRecovery.observed.success, true);
  assert.equal(timeoutRecovery.observed.error_type, null);
  assert.equal(timeoutRecovery.observed.attempt_count, 2);
  assert.deepEqual(timeoutRecovery.observed.failure_types, ["timeout"]);
  assert.equal(rateLimit.observed.success, false);
  assert.deepEqual(rateLimit.observed.failure_types, ["rate_limit", "rate_limit"]);
  assert.equal(malformed.observed.success, false);
  assert.deepEqual(malformed.observed.failure_types, ["invalid_response"]);

  const result = {
    schema_version: 1,
    suite: "video-incident-drill",
    evidence_boundary: {
      provider_failures: "synthetic; no provider credits or network egress",
      production_provider_boundary: "the current registry has DeepSeek only; no second provider is claimed",
    },
    incidents: [
      {
        incident_id: "VID-INC-001",
        incident: "semantic/evaluation provider timeout",
        diagnosis: "provider attempt telemetry distinguishes timeout from a successful retry",
        fix: "keep bounded retry and expose redacted attempt events",
        verification: timeoutRecovery,
      },
      {
        incident_id: "VID-INC-002",
        incident: "rate limit persists after bounded retry",
        diagnosis: "429 remains rate_limit after the retry budget is exhausted",
        fix: "return a typed failure instead of fabricating an evaluation",
        verification: rateLimit,
      },
      {
        incident_id: "VID-INC-003",
        incident: "provider returns malformed structured output",
        diagnosis: "schema/parser failure is classified as invalid_response",
        fix: "fail the operation and require a new bounded attempt; do not score invalid output",
        verification: malformed,
      },
    ],
  };
  const output = process.argv[2];
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({
    suite: result.suite,
    incidents: result.incidents.length,
    statuses: result.incidents.map((incident) => ({
      incident_id: incident.incident_id,
      success: incident.verification.observed.success,
      error_type: incident.verification.observed.error_type,
      attempts: incident.verification.observed.attempt_count,
    })),
    artifact: output ?? null,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
