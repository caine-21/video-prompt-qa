"""
Subject Detection Gate Validation — video-prompt-qa
====================================================

Tests the Subject Detection Gate against the key cases from the Subject
Omission Attack experiment. Uses the FULL production EVALUATION_SYSTEM_PROMPT
(copied verbatim from lib/providers/base.ts) — same model, same rubric,
same prompts as the original experiment.

Shows before (from tests/subject-omission-results.json) vs after scores
to verify the gate works as designed.

Usage:
  python run_subject_gate_validation.py
  python run_subject_gate_validation.py --output tests/subject-gate-validation.json
"""

import sys, os, json, time, argparse
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv

if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("../rag-demo/.env"):
    load_dotenv("../rag-demo/.env")

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found.")

# Full production EVALUATION_SYSTEM_PROMPT with Subject Detection Gate
# Copied verbatim from lib/providers/base.ts
SYSTEM_PROMPT = """You are an expert AI video generation quality engineer. Evaluate the given prompt with strict, calibrated scoring — do not inflate scores.

## SCORING SCALE (apply to every dimension)
1–3: Fails entirely — missing the core element, unusable as-is
4–6: Partial — something is there but too vague, generic, or incomplete to guide a model reliably
7–8: Solid — clear and usable, minor gaps that would benefit from improvement
9–10: Production-ready — specific, precise, leaves no room for model misinterpretation

A single-word or 2-word prompt (e.g. "a cat") must score 1–3 on most dimensions. Reserve 8+ for prompts with explicit cinematic language. Never give 7+ unless the prompt explicitly contains that element.

## DIMENSIONS — score each 1–10

1. Clarity: Is the subject and action unambiguous? Could different people interpret this differently?
2. Specificity: Does it name specific details — not just "man" but "elderly fisherman", not just "moving" but "rowing slowly against current"?
3. Technical Feasibility: Can current AI video models (2024–2025) realistically generate this without hallucinating unsupported physics or complex interactions?
4. Cinematic Quality: Does it include shot type (close-up, wide shot), camera movement (pan, dolly, handheld), or lighting setup (golden hour, neon, overcast)?
5. Creativity: Is it visually distinct? Would it produce a generic stock-footage result, or something memorable?

FEEDBACK RULE: Every feedback string MUST quote or directly reference a specific word or phrase from the prompt. Do not write generic advice. If the prompt is "a cat", say "The word 'cat' gives no breed, color, size, or setting" — not "the subject could be more specific".

## ANATOMY — classify each component as present, partial, or absent

Status definitions:
- "present": The prompt explicitly and usably describes this component. A specific word/phrase covers it.
- "partial": Something is implied or vaguely hinted, but not explicit enough to guide the model reliably.
- "absent": No mention, no implication. The model must guess entirely.

Components:
- Subject: the main person/object/character (present = named specifically; partial = generic category; absent = no subject)
- Action: what the subject does or how it moves (present = specific verb + manner; partial = vague motion implied; absent = static or unspecified)
- Style: visual aesthetic, look, or genre (present = named style e.g. "noir", "anime", "hyperrealistic"; partial = mood words that imply style; absent = no aesthetic direction)
- Lighting: light source, time of day, or mood lighting (present = named explicitly e.g. "golden hour", "neon-lit", "overcast"; partial = atmosphere words that imply lighting; absent = no lighting cue)
- Camera: shot type, angle, or movement (present = named explicitly e.g. "close-up", "slow dolly", "handheld"; partial = implied framing; absent = no camera direction)
- Mood: emotional tone or atmosphere (present = explicit mood word e.g. "melancholic", "tense", "euphoric"; partial = implied by setting; absent = neutral or unspecified)
- Duration: implied length or pacing (present = explicit e.g. "slow motion", "quick cuts", "10-second clip"; partial = implied by action pacing; absent = no pacing cue)

For the note field: if present/partial, quote the exact words from the prompt that triggered this status. If absent, write null.

## SUBJECT DETECTION GATE — apply BEFORE assigning dimension scores

Step 1: Classify Subject in the anatomy array.
Step 2: Enforce these hard constraints based on Subject status:

**If Subject is "absent"** (no person, animal, object, or specific scene element named):
- Specificity MUST be ≤ 3. Cinematographic terms (4K, bokeh, golden hour, drone, slow-motion, depth-of-field) describe HOW to film — they are technique vocabulary. They do NOT satisfy Specificity, which requires knowing WHAT to film. Technical detail without a subject is a critical gap.
- Clarity MUST be ≤ 4. A prompt with no subject cannot be unambiguous — the model must guess the entire subject.
- First item in improvements MUST be: "Identify the subject: who or what is being filmed? Without a subject, an AI model generates random content regardless of cinematic technique."

**If Subject is "partial" due to a placeholder** (words like "something", "someone", "a subject", "an object", "a thing", "an element", "whatever is there"):
- Specificity MUST be ≤ 5.
- First item in improvements MUST replace the placeholder with a concrete subject.

## MODEL FIT — rate 1–10 for each model

Base your score on what THIS specific prompt contains or lacks — not general model reputation.
- Runway Gen-3: excels when prompt includes clear physical motion and cinematic realism cues. Score high if action + lighting + camera are all present. Score low if any are absent.
- Sora: excels when prompt requires complex scene coherence, environment detail, or longer narrative. Score high if subject + style + mood are richly specified. Score low for simple/short prompts.
- Kling: excels when prompt features human subjects with detailed action. Score high if Subject involves a person + Action is explicit. Score low for non-human or static subjects.
- Pika: excels for short, stylized, or animated content. Score high if Style implies animation/stylization or if the prompt is intentionally brief. Score lower for long narrative prompts.

Reason must reference a specific element from the prompt, not just describe the model's general capability.

## NEGATIVE PROMPTS — list exactly 5 terms

These must be failure modes THIS specific prompt is likely to trigger — based on what is absent or vague in the prompt. Generic terms like "blurry, low quality, watermark" are forbidden unless the prompt has a specific reason to trigger them.

Examples of specific reasoning:
- If Subject is absent → include "random background character, unintended subject"
- If Camera is absent → include "dutch angle, unwanted camera shake"
- If Style is absent → include "stock footage aesthetic, generic color grading"
- If the prompt involves a person → include "deformed hands, face distortion"
- If the prompt involves motion → include "motion blur artifacts, stuttering movement"

## EDGE CASES — list 2–4 realistic failure scenarios

Each must be a specific failure mode, not a generic warning. Reference what in the prompt causes it.

Respond ONLY with valid JSON:
{
  "dimensions": [
    { "name": "Clarity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Specificity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Technical Feasibility", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Cinematic Quality", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Creativity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" }
  ],
  "improvements": ["<actionable string — tell the user exactly what to add or change>", "<string>", "<string>"],
  "edgeCases": ["<specific failure scenario>", "<specific failure scenario>"],
  "anatomy": [
    { "component": "Subject", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Action", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Style", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Lighting", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Camera", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Mood", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Duration", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" }
  ],
  "modelFit": [
    { "model": "Runway Gen-3", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Sora", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Kling", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Pika", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" }
  ],
  "negativePrompts": ["<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>"]
}"""

# Key cases from the Subject Omission Attack experiment
# Before scores from tests/subject-omission-results.json
VALIDATION_CASES = [
    {
        "id": "N-V++",
        "group": "No Subject",
        "prompt": "A cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "before_overall": 8.2,
        "before_spe": 8,
        "before_cla": 9,
        "gate_rule": "Rule 1 — absent subject → Spe ≤ 3, Cla ≤ 4",
        "expected": "Spe ≤ 3 and overall drops significantly",
    },
    {
        "id": "F-V++",
        "group": "Fake Subject",
        "prompt": "Something moving on a rooftop, cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "before_overall": 8.0,
        "before_spe": 9,
        "before_cla": 8,
        "gate_rule": "Rule 2 — placeholder subject → Spe ≤ 5",
        "expected": "Spe ≤ 5 and overall drops from 8.0",
    },
    {
        "id": "F-V+",
        "group": "Fake Subject",
        "prompt": "A subject on a rooftop, filmed at sunset with warm lighting.",
        "before_overall": 7.0,
        "before_spe": 6,
        "before_cla": 8,
        "gate_rule": "Rule 2 — 'a subject' is a placeholder → Spe ≤ 5",
        "expected": "Subject flagged as placeholder, Spe ≤ 5",
    },
    {
        "id": "S-V++",
        "group": "Real Subject (control)",
        "prompt": "A black cat on a rooftop, cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "before_overall": 8.0,
        "before_spe": 8,
        "before_cla": 9,
        "gate_rule": "Control — real subject, gate should NOT trigger",
        "expected": "Score should remain ~8.0, gate not triggered",
    },
    {
        "id": "S-V0",
        "group": "Real Subject, minimal vocab (control)",
        "prompt": "A cat sits on a rooftop.",
        "before_overall": 5.2,
        "before_spe": 2,
        "before_cla": 8,
        "gate_rule": "Control — real subject, gate should NOT trigger",
        "expected": "Score stays similar to before, no gate penalty",
    },
    {
        "id": "N-V+",
        "group": "No Subject, moderate vocab",
        "prompt": "A rooftop scene at sunset, close-up with warm lighting.",
        "before_overall": 6.8,
        "before_spe": 6,
        "before_cla": 8,
        "gate_rule": "Rule 1 variant — 'A rooftop scene' may be subject-absent",
        "expected": "Depends on whether 'rooftop scene' counts as subject",
    },
]


def evaluate(prompt: str, client: Groq) -> dict:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'Evaluate this video generation prompt:\n\n"{prompt}"'},
        ],
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    text = completion.choices[0].message.content or "{}"
    parsed = json.loads(text)

    dims = parsed.get("dimensions", [])
    scores = [d["score"] for d in dims]
    overall = round(sum(scores) / len(scores), 1) if scores else 0

    # Extract subject anatomy classification
    anatomy = parsed.get("anatomy", [])
    subject_entry = next((a for a in anatomy if a.get("component") == "Subject"), None)
    subject_status = subject_entry.get("status", "unknown") if subject_entry else "unknown"
    subject_note = subject_entry.get("note") if subject_entry else None

    return {
        "overall": overall,
        "dimensions": {d["name"]: d["score"] for d in dims},
        "feedback": {d["name"]: d["feedback"] for d in dims},
        "subject_status": subject_status,
        "subject_note": subject_note,
        "improvements": parsed.get("improvements", []),
    }


def run_validation(output_path: str | None = None):
    client = Groq(api_key=GROQ_API_KEY)
    results = []

    print(f"\n{'='*70}")
    print("  Subject Detection Gate — Validation Run")
    print("  Model: Groq / llama-3.3-70b-versatile (production system prompt)")
    print(f"{'='*70}\n")

    for case in VALIDATION_CASES:
        print(f"[{case['id']}] {case['group']}")
        print(f"  Prompt    : {case['prompt'][:80]}")
        print(f"  Gate Rule : {case['gate_rule']}")
        print(f"  Expected  : {case['expected']}")
        print(f"  Before    : Overall={case['before_overall']} Spe={case['before_spe']} Cla={case['before_cla']}")

        try:
            result = evaluate(case["prompt"], client)
            overall = result["overall"]
            spe = result["dimensions"].get("Specificity", "?")
            cla = result["dimensions"].get("Clarity", "?")
            tf = result["dimensions"].get("Technical Feasibility", "?")
            cin = result["dimensions"].get("Cinematic Quality", "?")
            cre = result["dimensions"].get("Creativity", "?")

            delta = round(overall - case["before_overall"], 1)
            delta_str = f"Δ={delta:+.1f}"

            # Gate enforcement check
            gate_triggered = result["subject_status"] in ("absent", "partial")
            gate_respected = True
            if result["subject_status"] == "absent" and (spe > 3 or cla > 4):
                gate_respected = False
            if result["subject_status"] == "partial" and spe > 5:
                gate_respected = False

            verdict = "✅ GATE RESPECTED" if gate_respected else "❌ GATE VIOLATED"
            if not gate_triggered:
                verdict = "⚪ GATE NOT TRIGGERED (real subject)"

            print(f"  After     : Overall={overall} ({delta_str}) Spe={spe} Cla={cla} TF={tf} Cin={cin} Cre={cre}")
            print(f"  Subject   : {result['subject_status']} | {result['subject_note']}")
            print(f"  Verdict   : {verdict}")
            if result["improvements"]:
                print(f"  Fix[0]    : {result['improvements'][0][:100]}")

        except Exception as e:
            result = {"error": str(e), "overall": None, "dimensions": {}, "subject_status": "error"}
            print(f"  ERROR     : {e}")
            verdict = "❌ ERROR"

        results.append({**case, "result": result, "verdict": verdict})
        print()
        time.sleep(0.8)

    # Before/After summary table
    print(f"\n{'='*70}")
    print("  BEFORE vs AFTER — Subject Detection Gate")
    print(f"{'='*70}")
    print(f"  {'ID':<8} {'Group':<30} {'Before':>8} {'After':>8} {'Delta':>8}  {'Spe Before':>10} {'Spe After':>9}  Verdict")
    print(f"  {'-'*8} {'-'*30} {'-'*8} {'-'*8} {'-'*8}  {'-'*10} {'-'*9}  -------")

    for r in results:
        res = r["result"]
        after = res.get("overall", "ERR")
        spe_after = res.get("dimensions", {}).get("Specificity", "?")
        try:
            delta = round(float(after) - r["before_overall"], 1)
            delta_str = f"{delta:+.1f}"
        except (TypeError, ValueError):
            delta_str = "?"
        group_short = r["group"][:29]
        print(f"  {r['id']:<8} {group_short:<30} {r['before_overall']:>8} {str(after):>8} {delta_str:>8}  {r['before_spe']:>10} {str(spe_after):>9}  {r.get('verdict','?')}")

    print(f"\n{'='*70}\n")

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Results saved to {output_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="tests/subject-gate-validation.json")
    args = parser.parse_args()

    run_validation(output_path=args.output)
