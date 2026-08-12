import assert from "node:assert/strict";
import test from "node:test";
import { safeProviderCall, setProviderEventObserver } from "../../lib/providers/base.ts";

test("provider attempt events capture a bounded timeout recovery without raw error text", async () => {
  const events = [];
  let calls = 0;
  setProviderEventObserver((event) => events.push(event));
  try {
    const result = await safeProviderCall(async () => {
      calls += 1;
      if (calls === 1) throw new Error("request timed out with secret payload");
      return "ok";
    }, "deepseek", "evaluation", 1);

    assert.equal(result.success, true);
    assert.equal(events.filter((event) => event.event === "provider_attempt_started").length, 2);
    assert.equal(events.filter((event) => event.event === "provider_retry_scheduled").length, 1);
    assert.equal(events[1].error_type, "timeout");
    assert.equal(JSON.stringify(events).includes("secret payload"), false);
  } finally {
    setProviderEventObserver(undefined);
  }
});
