import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProviderError } from "../lib/providers/base.ts";

function errorWithStatus(message, status) {
  return Object.assign(new Error(message), { status });
}

test("provider diagnostics classify failures without exposing raw provider details", () => {
  const cases = [
    [new Error("DEEPSEEK_API_KEY is not set"), "missing_config"],
    [errorWithStatus("DeepSeek auth error", 401), "auth"],
    [errorWithStatus("DeepSeek error 402: insufficient balance", 402), "insufficient_balance"],
    [errorWithStatus("DeepSeek error 404: model not found", 404), "invalid_model"],
    [errorWithStatus("DeepSeek error 422: rejected", 422), "upstream_4xx"],
    [errorWithStatus("DeepSeek error 503", 503), "upstream_5xx"],
    [new Error("request timed out"), "timeout"],
    [new SyntaxError("Unexpected token"), "invalid_response"],
  ];

  for (const [error, expected] of cases) {
    const result = normalizeProviderError(error, "deepseek", "evaluation");
    assert.equal(result.type, expected);
    assert.equal(result.raw?.err, error);
    assert.match(result.message, /deepseek/i);
  }
});
