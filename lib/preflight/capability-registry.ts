import { z } from "zod";
import { CAPABILITY_REGISTRY_VERSION } from "./contracts.ts";

export const CapabilityEvidenceStatusSchema = z.enum(["VERIFIED", "EXPERIMENTAL", "UNKNOWN"]);

export const ModelCapabilitySchema = z.object({
  model_id: z.string().min(1),
  display_name: z.string().min(1),
  scope: z.enum(["BENCHMARK_ONLY", "RUNTIME"]),
  duration_seconds: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    allowed_values: z.array(z.number().positive()).optional()
  }).nullable(),
  aspect_ratios: z.array(z.string()),
  modes: z.array(z.string()),
  reference_support: z.boolean().nullable(),
  known_limitations: z.array(z.string()),
  evidence_status: CapabilityEvidenceStatusSchema,
  evidence_note: z.string().min(1),
  sources: z.array(z.object({
    title: z.string().min(1),
    reference: z.string().url(),
    checked_at: z.string().date()
  })),
  registry_version: z.string().min(1)
});

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

const REGISTRY: Record<string, ModelCapability> = {
  "benchmark-generic-video-v1": ModelCapabilitySchema.parse({
    model_id: "benchmark-generic-video-v1",
    display_name: "Gate 1 generic benchmark profile",
    scope: "BENCHMARK_ONLY",
    duration_seconds: { min: 1, max: 10 },
    aspect_ratios: ["16:9", "9:16", "1:1"],
    modes: ["text-to-video", "image-to-video"],
    reference_support: true,
    known_limitations: [
      "This profile exists only to exercise deterministic contracts in Gate 1.",
      "It is not evidence about any commercial video generation provider."
    ],
    evidence_status: "EXPERIMENTAL",
    evidence_note: "Internal benchmark contract; no external provider capability claim.",
    sources: [],
    registry_version: CAPABILITY_REGISTRY_VERSION
  }),
  "veo-3.1-generate-001": ModelCapabilitySchema.parse({
    model_id: "veo-3.1-generate-001",
    display_name: "Google Veo 3.1 Generate",
    scope: "RUNTIME",
    duration_seconds: { min: 4, max: 8, allowed_values: [4, 6, 8] },
    aspect_ratios: ["16:9", "9:16"],
    modes: ["text-to-video", "image-to-video", "first-last-frame-to-video", "reference-image-to-video"],
    reference_support: true,
    known_limitations: [
      "Reference-image-to-video generation supports 8-second output only.",
      "The documented prompt language for this model is English."
    ],
    evidence_status: "VERIFIED",
    evidence_note: "Google Cloud model documentation checked 2026-08-10: model ID, supported modes, 4/6/8-second durations, 16:9 and 9:16 aspect ratios, and reference-image support.",
    sources: [
      {
        title: "Veo 3.1 Generate model documentation",
        reference: "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate",
        checked_at: "2026-08-10"
      },
      {
        title: "Generate videos from first and last frames",
        reference: "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first-and-last-frames",
        checked_at: "2026-08-10"
      }
    ],
    registry_version: CAPABILITY_REGISTRY_VERSION
  })
};

export function findModelCapability(modelId: string): ModelCapability | null {
  return REGISTRY[modelId] ?? null;
}
