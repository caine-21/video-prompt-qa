"use client";

// ─── Explicit CSR boundary ────────────────────────────────────────────────────
// Everything rendered inside this component runs on the client only.
// Server components must NOT import from this file.
//
// SSR / hydration note:
//   This app is currently fully client-rendered (hooks-heavy, interactive).
//   If eval dashboard grows to include server-fetched data (history, metrics,
//   shared evaluations), extract those into server components that pass data
//   as props here — do NOT move providers into layout.tsx.
//
// To add a new client-side provider (analytics, auth, theme, feature flags):
//   add it here — one file, one place to audit CSR dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/lang-context";

interface Props {
  children: ReactNode;
}

export default function ClientProviders({ children }: Props) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
