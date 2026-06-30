# Pain Evidence Log

## 1. Research Goal

This document defines how to collect evidence for the product hypothesis:

AI video creators waste credits and time because prompts fail unpredictably before generation, and they lack a reusable preflight/review workflow.

The research goal is to test whether a 30-second preflight step can reduce wasted AI video generations before users spend credits. This document does not claim the product is validated. It only defines the evidence collection structure.

## 2. Target User For Evidence Collection

Initial evidence collection should focus on a narrow user group:

- Solo creators or small teams.
- They generate ecommerce, advertising, product, or social video assets at least weekly.
- They already pay for, or regularly consume credits on, tools such as Kling, Runway, Pika, Jimeng, Sora, or similar AI video platforms.

Avoid treating casual AI video experimentation as primary evidence unless the user has a clear cost signal such as repeated paid generations, delivery pressure, or client revision work.

## 3. Evidence Sources

Collect evidence from:

- Reddit.
- Discord communities.
- Bilibili.
- Xiaohongshu.
- YouTube comments.
- Public tutorials and comment sections.
- Direct creator interviews.
- User-submitted failed prompts.

Tutorials are useful for workflow context, but they are not proof of pain unless they include user pain in comments, concrete examples, failed attempts, or workflow breakdowns.

## 4. Evidence Schema

Use this table when adding evidence items.

The current batch is an early source scan, not validation. Only rows marked `counts_as_direct_pain_evidence=yes` should be counted toward the direct creator pain evidence target.

Multiple observations from the same article, guide, tutorial, or thread should not be counted as independent evidence items.

Rows E-016 to E-025 are Trustpilot-heavy user pain/cost signals. They support the existence of wasted credits, retries, and unusable outputs, but they do not yet prove creator workflow behavior or preflight behavior change.

Rows E-026 to E-033 are creator interview/workflow behavior signals. They support the existence of manual preflight-like workflows, but they do not yet prove that target ecommerce/ad creators would use a 30-second preflight.

Rows E-026 to E-028 come from the same Creative Bloq interview, and rows E-029 to E-032 come from another single Creative Bloq interview. Treat them as useful workflow observations, not independent market validation.

| evidence_id | source | platform/tool | user type | pain summary | failure category | cost signal | workflow stage | quote or paraphrase | link | evidence type: real / reconstructed / synthetic | evidence_kind | counts_as_direct_pain_evidence | counts_as_workflow_behavior_evidence | independence_group | confidence: low / medium / high | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-001 | The Verge hands-on review | Sora | AI video reviewer / potential creator | Simple prompts worked better than complex prompts; complex prompts produced unnatural human movement and distortions. | Prompt too complex for one shot; character/face inconsistency; prompt not followed | High-quality tiers described as expensive; failed generations cost scarce priority videos/credits. | Before generation; during retry loop | Public hands-on review says Sora is not yet reliable for commercial or entertainment use and complex prompts create visible issues. | https://www.theverge.com/2024/12/12/24318924/openai-sora-ai-video-generator-hands-on | real | pain-adjacent | no | no | verge-sora-hands-on-2024-12 | high | Strong public failure signal, but not direct target-user pain. Current recovery is to simplify prompt or retry. Possible preflight: flag complex human motion and suggest simpler shot constraints before generation. |
| E-002 | The Verge launch/pricing report | Sora | Paid AI video users | Sora access is quota/plan limited, so each failed generation has opportunity cost. | Credits wasted | Plus plan includes limited priority videos; Pro plan is much more expensive. | Before generation | Sora Plus offered 50 priority videos at 720p/5s, while Pro raised limits at a much higher monthly price. | https://www.theverge.com/2024/12/9/24317092/openai-sora-text-to-video-ai-launch | real | cost context | no | no | verge-sora-launch-pricing-2024-12 | medium | Cost context only, not direct pain evidence. Supports why paid creators may care about avoiding invalid first attempts. |
| E-003 | Tom's Guide hands-on review | Kling 2.5 Turbo | AI video reviewer / creator testing image-to-video | A gym somersault prompt failed to render the flip correctly and did not preserve facial consistency. | Character/face inconsistency; action failure; prompt not followed | Retry/time cost implied; user must regenerate or simplify action. | During retry loop; after failed generation | Review notes the model made a leap forward but still struggled with a specific physical action and face consistency. | https://www.tomsguide.com/ai/i-tried-klings-new-2-5-turbo-ai-video-generator-its-a-giant-leap-forward-but-still-cant-do-this-one-thing | real | pain-adjacent | no | no | tomsguide-kling-2-5-review | high | Strong failure example, but from a review article rather than creator/community pain. Current recovery is likely retry, different reference, or simpler motion. |
| E-004 | Tom's Guide hands-on review | Kling 2.5 Turbo | Parent/creator testing personal reference image | A superhero transformation changed the child's appearance and size, creating identity drift. | Character/face inconsistency; prompt not followed | Personal/reference-image generation needs reruns if identity is wrong. | After failed generation | Image-to-video test produced impressive lighting but altered the child's look and scale. | https://www.tomsguide.com/ai/i-tried-klings-new-2-5-turbo-ai-video-generator-its-a-giant-leap-forward-but-still-cant-do-this-one-thing | real | pain-adjacent | no | no | tomsguide-kling-2-5-review | high | Same article as E-003/E-005; do not count independently. Possible preflight: warn when a prompt asks for transformation while preserving a real person's identity. |
| E-005 | Tom's Guide hands-on review | Kling 2.5 Turbo | Creator testing audio/video generation | A generated superhero clip had unnatural/eerie audio, reducing usability despite visual success. | Prompt not followed; creative control loss | More iterations or post-editing needed to make output usable. | After failed generation | Review highlights that audio can make an otherwise interesting clip unusable or off-tone. | https://www.tomsguide.com/ai/i-tried-klings-new-2-5-turbo-ai-video-generator-its-a-giant-leap-forward-but-still-cant-do-this-one-thing | real | pain-adjacent | no | no | tomsguide-kling-2-5-review | medium | Same article as E-003/E-004; audio is not current v0 scope. Useful as creative-control context, not direct pain evidence. |
| E-006 | Tom's Guide tutorial/workflow breakdown | Kling AI 2.0 | AI video creators using Kling | Complex prompts can be hit-or-miss; tutorial advises focusing on one thing and using a clear subject/reference. | Prompt too complex for one shot; lack of shot decomposition | Free tier is limited; paid tiers increase credits/control. | While writing prompt; before generation | Tutorial says output quality depends on prompt complexity and recommends not cramming too much into one generation. | https://www.tomsguide.com/ai/how-to-use-kling-ai-2 | real | workflow context | no | no | tomsguide-kling-2-guide | medium | Tutorial/workflow context, not user pain. Possible preflight: detect overloaded prompts and force one main subject/action. |
| E-007 | Tom's Guide tutorial/workflow breakdown | Kling AI 2.0 | AI video creators using Kling | Kling exposes negative prompts and multi-element editing, implying users need ways to remove unwanted elements or repair generations. | Prompt not followed; product deformation; camera/control failure | Paid tiers unlock more controls; repairs consume workflow time. | While writing prompt; after failed generation | Tutorial explains negative prompts and element swap/remove workflows for correcting or steering output. | https://www.tomsguide.com/ai/how-to-use-kling-ai-2 | real | alternative context | no | no | tomsguide-kling-2-guide | medium | Platform/alternative context, not direct pain evidence. Challenges the product because platforms already provide corrective controls. |
| E-008 | Tom's Guide comparative review | Multiple AI video generators including Pika, Runway, Kling, Sora, Luma | Creators choosing tools | Different tools are positioned for different strengths: character consistency, realism, prompt adherence, storyboarding, collaboration, or controls. | Model choice confusion | Wrong model choice can waste credits/time before user discovers mismatch. | Before generation | Comparative guide differentiates platforms by strengths rather than treating all generators as interchangeable. | https://www.tomsguide.com/features/5-best-ai-video-generators-tested-and-compared | real | workflow context | no | no | tomsguide-ai-video-comparison | medium | Model-choice context, not direct pain evidence. Needs direct creator evidence showing wrong model choice caused wasted retries. |
| E-009 | The Verge / public reporting on Runway Gen-4 | Runway Gen-4 | AI video creators needing consistent people/scenes | Runway marketed Gen-4 around consistent scenes and people, indicating consistency is a core unsolved user need. | Character/face inconsistency; no reusable failure review | Regenerating for consistency costs time/credits. | Before generation; during retry loop | Public coverage frames consistency of scenes and people as a key improvement target. | https://www.theverge.com/news/640821/runway-gen-4-artificial-intelligence-video-generator-filmmaking | real | vendor signal | no | no | verge-runway-gen4-2025-04 | medium | Vendor/market signal, not direct pain evidence. Possible preflight: require reference image/identity lock when prompt depends on character continuity. |
| E-010 | Dream Machine public capability summary | Luma Dream Machine | AI video creators using limited generations | Dream Machine has free/paid generation limits and known difficulty with text and motion. | Credits wasted; prompt not followed; action failure | Limited daily/free generations and paid subscription tiers. | Before generation; during retry loop | Public summary notes generation caps and difficulty depicting text and motion. | https://en.wikipedia.org/wiki/Dream_Machine_%28text-to-video_model%29 | real | cost context | no | no | wikipedia-dream-machine | low | Too weak to count. Secondary summary only; replace with official pricing/docs or direct creator complaint before using as evidence. |
| E-011 | NY Post report of public Sora failure example | Sora | Public AI video observers / creators testing human motion | Gymnastics output showed unrealistic/impossible human movement, highlighting physics/body-motion limitations. | Broken hands, bodies, or physical actions; prompt not followed | Retrying complex movement is likely required to get usable output. | After failed generation | Public report describes a generated gymnast clip as revealing flaws in realistic human movement and physics. | https://nypost.com/2024/12/13/tech/disturbing-video-reveals-shocking-flaw-in-open-ai-video-generator/ | real | pain-adjacent | no | no | nypost-sora-gymnastics-2024-12 | medium | News article, not direct target creator evidence. Possible preflight: flag gymnastics/acrobatic/full-body motion as high risk. |
| E-012 | WIRED investigation | Sora | Creators needing inclusive/controlled representation | Sora outputs reflected bias and often failed to represent requested demographics or roles neutrally. | Prompt not followed; creative control loss | Iterations needed to correct representation; client/brand risk if output is biased. | After failed generation; during client revision | Investigation found stereotyped outputs across jobs, body types, race, gender, and disability. | https://www.wired.com/story/openai-sora-video-generator-bias | real | pain-adjacent | no | no | wired-sora-bias-2024 | high | Strong creative-control/client-risk context, but not a direct credits or target-creator complaint. Possible preflight: flag demographic/representation-sensitive prompts for extra review. |
| E-013 | Academic benchmark / research paper | Sora | Researchers evaluating generated video artifacts | Sora-generated videos showed boundary defects, texture/noise issues, movement/joint anomalies, and object mismatches/disappearances. | Broken hands, bodies, or physical actions; product deformation; prompt not followed | Quality review and regeneration needed when artifacts affect deliverability. | After failed generation | Study manually annotated frames from Sora-generated videos for multiple artifact classes. | https://arxiv.org/abs/2504.21334 | real | taxonomy context | no | no | arxiv-sora-artifacts-2504 | high | Research evidence, not creator workflow evidence. Useful for taxonomy because artifact classes map to output-side failure tags. |
| E-014 | Academic benchmark / research report | Multiple generators including Runway ML | Creators/educators needing physically accurate visuals | Generative tools produced misleading outputs for fluid-motion prompts, showing weak domain/physics fidelity. | Prompt not followed; action/physics failure | Time wasted if creator expects technically accurate product/science/industrial visuals. | Before generation; after failed generation | Report found well-known AI generators were not adequately trained for fluid dynamics imagery. | https://arxiv.org/abs/2405.15406 | real | technical premise | no | no | arxiv-fluid-motion-2405 | medium | Not ecommerce-specific and not creator pain. Relevant to product demos involving liquid, airflow, splashes, or physics. |
| E-015 | Academic method paper / prompt optimization research | Text-to-video models generally | AI video creators using prompt iteration | Text-to-video models remain highly sensitive to prompt design; prompt optimization methods exist because current outputs depend strongly on prompt wording. | Blind retry loop; prompt not followed | Poor prompt design causes lower generation quality and repeated iteration. | While writing prompt; before generation | Research frames prompt design as critical to generation quality and proposes retrieval/refinement/ranking instead of model fine-tuning. | https://arxiv.org/abs/2603.01509 | real | technical premise | no | no | arxiv-ttprompt-2603 | medium | Technical premise only. Supports preflight plausibility indirectly, but needs direct creator cases before product claims. |
| E-016 | Trustpilot user review | Runway | Paying Runway user | User says generated videos were incorrect or glitchy while still being charged. | Prompt not followed; camera/control failure | Paid for incorrect/glitched outputs. | During retry loop; after failed generation | Review calls Runway a "Credit-stealing machine" and says generated videos were incorrect or had glitches and were charged for. | https://www.trustpilot.com/review/runwayml.com | real | direct pain | yes | no | trustpilot-runway-marcelo-2026-06-23 | high | Current recovery: retry or abandon. Possible preflight: warn when prompt requires high precision and tell user the first generation may be charged even if unusable. |
| E-017 | Trustpilot user review | Runway | Paying Runway user | Two video generations got stuck at 0%, consuming 890 credits, and the user could not get credits refunded. | Credits wasted; blind retry loop | 890 credits stuck/wasted; no refund; no human support. | During retry loop; after failed generation | Review says "Generated x2 videos that got stuck at 0%" and identifies "890 credits" tied to stuck generations. | https://www.trustpilot.com/review/runwayml.com | real | direct pain | yes | no | trustpilot-runway-sam-bignell-2026-06-16 | high | Current recovery: seek support/cancel. Possible preflight: not a prompt-quality fix, but supports making credit cost explicit before generation. |
| E-018 | Trustpilot user review | Runway | Paying Runway user | User says generations can ignore feedback yet still cost money. | Prompt not followed; credits wasted | Still pays when output is garbage or ignores feedback. | During retry loop | Review says when Runway generates garbage that does not reference user feedback, the user still pays. | https://www.trustpilot.com/review/runwayml.com | real | direct pain | yes | no | trustpilot-runway-jonathan-ward-2026-06-14 | high | Current recovery: retry or stop using tool. Possible preflight: flag prompts requiring iterative feedback and warn that failed adherence still burns credits. |
| E-019 | Trustpilot user review | Runway | Paying Runway user | User says the tool barely understands prompts, glitches, errors, and wastes time and money. | Prompt not followed; camera/control failure; credits wasted | Money and time wasted on glitched/error outputs. | During retry loop; after failed generation | Review says results were disappointing, glitchy, barely understood the prompt, and wasted money/time. | https://www.trustpilot.com/review/runwayml.com | real | direct pain | yes | no | trustpilot-runway-valentina-2026-06-12 | medium | Current recovery: seek support or abandon. Possible preflight: detect underspecified/complex prompts and recommend simpler first attempt before paid generation. |
| E-020 | Trustpilot user review | Runway | Paying Pro subscriber | User says 2,000 credits were burned in 10 minutes and every output was distorted, glitched, and unusable. | Credits wasted; product deformation; prompt not followed | 2,000 credits in 10 minutes; outputs unusable. | During retry loop; after failed generation | Review says Runway drained 2,000 credits quickly and every output was distorted, glitched, and unusable. | https://www.trustpilot.com/review/runwayml.com | real | direct pain | yes | no | trustpilot-runway-kristina-2026-05-10 | high | Current recovery: chargeback/dispute. Possible preflight: estimate generation-risk before spending a large credit budget. |
| E-021 | Trustpilot user review | Kling AI | Paying Kling subscriber | User says even simple prompts are not followed and each retry consumes credits. | Prompt not followed; credits wasted; blind retry loop | Pays credits each time prompt is not followed; only small percentage useful. | During retry loop | Review says even simple prompts are not followed, users pay credits each retry, and only a small percentage of outputs are usable. | https://www.trustpilot.com/review/klingai.com | real | direct pain | yes | no | trustpilot-kling-breanna-2026-06-23 | high | Current recovery: try again, spending more credits. Possible preflight: identify prompts likely to be under-controlled and suggest simpler, more constrained version. |
| E-022 | Trustpilot user review | Kling AI | Product presentation creator | User says videos take long, contain bugs, and cannot be used for product presentations. | Product deformation; prompt not followed; credits wasted | Wasted credits and money; product presentation unusable. | After failed generation; during client/content delivery | Review says generated videos had strange things/bugs and could not be used in product presentations. | https://www.trustpilot.com/review/klingai.com | real | direct pain | yes | no | trustpilot-kling-ismael-2026-06-23 | high | Current recovery: retry or use another tool. Possible preflight: flag product-presentation prompts that need stable product form and recommend reference image/shot simplification. |
| E-023 | Trustpilot user review | Kling AI | Paying Kling user | User says credits disappear quickly and many attempts are needed before getting something close to requested. | Blind retry loop; prompt not followed; credits wasted | Many attempts; short usable video becomes expensive. | During retry loop | Review says even simple tasks consume credits quickly and often require many attempts before getting close to the request. | https://www.trustpilot.com/review/klingai.com | real | direct pain | yes | no | trustpilot-kling-alex-2026-06-23 | high | Current recovery: repeated attempts and waiting. Possible preflight: score risk before first attempt and recommend whether to simplify, split, or avoid generating. |
| E-024 | Trustpilot user review | Kling AI | Paying image-to-video user | User says if the result is not what they asked for, they must try again for another 180 credits. | Credits wasted; prompt not followed | 180 credits per retry when result misses request. | During retry loop | Review says results are good most of the time but if they are not what was asked for, the user has to try again for another 180 credits. | https://www.trustpilot.com/review/klingai.com | real | direct pain | yes | no | trustpilot-kling-alan-picton-2026-06-18 | high | Current recovery: pay for another generation. Possible preflight: make likely retry cost visible and recommend safer first prompt. |
| E-025 | Trustpilot user review | Pika | Paying Pika user | User paid credits for a task that failed after several generations, producing an unusable character. | Prompt not followed; character/face inconsistency; credits wasted | Paid credits; several failed generations; struggled all day. | During retry loop; after failed generation | Review says a seemingly easy task failed after a few generations and produced a character looking like a giant jelly bean. | https://www.trustpilot.com/review/pika.art | real | direct pain | yes | no | trustpilot-pika-betty-vamanu-2025-10-15 | high | Current recovery: struggle all day, contact support, stop generating. Possible preflight: flag add-a-person/character-insertion tasks as high risk and suggest shot split or different workflow. |
| E-026 | Creative Bloq creator interview | Higgsfield Seedance 2; Kling 3; Higgsfield Cinema Studio | AI filmmaker building a short film | Creator reports making Catacombs with 3,229 AI generations and 242 hours, showing high iteration cost even with structured production. | Blind retry loop; no reusable failure review | 3,229 generations; 242 hours. | During retry loop | Interview headline frames the film as made with thousands of AI generations and hundreds of hours. | https://www.creativebloq.com/ai/how-a-filmmaker-turned-a-10-year-old-unmakeable-movie-idea-into-reality-with-ai | real | pain-adjacent | yes | no | creativebloq-mendiboure-catacombs-2026-06 | medium | Useful high-iteration cost signal from a creator interview, but this row does not contain a specific per-generation preflight behavior. Do not count it as workflow behavior evidence without a concrete pre-generation practice. |
| E-027 | Creative Bloq creator interview | Higgsfield Seedance 2; Kling 3; Higgsfield Cinema Studio | AI filmmaker managing character continuity | Creator creates character sheets and reference images from multiple angles, and updates them when characters change state. | Character/face inconsistency; lack of shot decomposition | Time spent preparing and updating reference assets to avoid drift. | Before generation; while writing prompt | Interview says AI consistency requires character sheets and reference images for front, back, profile, close-up, costume, and important visual details. | https://www.creativebloq.com/ai/how-a-filmmaker-turned-a-10-year-old-unmakeable-movie-idea-into-reality-with-ai | real | workflow behavior | no | yes | creativebloq-mendiboure-catacombs-2026-06 | high | Useful workflow behavior signal: reference-image and character-sheet prep before generation. It is not independent market validation and does not prove adoption of a 30-second preflight. |
| E-028 | Creative Bloq creator interview | Multiple AI video generators; Higgsfield Seedance 2; Veo 3 | AI filmmaker choosing tools | Creator tested many AI video generators over years and waited for a model that fit live-action quality expectations. | Model choice confusion; prompt not followed | Years of experimentation before choosing a model/workflow. | Before generation | Interview says the creator tested many AI video generators from 2023 to late 2025 because results looked too fake/plastic until a later model met the quality bar. | https://www.creativebloq.com/ai/how-a-filmmaker-turned-a-10-year-old-unmakeable-movie-idea-into-reality-with-ai | real | workflow context | no | yes | creativebloq-mendiboure-catacombs-2026-06 | low | Macro-level model-choice behavior, not strong per-prompt preflight evidence. Useful for model-fit context, but do not count it as proof that users will run a 30-second prompt preflight. |
| E-029 | Creative Bloq creator interview | Freepik; Midjourney; AI video tools | AI-native studio / small team filmmaker | Creator says filmmaking fundamentals determine how to describe lighting, framing, and movement to generative tools. | Camera/control failure; prompt not followed | Poor pre-generation direction leads to weak/student-film visuals. | While writing prompt; before generation | Interview says the creator's production fundamentals underpin his AI workflow and help him describe lighting, framing, and movement. | https://www.creativebloq.com/ai/ai-filmmaking-is-a-gimmick-if-you-dont-know-the-rules-of-cinema | real | workflow behavior | no | yes | creativebloq-cardoza-phantomx-2026 | medium | Concrete pre-generation behavior only at the level of using film language for lighting, framing, and movement. Useful workflow signal, but not direct pain evidence or validation. |
| E-030 | Creative Bloq creator interview | Freepik; Kling; Magnific; Veo 3 | AI-native studio / small team filmmaker | Creator uses physical references, photographed props, and visual reference sheets to maintain consistency. | Character/face inconsistency; product deformation | Time spent creating references before generating instead of relying on prompt text alone. | Before generation | Interview says scripts come first; physical references are photographed and reworked with AI, and visual reference sheets ensure consistency. | https://www.creativebloq.com/ai/ai-filmmaking-is-a-gimmick-if-you-dont-know-the-rules-of-cinema | real | workflow behavior | no | yes | creativebloq-cardoza-phantomx-2026 | high | Useful workflow behavior signal: reference prep before generation. It does not prove target ecommerce/ad creator adoption of a 30-second preflight. |
| E-031 | Creative Bloq creator interview | Freepik; Kling; Magnific; Veo 3 | AI-native studio / small team filmmaker | Creator says AI still requires storyboards, blocking, continuity, and editing rhythm. | Lack of shot decomposition; camera/control failure | Avoids weak/unintentional visuals by doing traditional pre-production before generating shots. | Before generation; during team knowledge sharing | Interview states that pre- and post-production still follow filmmaking rules, including storyboards, blocking, continuity, and editing rhythm. | https://www.creativebloq.com/ai/ai-filmmaking-is-a-gimmick-if-you-dont-know-the-rules-of-cinema | real | workflow behavior | no | yes | creativebloq-cardoza-phantomx-2026 | high | Useful workflow behavior signal: storyboard, blocking, continuity, and editing-rhythm planning before generation. It is not independent market validation. |
| E-032 | Creative Bloq creator interview | Freepik; Kling; Magnific; Veo 3 | AI-native studio / small team filmmaker | Creator generates environments in sections so the model understands a 360-degree set for continuity. | Camera/control failure; character/environment consistency | Extra pre-generation asset work to avoid continuity breaks when moving the camera. | Before generation | Article notes environments need to be created in sections so the model understands a 360-degree set for continuity. | https://www.creativebloq.com/ai/ai-filmmaking-is-a-gimmick-if-you-dont-know-the-rules-of-cinema | real | workflow behavior | no | yes | creativebloq-cardoza-phantomx-2026 | high | Useful workflow behavior signal: sectioned environment prep for continuity before generation. It is not independent market validation. |
| E-033 | The New Yorker creator profile | Stable Diffusion; Runway | AI filmmaker / commercial creator | Creator first generates still images as concept art/storyboards, then feeds one image per clip plus a motion/camera prompt into Runway. | Lack of shot decomposition; camera/control failure | Multiple-step workflow and multiple permutations per clip before final edit. | Before generation; during retry loop | Profile says still images function as concept art/storyboarding, then each clip uses an image plus paragraph motion prompt; resultant clips required multiple permutations. | https://www.newyorker.com/culture/screening-room/an-ai-generated-film-depicts-human-loneliness-in-thank-you-for-not-answering | real | workflow behavior | no | yes | newyorker-trillo-runway-2023 | high | Useful workflow behavior signal: image-first storyboard and one-clip-at-a-time generation. It is not direct pain evidence and does not validate a 30-second preflight. |

Field guidance:

- `evidence_id`: stable ID such as `E-001`.
- `source`: where the evidence came from, such as Reddit, interview, YouTube comment, or creator submission.
- `platform/tool`: AI video tool mentioned, if any.
- `user type`: creator type, team size, or workflow role when known.
- `pain summary`: one-sentence summary of the pain.
- `failure category`: use one of the initial pain categories below, or add a new one with a note.
- `cost signal`: credits wasted, retry count, time lost, failed delivery, client revision loop, or similar.
- `workflow stage`: use one of the workflow stages below.
- `quote or paraphrase`: direct quote if available; otherwise a clear paraphrase.
- `link`: public URL or local reference. Do not include private material without permission.
- `evidence type`: `real`, `reconstructed`, or `synthetic`.
- `evidence_kind`: classify the role of the row as `direct pain`, `workflow behavior`, `pain-adjacent`, `cost context`, `workflow context`, `alternative context`, `vendor signal`, `technical premise`, or `taxonomy context`.
- `counts_as_direct_pain_evidence`: use `yes` only for direct creator/community/user evidence that describes a concrete pain.
- `counts_as_workflow_behavior_evidence`: use `yes` only when the row shows creator behavior before or around generation, such as reference prep, character sheets, storyboard, shot planning, model choice, environment continuity prep, image-first workflow, or one-clip-at-a-time generation.
- `independence_group`: source/thread/article group used to avoid over-counting multiple observations from the same source.
- `confidence`: `low`, `medium`, or `high`, based on specificity, source quality, and cost signal.
- `notes`: caveats, context, or follow-up questions.

## 5. Initial Pain Categories

Starting categories:

- Credits wasted.
- Blind retry loop.
- Character/face inconsistency.
- Product deformation.
- Camera/control failure.
- Prompt not followed.
- Model choice confusion.
- No reusable failure review.
- Client revision causes repeated regeneration.
- Prompt too complex for one shot.
- Lack of shot decomposition.

These categories are provisional. Update them only when repeated evidence shows a clearer category structure.

## 6. Workflow Stages

Use these stages when logging evidence:

- Before prompt writing.
- While writing prompt.
- Before generation.
- During retry loop.
- After failed generation.
- During client revision.
- During team knowledge sharing.

## 7. Evidence Rules

- Separate real user evidence from assumptions.
- Mark synthetic or reconstructed cases clearly.
- Do not treat tutorials as proof unless user pain appears in comments, examples, or workflow breakdowns.
- Do not claim validation until multiple independent evidence items support the same pain.
- Prefer concrete cost signals: credits wasted, number of retries, time lost, failed delivery, client revision loop.
- Do not include private prompts, client assets, or unpublished brand material without explicit permission. Anonymize user, client, and brand details when needed.
- Do not count multiple observations from the same article, guide, tutorial, or thread as independent evidence.
- Do not turn this document into a feature roadmap.
- The north star question is: can preflight change behavior before the user clicks generate?

## 8. Next Evidence Target

The next batch should add 10 direct creator/community evidence rows from Reddit, YouTube comments, Bilibili, Xiaohongshu, Discord/community posts, or direct creator interviews.

Prioritize evidence that mentions:

- Credits wasted.
- Generated X times before a usable result.
- Prompt not followed.
- Character or face changed.
- Product changed shape.
- Client revision caused repeated regeneration.
- Manual shot splitting or another preflight-like workaround.
- Failed attempts not captured as reusable knowledge.

Do not use more articles, papers, product pages, or generic tutorials for the next direct evidence batch unless they contain specific creator pain in comments, examples, or workflow breakdowns.

## 9. Open Questions

- Which users feel the cost most strongly?
- Which failure categories appear most often?
- Do creators already do any preflight check manually?
- Do they record failed prompts?
- Would they spend 30 seconds before generation to reduce retries?
- Is the main pain credits, time, client revision, or loss of creative control?
- Is the best entry point a web app, checklist, browser extension, template, or existing workflow integration?
