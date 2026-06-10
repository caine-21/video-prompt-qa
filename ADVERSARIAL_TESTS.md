# Adversarial Evaluation — Failure Mode Analysis

**System:** video-prompt-qa 5-dimension evaluator  
**Model:** Groq / llama-3.3-70b-versatile  
**Initial test date:** 2026-04-26 | **Experiment 2 date:** 2026-06-11  
**Scripts:** `run_adversarial.py` / `run_subject_omission_experiment.py`  
**Raw data:** `tests/adversarial-results.json` / `tests/subject-omission-results.json`

---

## Executive Summary

Four real failure modes confirmed. One is critical and was validated by a controlled experiment.

1. **Subject Omission Attack (confirmed by controlled experiment)** — A prompt with no subject but professional cinematography terms scored 8.4/10 (G1). Controlled experiment (9 prompts, 3×3 design) confirmed that at high vocabulary density, the score gap between no-subject and real-subject prompts collapses to 0.2 points. A fake subject ("Something moving...") scored Specificity=9 — higher than a prompt with an actual subject.
2. **Contradictions are rewarded as creativity** — logically impossible prompts ("fast slow-motion", "dark cheerful") score TF=7-8 and Creativity=8. The model interprets conflicts as artistic intent.
3. **Physical impossibility is under-penalized** — filming inside a black hole scores TF=4, not 1. The model downgrades but doesn't bottom out.
4. **Single-word TF inflation** — "cat" scores TF=8 because the model reasons it's "technically filmable."

One strength confirmed: **the system is fully deterministic** at temperature=0. The same prompt returns identical scores across three independent runs (StdDev=0).

---

## Test Results

### Category 1 — Boundary Inputs

| ID | Prompt | Overall | Cla | Spe | TF | Cin | Cre | Verdict |
|---|---|---|---|---|---|---|---|---|
| B1 | *(empty)* | 1.0 | 1 | 1 | 1 | 1 | 1 | ✅ Handled correctly |
| B2 | "cat" | 2.8 | 2 | 1 | **8** | 1 | 2 | ⚠️ TF=8 is wrong |
| B3 | "xkq7 bla3 zzz !!!" | 1.0 | 1 | 1 | 1 | 1 | 1 | ✅ Handled correctly |

**Note on B2:** The model reasons "a cat is technically feasible to film" — which is logically true but misses that "cat" is not a video generation prompt. Technical Feasibility is being evaluated as cinematographic feasibility, not prompt completeness.

---

### Category 2 — Score Gaming (Buzzword Padding)

| ID | Prompt (truncated) | Overall | Cla | Spe | TF | Cin | Cre | Verdict |
|---|---|---|---|---|---|---|---|---|
| G1 | "cinematic 4K aerial drone shot with bokeh, golden hour..." | **8.4** | 9 | **8** | 9 | 9 | 7 | ❌ Critical failure |
| G2 | "Epic cinematic masterpiece with stunning visuals..." | 5.0 | 4 | 2 | 6 | 8 | 5 | ✅ Correctly penalized |
| G3 | "A beautiful, amazing, incredible, stunning... landscape" | 4.6 | 6 | 2 | 8 | 4 | 3 | ✅ Correctly penalized |

**G1 is the critical finding.** The prompt contains zero subject — we don't know what is being filmed. Yet it scores 8.4 overall and Specificity=8. The evaluator responds to cinematographic vocabulary (4K, bokeh, golden hour, aerial drone) and conflates *how to film* with *what to film*. A human QA engineer would immediately flag this prompt as underspecified.

G2 and G3 show the model handles pure adjective stacking correctly — Specificity drops to 2. The failure in G1 is specific to prompts that use *technical* rather than *descriptive* vocabulary.

---

### Category 3 — Deliberate Contradictions

| ID | Prompt (truncated) | Overall | Cla | Spe | TF | Cin | Cre | Verdict |
|---|---|---|---|---|---|---|---|---|
| C1 | "fast slow-motion shot of a perfectly still moving object..." | 6.6 | 4 | 6 | **8** | 7 | **8** | ❌ TF and Cre wrong |
| C2 | "dark cheerful intimate epic scene, crowd of one, silent but audio-driven" | 6.8 | 6 | 8 | 7 | 5 | **8** | ❌ Rewarding contradictions |
| C3 | "minimalist maximalist, no color but vibrant palette, close-up wide-angle" | 6.6 | 4 | 6 | **8** | 7 | **8** | ❌ Same pattern |

**Failure pattern:** Logically contradictory prompts consistently receive high Creativity scores (7-8) and high Technical Feasibility scores (7-8). The model appears to interpret contradictions as surrealist or avant-garde artistic intent rather than flagging them as structurally broken.

This means an adversarial user could write incoherent prompts and receive inflated scores by exploiting the model's tendency to assume artistic intent.

---

### Category 4 — Technical Impossibility

| ID | Prompt (truncated) | Overall | Cla | Spe | TF | Cin | Cre | Verdict |
|---|---|---|---|---|---|---|---|---|
| T1 | "Film inside a black hole at 8K 120fps..." | 6.8 | 8 | 6 | **4** | 7 | 9 | ⚠️ TF should be 1 |
| T2 | "6-hour AI video of hummingbird wing at 100,000fps..." | 5.8 | 8 | 9 | **2** | 6 | 4 | ✅ Best catch |
| T3 | "Real-time interactive 3D holographic video..." | 5.8 | 6 | 2 | **4** | 8 | 9 | ⚠️ Not a video prompt |

**T2 is the best-handled case** — the model correctly identifies that 100,000fps hummingbird wing detail is beyond current AI video capability and scores TF=2.

**T1 and T3 are under-penalized.** Filming inside a black hole (TF=4) and generating interactive holograms (TF=4) should score 1. The model downgrades but doesn't bottom out, suggesting it partially forgives physically impossible requests.

**T1's Creativity=9** reveals the same pattern as contradictions — impossibility is reframed as imaginative ambition rather than a hard failure.

---

### Category 5 — Consistency (temperature=0)

| Run | Overall | Cla | Spe | TF | Cin | Cre |
|---|---|---|---|---|---|---|
| K1 | 8.2 | 9 | 8 | 9 | 9 | 6 |
| K2 | 8.2 | 9 | 8 | 9 | 8 | 7 |
| K3 | 8.2 | 8 | 9 | 9 | 9 | 6 |
| **StdDev** | **0.0** | — | — | — | — | — |

Overall score is perfectly stable across three independent runs. Individual dimension scores show minor variation (Cinematic: 8-9, Creativity: 6-7, Specificity: 8-9) but always sum to the same overall.

**Conclusion:** At temperature=0, the system is deterministic for overall scoring. Dimension-level scores have small positional variance (which dimension gets the "swing point") but the aggregate is stable. Suitable for A/B evaluation where consistency matters.

---

---

## Experiment 2 — Subject Omission Attack (Controlled, 2026-06-11)

**Research question:** Is G1 a one-off, or does vocabulary density systematically inflate scores independent of subject presence?

**Design:** 3×3 matrix. Groups: S (Real Subject) / N (No Subject) / F (Fake Subject). Vocab levels: V0 (minimal) / V+ (moderate) / V++ (maximum). Plus G1+S control (same vocabulary as G1, real subject added).

**Script:** `run_subject_omission_experiment.py` | **Raw data:** `tests/subject-omission-results.json`

### Full Results

| ID | Group | Vocab Level | Overall | Cla | Spe | TF | Cin | Cre |
|---|---|---|---|---|---|---|---|---|
| S-V0 | Real Subject | V0 minimal | 5.2 | 8 | 2 | 9 | 4 | 3 |
| S-V+ | Real Subject | V+ moderate | 7.6 | 8 | 7 | 9 | 8 | 6 |
| S-V++ | Real Subject | V++ high density | 8.0 | 9 | 8 | 8 | 9 | 6 |
| N-V0 | No Subject | V0 minimal | 4.6 | 6 | 2 | 8 | 4 | 3 |
| N-V+ | No Subject | V+ moderate | 6.8 | 8 | 6 | 9 | 7 | 4 |
| **N-V++** | **No Subject** | **V++ high — G1** | **8.2** | **9** | **8** | **9** | **9** | **6** |
| F-V+ | Fake Subject | V+ moderate | 7.0 | 8 | 6 | 9 | 7 | 5 |
| **F-V++** | **Fake Subject** | **V++ high density** | **8.0** | **8** | **9** | **8** | **9** | **6** |
| G1+S | G1 Repaired | V++ + real subject | 8.0 | 9 | 8 | 8 | 9 | 6 |

### Key Comparisons

| Comparison | A | B | Delta | Finding |
|---|---|---|---|---|
| G1 vs G1+subject | N-V++ = 8.2 | S-V++ = 8.0 | **-0.2** | Adding real subject changes score by 0.2 |
| No subject vs fake subject | N-V++ = 8.2 | F-V++ = 8.0 | -0.2 | "Something moving" games evaluator equally |
| Real subject: vocab effect | S-V0 = 5.2 | S-V++ = 8.0 | +2.8 | Vocabulary adds 2.8 points when subject exists |
| No subject: vocab effect | N-V0 = 4.6 | N-V++ = 8.2 | **+3.6** | Vocabulary adds 3.6 points when subject absent |

### Findings

**Finding 1 — Subject presence is irrelevant at high vocabulary density.**
N-V++ (8.2) vs S-V++ (8.0): the score gap is 0.2. The evaluator cannot distinguish between a subjectless prompt and a prompt with a clear subject when both use dense cinematographic vocabulary.

**Finding 2 — Fake subjects ("Something moving") game the evaluator as effectively as no subject.**
F-V++ scored Overall=8.0 and Specificity=**9** — one point higher than S-V++ (Spe=8) which has an actual subject (a black cat). The evaluator rewards technical vocabulary density, not semantic completeness.

**Finding 3 — The gaming effect is larger on subjectless prompts.**
Adding vocabulary to a subjectless prompt (N: +3.6 points) has a bigger effect than adding it to a prompt with a real subject (S: +2.8 points). Subject absence amplifies vocabulary gaming because there's no semantic anchor to "compete" with the technical vocabulary signals.

**Mechanism (observed):** The Specificity dimension's rubric asks whether the prompt includes "enough detail (subject, style, motion, lighting, mood)." Cinematographic terms satisfy the *style/motion/lighting* part of this rubric, masking the missing *subject* part. The evaluator never performs an explicit subject-existence check.

**Scope:** These findings are specific to Groq / llama-3.3-70b-versatile with this fixed rubric. Whether the same pattern holds across other providers (GPT-4, Claude, Gemini) is an open question. Cross-provider replication is the next logical step.

---

## Failure Mode Summary

| # | Failure Mode | Severity | Root Cause | Evidence |
|---|---|---|---|---|
| 1 | **Subject Omission Attack** | 🔴 Critical | Vocab density overrides subject-existence signal; "how to film" detail counted as "what to film" completeness | N-V++=8.2 vs S-V++=8.0 (Δ=0.2); F-V++ Spe=9 > S-V++ Spe=8 |
| 2 | **Contradictions rewarded as creativity** | 🟠 High | Model assumes artistic intent rather than flagging structural errors | C1-C3 TF=7-8, Cre=8 |
| 3 | **Physical impossibility under-penalized** | 🟡 Medium | Model downgrades TF but doesn't bottom out at 1 | T1 TF=4 |
| 4 | **Single-word TF inflation** | 🟡 Low | "cat" = TF:8 because it's filmable, not because it's a valid prompt | B2 TF=8 |

---

## Implications for Evaluator Design

**If this were a production QA system, three fixes would be warranted:**

1. **Subject detection gate:** Before scoring, verify the prompt contains an identifiable subject (person, object, scene). If not, cap Specificity at 3 regardless of vocabulary quality.

2. **Contradiction detector:** Add a pre-pass that flags logical contradictions (antonym pairs, mutually exclusive attributes). Contradicted prompts should have their TF score capped, not boosted by Creativity.

3. **Feasibility hard floor:** Physically impossible prompts (space physics, real-time interactivity, extreme specs beyond current AI capability) should score TF=1, not TF=2-4. The rubric should define hard-floor conditions.

These are not code changes — they are **prompt engineering changes** to the system prompt that defines the evaluation rubric.
