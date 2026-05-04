import type { EvaluationResult, AIProvider } from "@/lib/types";

export interface ShareState {
  version: "v1";
  provider: AIProvider;
  result: EvaluationResult;
  improvedResult?: EvaluationResult;
  demoMode?: boolean;
  demoTitle?: string;
}

export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify(state);
  return btoa(encodeURIComponent(json));
}

export function decodeShareState(encoded: string): ShareState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as ShareState;
  } catch {
    return null;
  }
}

export function buildShareURL(state: ShareState): string {
  const encoded = encodeShareState(state);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
  return `${base}#share=${encoded}`;
}

export function readShareFromURL(): ShareState | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/[#&]share=([^&]*)/);
  if (!match) return null;
  return decodeShareState(match[1]);
}
