import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithTimeout } from "../../lib/providers/base.ts";
import { safeProviderCall } from "../../lib/providers/base.ts";

test("provider fetch aborts before a serverless request deadline", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => await new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => {
      const error = new Error("upstream deadline");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });

  try {
    await assert.rejects(
      fetchWithTimeout("https://provider.invalid", {}, 10),
      (error) => error?.name === "AbortError",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider call returns on its own deadline even when the underlying function ignores abort", async () => {
  const started = Date.now();
  const result = await safeProviderCall(
    () => new Promise((resolve) => setTimeout(() => resolve("too late"), 100)),
    "deepseek",
    "evaluation",
    0,
    1,
    10,
  );

  assert.equal(result.success, false);
  assert.equal(result.error.type, "timeout");
  assert.ok(Date.now() - started < 80);
});
