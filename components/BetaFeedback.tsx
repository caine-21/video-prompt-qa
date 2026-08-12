"use client";

import { useState } from "react";
import type { HumanFeedback } from "@/lib/types";

interface Props {
  onSubmit: (feedback: HumanFeedback) => void;
}

export default function BetaFeedback({ onSubmit }: Props) {
  const [submitted, setSubmitted] = useState<"yes" | "no" | null>(null);

  function submit(value: "yes" | "no") {
    onSubmit({ rating: value === "yes" ? 1 : 3 });
    setSubmitted(value);
  }

  return (
    <section className="feedback-widget" aria-labelledby="feedback-title">
      {submitted ? (
        <p className="feedback-thanks" role="status">Thanks — your anonymous signal helps calibrate the beta.</p>
      ) : (
        <>
          <div>
            <p id="feedback-title" className="feedback-title">Was this useful?</p>
            <p className="feedback-note">One tap. No prompt or account data is sent.</p>
          </div>
          <div className="feedback-actions">
            <button type="button" className="feedback-button" onClick={() => submit("yes")}>Yes</button>
            <button type="button" className="feedback-button" onClick={() => submit("no")}>Not really</button>
          </div>
        </>
      )}
    </section>
  );
}
