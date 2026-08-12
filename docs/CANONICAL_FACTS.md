# CANONICAL_FACTS.md — video-prompt-qa

> CURRENT OVERRIDE (2026-08-13): The active runtime is DeepSeek-only. The
> historical Groq + DeepSeek provider pair and fallback observations below are
> retained as incident provenance, not as current capabilities or deployment
> configuration. Current source of truth is `lib/providers/registry.ts`,
> `lib/providers/deepseek.ts`, and the DeepSeek-only environment template.

> 本文件是 video-prompt-qa 唯一事实口径。所有公开结论必须与本文件一致；冲突时以本文件 + 机器可读证据为准。
> 建立日期：2026-08-07。标签：CURRENT VERIFIED / HISTORICAL / DESIGN ONLY / FUTURE / UNRESOLVED。

---

## 1. Canonical identity

| 字段 | 值 |
|---|---|
| Project | video-prompt-qa（视频 prompt 质量评估器） |
| Canonical commit | `c775cefc`（branch `master`，merged PR #2: public-beta observability；INC-008 mitigation is pending in a follow-up branch） |
| Verified date | 2026-08-07 |
| Repository status | 工作树干净（`git status` 为空） |
| Current architecture label | LLM scoring pipeline（单次 LLM 打分 + 确定性聚合） |
| Current maturity label | **Public Beta candidate**（公网入口存在；需以最新部署的 smoke evidence 确认 beta 状态） |

---

## 2. What the system actually does

- **真实输入**：一条视频生成 prompt（文本）。
- **真实输出**：5 维评分（Clarity / Specificity / Technical Feasibility / Cinematic Quality / Creativity）+ anatomy + modelFit + improvements + edgeCases + negativePrompts（一个 JSON）。
- **实际控制流**（CURRENT VERIFIED）：`app/page.tsx → /api/{evaluate,compare,rewrite,tournament} → lib/evaluator.ts → lib/orchestrator.ts → PROVIDER_REGISTRY[deepseek] → 单次 chat.completions → buildEvaluationResult()`。**一次请求 = 一次 LLM 调用**，无循环、无工具、无状态。rewrite→re-evaluate 由 UI 层 `handleImprove` 串两个独立 API 调用，是用户发起，不是 agent 内部决策。
- **模型真正负责**：一次 completion 输出 5 维分数 + 建议。Subject Detection Gate 是 system prompt 里的指令（`base.ts:68-83`），**非代码强制**。
- **确定性系统负责**：overall = 5 维均值（`base.ts:230-236`）、tournament 胜负统计、orchestrator 的 consensus/race/fallback 选择、preflight adapter 纯映射。
- **人工负责**：用户决定是否按 improvements 修改、是否花钱去真实视频模型生成。
- **最终动作**：**不调用真实视频模型**；系统只出评分与建议，不触发任何生成。

---

## 3. Architecture classification

**主要架构名称：LLM scoring pipeline**（单次 LLM 打分 + 确定性聚合；按任务性质是 Parallel Risk-analysis Workflow 的雏形，因为 preflight 风险检查设计上可并行）。

- **为什么这样命名**：评分是有界单次判断任务——输入一条 prompt、输出一次打分。没有需要多步推理/工具检索/反事实探索的子任务。真正的「智能」（rubric、subject gate、失败分类）沉淀在 system prompt 与离线实验里。
- **哪些源码支持**：`providers/deepseek.ts` 单次 completion；聚合全为确定性代码。
- **为什么不是更开放的 Agent**：无循环、无工具、无状态、无 memory；「下一步」不需要模型决定。
- **为什么不是 Multi-Agent**：单次判断任务，无独立决策体。
- **局部 Agent / Shadow**：无。preflight decision（generate_ok / revise_first / needs_review）是**离线研究工件，未接入 UI/API**（DESIGN ONLY）。

---

## 4. Connected implementation

| 能力 | 当前是否接线 | 入口文件 | 运行时是否调用 | 证据 |
|---|---|---|---|---|
| LLM 调用 | ✅ | `lib/providers/deepseek.ts`（deepseek-v4-flash）；registry 注册 | 是（真实 provider，需 API key） | commit `037a465` 收敛为 DeepSeek-only |
| 检索 | ❌ | 无 | 否 | 非 RAG 场景 |
| 工具调用 | ❌ | 无 | 否 | 不调用任何视频模型/检索 |
| 状态保存 | ⚠️ | `lib/db.ts`（Supabase 历史/feedback） | 是（历史记录）；无跨请求状态 | — |
| Guardrail | ⚠️ | Subject Gate 在 system prompt（`base.ts:68-83`），前端 `SubjectWarningCard` 二次展示 | 是但**非代码强制** | gate 持久数据未达标（见 §5） |
| Verifier | ❌ | 无输出 schema 代码校验 | 否 | `json_validate_failed` 400 崩溃（见 §5） |
| Critic / Revision | ❌ | 无（rewrite 是独立 API，非 agent 循环） | 否 | — |
| HITL | ❌ | 无 | 否 | 用户人工决定是否修改/生成 |
| 幂等 | ❌ | 无 | 否 | — |
| Memory | ⚠️ | `page.tsx` localStorage history | 是（本地） | 无服务端记忆 |
| Trace | ❌ | 无线上 trace；`lib/db.ts` 有 logFeedback | 部分 | 反馈收集有，触发迭代机制未实现 |
| Ledger | ❌ | 无 | 否 | — |
| Shadow / Multi-Agent | ❌ | 无 | 否 | — |
| 最终外部动作 | ❌ | 无真实视频生成 | 否 | Sora/Kling/Pika 仅出现在 modelFit 打分对象 |

---

## 5. Canonical evaluation snapshot

> 当前已有本地自动化回归：`npm run test:preflight` 覆盖 observability 与 preflight 测试；仓库仍无 CI 与真实视频生成对照。

### ① 受控实验（HISTORICAL，pre-gate 观测）

| 字段 | 值 |
|---|---|
| 名称 | Subject Omission Experiment（`run_subject_omission_experiment.py`） |
| 数据 | CASE_STUDY §5 表格（N-V0 4.6 / N-V+ 6.8 / N-V++ 8.2；S-V0 5.2 / S-V+ 7.6 / S-V++ 8.0；F-V++ 8.0） |
| 结论 | 词汇密度主导分数：无主体 prompt 也能得高分（N-V++ 8.2 vs S-V++ 8.0） |
| 状态 | **HISTORICAL**：是 gate 修复前的观测；数字来自 CASE_STUDY 记录，无独立机器可读结果文件 |

### ② G1 对抗发现（HISTORICAL）

- G1（"A cinematic 4K aerial drone shot with bokeh, golden hour lighting..."）pre-gate 得 **8.4/10，Specificity=8**（CASE_STUDY §5、ADVERSARIAL_TESTS）。
- 状态：HISTORICAL，gate 修复前的 adversarial 观测。

### ③ Subject Gate 持久验证数据（CURRENT VERIFIED 的唯一机器可读证据）

| 字段 | 值 |
|---|---|
| 名称 | Subject Gate Validation（`tests/subject-gate-validation.json`） |
| 运行日期 | 2026-06-11（文件 mtime，与 CASE_STUDY 同日） |
| Provider | DeepSeek deepseek-v4-flash（当前 runtime）；历史 Groq 记录仅作 incident evidence |
| 样本 | 6 例（N-V++ / F-V++ / F-V+ / S-V++ / S-V0 / N-V+） |
| 持久结果 | **N-V++：8.2 → 6.4，Spe=4，verdict ❌ GATE VIOLATED**；F-V++：8.0→6.8 ✅ RESPECTED；F-V+：7.0→6.8 ❌ VIOLATED；S-V++（控制）：8.0→8.2 ⚪ NOT TRIGGERED；S-V0、N-V+：**ERROR（json_validate_failed 400）** |

**允许引用（仅此）**：
- Subject Gate 修复方向存在，但持久验证数据显示**未完全达标**：N-V++（G1 类）Spe=4 > 规则要求 ≤3，GATE VIOLATED；两个用例因 `improvements` 输出为 object/string 而非 array 触发 `json_validate_failed` 400。
- 含义：prompt 级 gate 把无主体高分从 8.2 压到 6.4，但没压到规则目标；输出契约无代码强校验，模型字段类型错误会直接 400。

### ⚠️ 与 CASE_STUDY 的冲突（UNRESOLVED，必须修复）

- CASE_STUDY §6.1「生产验证数据」表声称：**G1 8.4 → 4.6（-45%）、Spe 8→2、控制组 S-V++ 维持 7.4**。
- 持久化 `tests/subject-gate-validation.json`（同日 2026-06-11）实际：**N-V++ 8.2 → 6.4、Spe=4、GATE VIOLATED；S-V++ 控制组 8.2**。
- **两组数字矛盾**。§6.1 的数字在仓库中无对应机器可读证据。**在重新运行并产生一致的机器可读验证文件之前，CASE_STUDY §6.1 的数字不得作为当前结果引用。**

### ④ preflight 研究轨（DESIGN ONLY / FUTURE）

- `data/preflight_summary_seed_v1.json`：36 条 seed 记录，`records_by_decision` = **generate_ok: []（0 条）、revise_first: 15、needs_review: 21**。
- `docs/research/preflight_core_integration_v0.md`：adapter 是确定性映射、无副作用、**UI/API 工作明确推迟**（"UI and API work are intentionally deferred"）。
- 状态：DESIGN ONLY——未接入产品；`preflight → preview → critique → revise` 闭环只有 critique→revise 两段实现。

---

## 6. Reproduction commands

> 环境：Windows / PowerShell。必须用 `py`。运行评测/实验需 `DEEPSEEK_API_KEY` 环境变量（`.env.local`）。

- **Build**：`npm run build`（Next.js；无 test script）。
- **实验脚本（需 API key，非离线）**：`py run_subject_omission_experiment.py`、`py run_adversarial.py`、`py run_subject_gate_validation.py`。⚠️ 未在当前环境执行（需真实 provider + 写结果文件）；已存在的持久产物 `tests/subject-gate-validation.json` 是历史 run 的输出，读取可复现其内容，但**重跑会产生新数字，不能预设与历史一致**。
- **Artifact verification（已验证读取）**：`tests/subject-gate-validation.json` 结构为 6 例，含 `before_*` / `result` / `verdict`；`data/preflight_summary_seed_v1.json` 含 `records_by_decision`。
- ⚠️ **注意**：脚本 `run_adversarial.py` / `run_subject_*` 的 `SYSTEM_PROMPT` 可能落后于生产 `lib/providers/base.ts`（历史 review 发现 prompt 漂移）——重跑前先核对脚本与生产 prompt 是否一致。

---

## 7. Current limitations

- 无 CI 与真实视频生成对照；`npm run test:preflight` 已提供本地回归测试，部分 `tests/` 目录仍是结果与 fixtures。
- 无真实视频生成对照：系统完全不调用 Sora/Kling/Pika 等，modelFit 判断无真实验证。
- Subject Gate 是 prompt 指令非代码强制；持久验证显示未达标 + JSON 契约脆弱（400 崩溃）。
- 历史 canonical 记录曾捕获 README 与代码漂移；当前 runtime 已在 `037a465` 收敛为 DeepSeek-only，`c775cefc` 将 public-beta observability 合入 `master`，旧 Groq 记录保留为 historical evidence。
- preflight（风险分类/生成前检查）是离线研究轨，未接入 UI/API。
- 36 条 seed 中 generate_ok=0——研究轨里没有一条「可以尝试」的样本，需要更广校准（UNRESOLVED 的校准缺口）。
- 当前指标只能说明：在固定 prompt 上模型评分的行为模式（词汇密度主导）与 gate 的局部效果。
- 当前指标不能说明：建议是否真的改善真实视频生成结果、credits 节省、用户采纳。

---

## 8. Deprecated claims

| 旧说法 | 出现位置 | 为什么不能继续使用 | 替代口径 |
|---|---|---|---|
| 「G1 从 8.4 降到 4.6（-45%）、Spe 8→2、控制组 7.4」 | CASE_STUDY §6.1 | 与持久化 `tests/subject-gate-validation.json`（8.2→6.4、Spe=4、GATE VIOLATED、控制组 8.2）矛盾，无机器可读证据 | 「gate 修复方向存在；持久验证显示 N-V++ 8.2→6.4 但 Spe=4 仍未达标（GATE VIOLATED），且两例 JSON 400」 |
| 「Subject Detection Gate 已验证通过」 | 可能的过度宣称 | 持久 verdict：2 VIOLATED / 1 RESPECTED / 1 NOT TRIGGERED / 2 ERROR | 「gate 是 prompt 指令；验证数据部分未达标，需代码级 clamp + 输出校验」 |
| 「Claude / Gemini / Groq 三 provider」 | 历史 README | 生产代码已移除旧 provider；当前 runtime 仅 DeepSeek | 「DeepSeek-only 单 provider」 |
| 「preflight 生成前检查已上线」 | 任何对外宣称 | adapter 是确定性映射，UI/API 明确推迟（DESIGN ONLY） | 「preflight 是离线研究轨，未接入产品」 |
| 「评测显示一致性佳（stddev=0）」 | 历史 review 引用 | 该结论来自旧版脚本 prompt（无 gate、无 anatomy），与生产 prompt 不同步 | 需用生产 prompt 重跑才能引用 |

---

## 9. Allowed interview claims

1. 「这是一个单次 LLM 打分的评分 pipeline：一次请求一次 completion，5 维分数 + 建议，聚合是确定性代码。它不需要 Agent loop——评分是有界单次判断。」（证据：`providers/deepseek.ts`、`base.ts`）
2. 「对抗实验发现评测器本身可以被 gaming：一条没有主体的 prompt 因为堆满摄影词汇得了 8.4/10，词汇密度主导了分数。」（证据：CASE_STUDY §5，HISTORICAL 观测）
3. 「我用受控实验证实了机制：3×3 矩阵改变主体存在性与词汇密度，N-V++ 8.2 vs S-V++ 8.0——分数被『怎么拍』误导成『拍什么』。」（证据：CASE_STUDY §5）
4. 「我加了 Subject Detection Gate 修复，但诚实说：持久验证数据显示它没完全达标——N-V++ 从 8.2 压到 6.4，但 Spe=4 仍违反 ≤3 的规则；还有两例因为模型把 improvements 输出成 object 触发 JSON 400。这说明 prompt 级 gate 不够，要代码级 clamp + 输出契约校验。」（证据：`tests/subject-gate-validation.json`）
5. 「我把历史双 provider 部署收敛为 DeepSeek-only，并保留旧 fallback incident 作为排障证据。」（证据：`lib/providers/registry.ts`、`docs/incidents/INC-006-preview-provider-rate-limit.md`）
6. 「preflight 风险分类是离线研究轨：36 条 seed 里 generate_ok=0，说明我需要更广的校准，还没到接 UI 的时候。」（证据：`data/preflight_summary_seed_v1.json`）

### Forbidden claims

- ❌ 「G1 8.4→4.6、Spe 8→2、控制组 7.4」（与持久数据矛盾，无证据）。
- ❌ 「Subject Gate 已修复并通过验证」。
- ❌ 「三 provider（Claude/Gemini/Groq）」或「Groq fallback 仍是当前能力」。
- ❌ 「preflight 生成前检查已上线」。
- ❌ 「建议已证明能改善真实视频生成」（无真实生成对照）。
- ❌ 「stddev=0 一致性」基于旧脚本 prompt 的结论。
