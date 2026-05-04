"use client";

import { useState } from "react";
import type { EvaluationResult, AIProvider } from "@/lib/types";
import { buildShareURL } from "@/lib/share";

interface Props {
  provider: AIProvider;
  result: EvaluationResult;
  improvedResult?: EvaluationResult;
  demoMode?: boolean;
  demoTitle?: string;
}

export default function ShareButton({ provider, result, improvedResult, demoMode, demoTitle }: Props) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = buildShareURL({
      version: "v1",
      provider,
      result,
      improvedResult,
      demoMode,
      demoTitle,
    });
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <button
      onClick={handleShare}
      style={{
        background: copied ? "#FFD93D" : "#000",
        color: copied ? "#000" : "#FFD93D",
        border: "3px solid #000",
        boxShadow: copied ? "none" : "4px 4px 0 rgba(0,0,0,0.3)",
        padding: "8px 18px",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        cursor: "pointer",
        fontFamily: "var(--font-space-grotesk), sans-serif",
        transition: "all 150ms ease-linear",
      }}
    >
      {copied ? "✓ Link Copied!" : "⬡ Share / Demo Link"}
    </button>
  );
}
