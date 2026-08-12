import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const baseUrl = process.argv[2] ?? "https://videopromptqa.netlify.app";
const count = Math.max(1, Math.min(20, Number(process.argv[3] ?? 6)));
const delayMs = Math.max(250, Math.min(30_000, Number(process.argv[4] ?? 1500)));
const output = process.argv[5];
const fixtures = [
  "A black cat walks through a sunlit kitchen, locked medium shot, soft daylight, no text.",
  "4K drone shot, golden hour, bokeh, slow motion.",
  "A product spins while the camera locks and orbits 360 degrees around it.",
  "An elderly fisherman raises a lantern on a foggy pier, then the scene cuts to a crowded market.",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const samples = [];

for (let index = 0; index < count; index += 1) {
  const started = Date.now();
  const prompt = fixtures[index % fixtures.length];
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const body = await response.json().catch(() => ({}));
    samples.push({
      case: `fixture_${index % fixtures.length}`,
      http_status: response.status,
      latency_ms: Date.now() - started,
      ok: response.ok,
      requested_provider: body.requested_provider,
      actual_provider: body.actual_provider,
      fallback: body.fallback,
      error_type: body.errorType ?? (!response.ok ? `http_${response.status}` : undefined),
      score: typeof body.overallScore === "number" ? body.overallScore : undefined,
    });
  } catch (error) {
    samples.push({
      case: `fixture_${index % fixtures.length}`,
      http_status: null,
      latency_ms: Date.now() - started,
      ok: false,
      error_type: error instanceof Error ? error.name : "unknown",
    });
  }
  if (index + 1 < count) await sleep(delayMs);
}

const latencies = samples.map((sample) => sample.latency_ms).sort((a, b) => a - b);
const p95 = latencies[Math.min(latencies.length - 1, Math.max(0, Math.ceil(latencies.length * 0.95) - 1))];
const report = {
  schema_version: 1,
  suite: "video-http-soak",
  base_url: baseUrl,
  evidence_boundary: "real HTTP requests with public prompts; provider billing/availability is not inferred from a 200 alone",
  summary: {
    count: samples.length,
    passed: samples.filter((sample) => sample.ok).length,
    failed: samples.filter((sample) => !sample.ok).length,
    fallback_count: samples.filter((sample) => sample.fallback === true).length,
    p95_ms: p95 ?? null,
  },
  samples,
};
if (output) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(report.summary));
console.log(JSON.stringify(report.samples));
if (report.summary.failed > 0) process.exitCode = 1;
