"""
Subject Omission Attack Experiment — video-prompt-qa
====================================================

Research question: Does vocabulary density (cinematography buzzwords) inflate
evaluation scores even when the subject is absent or fake?

Groups:
  S = Real Subject (explicit entity)
  N = No Subject (structural subject omission)
  F = Fake Subject (syntactic placeholder, no semantic referent)

Vocab levels:
  V0  = plain description only
  V+  = moderate cinematic vocab
  V++ = maximum vocabulary density (G1 territory)

Runs each prompt once through Groq / llama-3.3-70b-versatile.
Records ALL 5 dimension scores + overall + raw feedback text for each dimension.

Usage:
  python run_subject_omission_experiment.py
  python run_subject_omission_experiment.py --output tests/subject-omission-results.json
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
    raise ValueError("GROQ_API_KEY not found. Add it to .env in this directory.")

# Same system prompt as production evaluator (lib/providers/base.ts EVALUATION_SYSTEM_PROMPT)
SYSTEM_PROMPT = """You are an expert AI video generation quality engineer.
Evaluate video generation prompts across these dimensions:
1. Clarity (1-10): Is the prompt clear and unambiguous?
2. Specificity (1-10): Does it include enough detail (subject, style, motion, lighting, mood)?
3. Technical Feasibility (1-10): Can current AI video models realistically generate this?
4. Cinematic Quality (1-10): Does it use effective cinematic language?
5. Creativity (1-10): Is it original and visually interesting?

Respond ONLY with valid JSON matching this exact structure:
{
  "dimensions": [
    { "name": "Clarity", "score": <number>, "feedback": "<string>" },
    { "name": "Specificity", "score": <number>, "feedback": "<string>" },
    { "name": "Technical Feasibility", "score": <number>, "feedback": "<string>" },
    { "name": "Cinematic Quality", "score": <number>, "feedback": "<string>" },
    { "name": "Creativity", "score": <number>, "feedback": "<string>" }
  ],
  "improvements": ["<string>", "<string>", "<string>"],
  "edgeCases": ["<string>"]
}"""

# ── Experiment matrix ───────────────────────────────────────────────────────────
#
# 3×3 design: Group (S/N/F) × Vocab Level (V0/V+/V++)
# Plus G1+S as a control: "what G1 would look like if you add a real subject"
#
# Key comparison:
#   N-V++ (G1) vs S-V++ → same vocabulary, different subject presence
#   N-V++ (G1) vs F-V++ → no subject vs fake subject (syntactic placeholder)
#   S-V0 vs S-V++ → subject constant, vocabulary increases

EXPERIMENT_CASES = [
    # ── Group S: Real Subject ───────────────────────────────────────────────────
    {
        "id": "S-V0",
        "group": "Real Subject",
        "vocab_level": "V0 (minimal)",
        "prompt": "A cat sits on a rooftop.",
        "hypothesis": "Low vocab, clear subject → moderate Specificity, moderate overall",
    },
    {
        "id": "S-V+",
        "group": "Real Subject",
        "vocab_level": "V+ (moderate)",
        "prompt": "A cat on a rooftop at sunset, filmed in close-up with warm lighting.",
        "hypothesis": "Moderate vocab + clear subject → higher Specificity and Cinematic",
    },
    {
        "id": "S-V++",
        "group": "Real Subject",
        "vocab_level": "V++ (high density)",
        "prompt": "A black cat on a rooftop, cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "hypothesis": "High vocab + clear subject → should score high legitimately",
    },

    # ── Group N: No Subject ─────────────────────────────────────────────────────
    {
        "id": "N-V0",
        "group": "No Subject",
        "vocab_level": "V0 (minimal)",
        "prompt": "A scene at sunset.",
        "hypothesis": "Low vocab, no subject → low Clarity and Specificity",
    },
    {
        "id": "N-V+",
        "group": "No Subject",
        "vocab_level": "V+ (moderate)",
        "prompt": "A rooftop scene at sunset, close-up with warm lighting.",
        "hypothesis": "Moderate vocab, no subject → still missing what to film",
    },
    {
        "id": "N-V++",
        "group": "No Subject",
        "vocab_level": "V++ (high density) — G1 baseline",
        "prompt": "A cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "hypothesis": "G1 case: high vocab, zero subject → evaluator inflates score (baseline = 8.4/10)",
    },

    # ── Group F: Fake Subject ───────────────────────────────────────────────────
    {
        "id": "F-V+",
        "group": "Fake Subject",
        "vocab_level": "V+ (moderate)",
        "prompt": "A subject on a rooftop, filmed at sunset with warm lighting.",
        "hypothesis": "'A subject' is syntactically valid but semantically empty — should evaluator penalize?",
    },
    {
        "id": "F-V++",
        "group": "Fake Subject",
        "vocab_level": "V++ (high density)",
        "prompt": "Something moving on a rooftop, cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "hypothesis": "'Something moving' = fake subject + max vocab — does it game the evaluator like G1?",
    },

    # ── Control: G1 fixed with real subject ────────────────────────────────────
    {
        "id": "G1+S",
        "group": "G1 Repaired",
        "vocab_level": "V++ (high density) + real subject",
        "prompt": "A black cat on a rooftop, cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field.",
        "hypothesis": "Same as S-V++ — adds real subject to G1 vocabulary. Controls for vocabulary density.",
    },
]

# ── Runner ──────────────────────────────────────────────────────────────────────

def evaluate(prompt: str, client: Groq) -> dict:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'Evaluate this video generation prompt:\n\n"{prompt}"'},
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    text = completion.choices[0].message.content or "{}"
    parsed = json.loads(text)

    dims = parsed.get("dimensions", [])
    scores = [d["score"] for d in dims]
    overall = round(sum(scores) / len(scores), 1) if scores else 0

    return {
        "overall": overall,
        "dimensions": {d["name"]: d["score"] for d in dims},
        "feedback": {d["name"]: d["feedback"] for d in dims},
        "improvements": parsed.get("improvements", []),
        "edgeCases": parsed.get("edgeCases", []),
    }


def run_experiment(output_path: str | None = None):
    client = Groq(api_key=GROQ_API_KEY)
    results = []

    print(f"\n{'='*70}")
    print("  Subject Omission Attack Experiment — video-prompt-qa")
    print("  Model: Groq / llama-3.3-70b-versatile")
    print(f"{'='*70}\n")
    print("  Research question: Does vocabulary density inflate scores")
    print("  even when the subject is absent or fake?\n")
    print(f"{'='*70}\n")

    dim_names = ["Clarity", "Specificity", "Technical Feasibility", "Cinematic Quality", "Creativity"]
    short_names = ["Cla", "Spe", "TF", "Cin", "Cre"]

    for case in EXPERIMENT_CASES:
        group_tag = f"[{case['id']}]"
        print(f"{group_tag} {case['group']} / {case['vocab_level']}")
        print(f"  Prompt     : {case['prompt']}")
        print(f"  Hypothesis : {case['hypothesis']}")

        try:
            result = evaluate(case["prompt"], client)
            overall = result["overall"]
            dims = result["dimensions"]
            feedback = result["feedback"]

            dim_scores = "  ".join(f"{s}={dims.get(n, '?')}" for s, n in zip(short_names, dim_names))
            print(f"  Overall    : {overall}/10")
            print(f"  Scores     : {dim_scores}")

            # Print raw feedback for key dimensions
            for n in ["Clarity", "Specificity"]:
                fb = feedback.get(n, "")
                if fb:
                    print(f"  [{n}] {fb[:120]}")

        except Exception as e:
            result = {"error": str(e), "overall": None, "dimensions": {}, "feedback": {}}
            print(f"  ERROR      : {e}")

        results.append({**case, "result": result})
        print()
        time.sleep(0.6)

    # ── Summary table ───────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print("  SUMMARY — Overall scores by group × vocab level")
    print(f"{'='*70}")
    print(f"  {'ID':<10} {'Group':<16} {'Vocab':<26} {'Overall':>8}  {'Spe':>5}  {'Cla':>5}")
    print(f"  {'-'*10} {'-'*16} {'-'*26} {'-'*8}  {'-'*5}  {'-'*5}")

    for r in results:
        res = r["result"]
        overall = res.get("overall", "ERR")
        spe = res.get("dimensions", {}).get("Specificity", "?")
        cla = res.get("dimensions", {}).get("Clarity", "?")
        group_short = r["group"][:15]
        vocab_short = r["vocab_level"][:25]
        marker = "  ◄ ALERT" if isinstance(overall, float) and overall >= 7.5 and r["group"] in ("No Subject", "Fake Subject") else ""
        print(f"  {r['id']:<10} {group_short:<16} {vocab_short:<26} {str(overall):>8}  {str(spe):>5}  {str(cla):>5}{marker}")

    # ── Key comparison ──────────────────────────────────────────────────────────
    id_map = {r["id"]: r["result"] for r in results}

    print(f"\n{'='*70}")
    print("  KEY COMPARISONS")
    print(f"{'='*70}")

    comparisons = [
        ("N-V++", "S-V++",
         "G1 vs G1+real-subject: same vocabulary, subject added"),
        ("N-V++", "F-V++",
         "No subject vs fake subject: does 'Something moving' game the evaluator?"),
        ("S-V0",  "S-V++",
         "Real subject: effect of vocabulary density alone"),
        ("N-V0",  "N-V++",
         "No subject: effect of vocabulary density alone (the gaming effect)"),
    ]

    for a_id, b_id, label in comparisons:
        a = id_map.get(a_id, {})
        b = id_map.get(b_id, {})
        a_score = a.get("overall", "?")
        b_score = b.get("overall", "?")
        try:
            delta = round(float(b_score) - float(a_score), 1)
            delta_str = f"+{delta}" if delta > 0 else str(delta)
        except (TypeError, ValueError):
            delta_str = "?"
        print(f"  {a_id} ({a_score}) → {b_id} ({b_score})  Δ={delta_str}")
        print(f"    {label}")

    print(f"\n{'='*70}\n")

    if output_path:
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Results saved to {output_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="tests/subject-omission-results.json")
    args = parser.parse_args()

    run_experiment(output_path=args.output)
