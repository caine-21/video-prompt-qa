"""
Adversarial evaluation script for video-prompt-qa.

Tests the 5-dimension evaluation system against prompts designed to expose
failure modes: boundary inputs, score gaming, contradictions, technical
impossibility, and consistency variance.

Usage:
  python run_adversarial.py
  python run_adversarial.py --output results.json

Reads GROQ_API_KEY from .env in this directory, or falls back to ../rag-demo/.env
"""

import sys, os, json, time, argparse, statistics
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv

# Load .env — try local first, fall back to rag-demo
if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("../rag-demo/.env"):
    load_dotenv("../rag-demo/.env")

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found. Add it to .env in this directory.")

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

# ── Test cases ─────────────────────────────────────────────────────────────────

TEST_CASES = [
    # Category 1: Boundary inputs
    {
        "id": "B1", "category": "Boundary Input",
        "prompt": "",
        "expectation": "Should score very low or handle empty input gracefully",
    },
    {
        "id": "B2", "category": "Boundary Input",
        "prompt": "cat",
        "expectation": "Single word — low clarity and specificity",
    },
    {
        "id": "B3", "category": "Boundary Input",
        "prompt": "xkq7 bla3 zzz !!!",
        "expectation": "Gibberish — low across all dimensions",
    },

    # Category 2: Score gaming (buzzword padding)
    {
        "id": "G1", "category": "Score Gaming",
        "prompt": "A cinematic 4K aerial drone shot with bokeh depth of field, golden hour lighting, slow motion, dynamic camera movement",
        "expectation": "Sounds technical but has no subject — specificity should be penalized",
    },
    {
        "id": "G2", "category": "Score Gaming",
        "prompt": "Epic cinematic masterpiece with stunning visuals and breathtaking composition",
        "expectation": "Pure adjectives, zero content — specificity score should be very low",
    },
    {
        "id": "G3", "category": "Score Gaming",
        "prompt": "A beautiful, amazing, incredible, stunning, gorgeous, spectacular landscape with perfect lighting",
        "expectation": "Adjective stacking — model may be fooled into high creativity score",
    },

    # Category 3: Deliberate contradictions
    {
        "id": "C1", "category": "Contradiction",
        "prompt": "A fast slow-motion shot of a perfectly still moving object in complete darkness with bright light",
        "expectation": "Multiple contradictions — Technical Feasibility and Clarity should drop",
    },
    {
        "id": "C2", "category": "Contradiction",
        "prompt": "A dark cheerful intimate epic scene with a crowd of exactly one person, silent but audio-driven",
        "expectation": "Oxymorons stacked — model should flag conflicts",
    },
    {
        "id": "C3", "category": "Contradiction",
        "prompt": "A minimalist maximalist shot with no color but vibrant palette, close-up wide-angle",
        "expectation": "Contradictions on every axis — expect low clarity and technical feasibility",
    },

    # Category 4: Technical impossibility
    {
        "id": "T1", "category": "Technical Impossibility",
        "prompt": "Film inside a black hole at 8K 120fps with a camera that captures gravity waves",
        "expectation": "Physically impossible — Technical Feasibility should score 1-2",
    },
    {
        "id": "T2", "category": "Technical Impossibility",
        "prompt": "A 6-hour continuous uncut AI video of a hummingbird wing at 100,000fps showing each feather molecule",
        "expectation": "Duration + resolution impossible for current AI video — Technical Feasibility should be very low",
    },
    {
        "id": "T3", "category": "Technical Impossibility",
        "prompt": "Generate a real-time interactive 3D holographic video that physically responds to touch",
        "expectation": "Not a video generation task — Technical Feasibility should be 1",
    },

    # Category 5: Consistency (same prompt × 3 runs)
    {
        "id": "K1", "category": "Consistency Run 1",
        "prompt": "A woman walking alone in heavy rain at night, cinematic, 35mm film grain, shallow depth of field",
        "expectation": "Baseline run — record scores for variance analysis",
    },
    {
        "id": "K2", "category": "Consistency Run 2",
        "prompt": "A woman walking alone in heavy rain at night, cinematic, 35mm film grain, shallow depth of field",
        "expectation": "Same as K1 — scores should be stable",
    },
    {
        "id": "K3", "category": "Consistency Run 3",
        "prompt": "A woman walking alone in heavy rain at night, cinematic, 35mm film grain, shallow depth of field",
        "expectation": "Same as K1 — measure score variance across 3 runs",
    },
]

# ── Runner ─────────────────────────────────────────────────────────────────────

def evaluate(prompt: str, client: Groq) -> dict:
    # Empty prompt guard — send a placeholder so the API doesn't reject it
    user_content = f'Evaluate this video generation prompt:\n\n"{prompt}"' if prompt.strip() \
        else 'Evaluate this video generation prompt:\n\n"[EMPTY PROMPT]"'

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    text = completion.choices[0].message.content or "{}"
    parsed = json.loads(text)

    scores = [d["score"] for d in parsed.get("dimensions", [])]
    overall = round(sum(scores) / len(scores), 1) if scores else 0

    return {
        "overall": overall,
        "dimensions": {d["name"]: d["score"] for d in parsed.get("dimensions", [])},
        "feedback": {d["name"]: d["feedback"] for d in parsed.get("dimensions", [])},
        "improvements": parsed.get("improvements", []),
        "edgeCases": parsed.get("edgeCases", []),
    }


def run_all(output_path: str | None = None):
    client = Groq(api_key=GROQ_API_KEY)
    results = []

    print(f"\n{'='*65}")
    print("  Adversarial Evaluation — video-prompt-qa  (Groq / llama-3.3-70b)")
    print(f"{'='*65}\n")

    for case in TEST_CASES:
        print(f"[{case['id']}] {case['category']}")
        print(f"  Prompt   : {case['prompt'][:80] or '[EMPTY]'}")
        print(f"  Expect   : {case['expectation']}")

        try:
            result = evaluate(case["prompt"], client)
            print(f"  Overall  : {result['overall']}/10")
            dim_str = "  ".join(f"{k[:3]}={v}" for k, v in result["dimensions"].items())
            print(f"  Dims     : {dim_str}")
        except Exception as e:
            result = {"error": str(e), "overall": None, "dimensions": {}}
            print(f"  ERROR    : {e}")

        results.append({**case, "result": result})
        print()
        time.sleep(0.5)  # avoid rate limit

    # Consistency analysis
    consistency_cases = [r for r in results if r["category"].startswith("Consistency")]
    if len(consistency_cases) == 3:
        scores = [r["result"]["overall"] for r in consistency_cases if r["result"].get("overall") is not None]
        if len(scores) == 3:
            variance = round(statistics.variance(scores), 3)
            stddev = round(statistics.stdev(scores), 3)
            print(f"{'='*65}")
            print(f"  Consistency analysis (K1/K2/K3): scores={scores}")
            print(f"  Variance={variance}  StdDev={stddev}")
            if stddev < 0.5:
                print("  Result: STABLE — scores consistent across runs")
            elif stddev < 1.5:
                print("  Result: MODERATE VARIANCE — minor inconsistency")
            else:
                print("  Result: HIGH VARIANCE — evaluation is non-deterministic")
            print(f"{'='*65}\n")

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Results saved to {output_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="tests/adversarial-results.json")
    args = parser.parse_args()

    os.makedirs("tests", exist_ok=True)
    run_all(output_path=args.output)
