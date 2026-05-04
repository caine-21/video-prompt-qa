export interface EdgeCaseFixture {
  id: string;
  category: string;
  input: string;
  description: string;
  expectedBehavior: string;
}

export const edgeCases: EdgeCaseFixture[] = [
  // ── Category 1: Input Structure Anomalies ──────────────────────────────────
  {
    id: "struct-01",
    category: "input-structure",
    input: "",
    description: "Empty prompt",
    expectedBehavior: "Low scores across all dimensions; improvements list non-empty",
  },
  {
    id: "struct-02",
    category: "input-structure",
    input: "a",
    description: "Single character",
    expectedBehavior: "Very low Specificity and Cinematic Quality scores",
  },
  {
    id: "struct-03",
    category: "input-structure",
    input: "A " + "very long description ".repeat(60) + "ending here.",
    description: "Extremely long prompt (~1300 chars)",
    expectedBehavior: "Model should still return valid JSON without truncation errors",
  },
  {
    id: "struct-04",
    category: "input-structure",
    input: "!@#$%^&*()_+[]{}|;':\",./<>?",
    description: "Only special characters",
    expectedBehavior: "Low clarity; no crash; edgeCases field flags unparseable input",
  },
  {
    id: "struct-05",
    category: "input-structure",
    input: "一只猫慢慢走过 une rue parisienne while saying こんにちは",
    description: "Mixed multilingual input",
    expectedBehavior:
      "Model handles non-English gracefully; does not refuse or return empty JSON",
  },
  {
    id: "struct-06",
    category: "input-structure",
    input: "   \n\n\t   ",
    description: "Whitespace only",
    expectedBehavior: "Treated same as empty prompt; no 500 error",
  },

  // ── Category 2: Semantic Ambiguity ────────────────────────────────────────
  {
    id: "ambig-01",
    category: "semantic-ambiguity",
    input: "make it better",
    description: "No subject, no context",
    expectedBehavior: "Low Clarity score; improvements suggest adding subject and action",
  },
  {
    id: "ambig-02",
    category: "semantic-ambiguity",
    input: "something cool",
    description: "Maximally vague",
    expectedBehavior: "Low Specificity; high Creativity variance across providers",
  },
  {
    id: "ambig-03",
    category: "semantic-ambiguity",
    input: "a video",
    description: "Category label with no content",
    expectedBehavior: "Scores bottomed out on Specificity and Cinematic Quality",
  },
  {
    id: "ambig-04",
    category: "semantic-ambiguity",
    input: "cinematic, 4K, dramatic lighting, epic",
    description: "Style tags only, no subject or action",
    expectedBehavior: "High Cinematic Quality but low Clarity and Specificity",
  },

  // ── Category 3: Conflicting Instructions ──────────────────────────────────
  {
    id: "conflict-01",
    category: "conflicting-instructions",
    input: "make a realistic cartoon",
    description: "Style contradiction: realistic vs cartoon",
    expectedBehavior:
      "edgeCases field identifies contradiction; Technical Feasibility penalized",
  },
  {
    id: "conflict-02",
    category: "conflicting-instructions",
    input: "high quality but low detail render of a scene",
    description: "Quality contradiction",
    expectedBehavior: "Clarity score low; improvements flag the conflict explicitly",
  },
  {
    id: "conflict-03",
    category: "conflicting-instructions",
    input: "a slow-motion fast chase sequence",
    description: "Motion speed contradiction",
    expectedBehavior: "Technical Feasibility penalized; edgeCases mentions ambiguity",
  },
  {
    id: "conflict-04",
    category: "conflicting-instructions",
    input: "bright dark moody sunny underwater cave scene",
    description: "Multiple lighting contradictions",
    expectedBehavior: "Low Clarity; model attempts interpretation rather than refusing",
  },

  // ── Category 4: Hallucination / Impossible Requests ───────────────────────
  {
    id: "halluc-01",
    category: "hallucination-risk",
    input: "generate a video of a real-time live broadcast happening right now",
    description: "Requests real-time/live content impossible for generative models",
    expectedBehavior: "Technical Feasibility score very low; edgeCases flags impossibility",
  },
  {
    id: "halluc-02",
    category: "hallucination-risk",
    input: "show 1000 people each with a completely unique recognizable face",
    description: "Computationally unreasonable request",
    expectedBehavior: "Technical Feasibility penalized; improvements suggest simplification",
  },
  {
    id: "halluc-03",
    category: "hallucination-risk",
    input: "a video using the XQ-9 render engine with neuralink haptic sync output",
    description: "Nonexistent technology references",
    expectedBehavior:
      "Model should not hallucinate confirmation; Technical Feasibility low",
  },
  {
    id: "halluc-04",
    category: "hallucination-risk",
    input: "recreate the deleted scene from [CLASSIFIED] film reel #4471-B",
    description: "References nonexistent source material",
    expectedBehavior: "Clarity very low; model flags unverifiable reference in edgeCases",
  },
];

export const edgeCasesByCategory = edgeCases.reduce<
  Record<string, EdgeCaseFixture[]>
>((acc, fixture) => {
  (acc[fixture.category] ??= []).push(fixture);
  return acc;
}, {});

export const CATEGORY_COUNT = Object.keys(edgeCasesByCategory).length;
export const TOTAL_CASE_COUNT = edgeCases.length;
