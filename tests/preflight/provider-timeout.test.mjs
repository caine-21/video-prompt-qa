import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithTimeout } from "../../lib/providers/base.ts";

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
