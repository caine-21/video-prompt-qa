# CANONICAL_FACTS — video-prompt-qa

> 权威事实快照。所有面试数字只能引用本文件标注为 canonical 的结果。
> 规则：选「当前 HEAD 最容易复现、证据最完整」的版本；CASE_STUDY 不得维护与持久数据冲突的另一套数字。
> 标签：A=源码事实 / B=推断 / C=未实现。

## Project
`video-prompt-qa` — AI 视频 prompt 质量评估（单次 LLM 打分 + 确定性聚合的评分 pipeline）

## Canonical commit
- `master` @ `3362021f0fdeb92495a7a6ab91e80b814deac679`（2026-08-07 核查，working tree clean，ahead of origin 19 commits）

## Verified date
2026-08-07

## Current architecture
一次请求 = 一次 completion（共享 `EVALUATION_SYSTEM_PROMPT`，Groq llama-3.3-70b 优先 + DeepSeek fallback）→ `buildEvaluationResult()` 确定性聚合（5 维均值）。orchestrator 策略 fallback/race/consensus（consensus 取最高分）。
生产 provider **只有 Groq + DeepSeek**（`lib/types.ts` `AIProvider = "groq"|"deepseek"`）。
不调用真实视频模型；Subject Gate 是 **prompt 指令**（软约束），非代码强制。

## Current maturity
在线评分 pipeline 已接入产品（Next.js 前端 + API + Supabase 历史）；离线 preflight 研究轨（36 条 seed）未接线到产品。无自动化测试套件。

## Canonical evaluation
**三组手动受控实验 + preflight 确定性映射，无自动化测试套件：**
1. 对抗 15 例（`run_adversarial.py`，需 Groq key）
2. subject omission 3×3（`run_subject_omission_experiment.py`）
3. gate validation 6 例（`run_subject_gate_validation.py` → `tests/subject-gate-validation.json`，需 key）
4. preflight 36 条 seed（确定性 .mjs 脚本，offline）

## Dataset
- `tests/fixtures/edge-cases.ts` — **18 条**（input-structure 6 / semantic-ambiguity 4 / conflicting-instructions 4 / hallucination-risk 4）；README/CASE_STUDY 写「16」→ **文档错误**
- `tests/subject-gate-validation.json` — 6 条 gate 验证持久数据
- `data/preflight_records_seed_v1.json` — 36 条 seed（PC-001..036）

## Run command
- 全量无自动化测试。现有 Python 脚本需 Groq key 且各自硬编码 system prompt。
- 本轮新增离线统一入口：`py evaluate_preflight.py`（后续补充细节）

## Result artifact
- `tests/subject-gate-validation.json`（canonical gate 持久数据）
- `data/preflight_summary_seed_v1.json`（canonical preflight 汇总）

## Current verified metrics
| 指标 | 值 | 说明 |
|---|---|---|
| G1（无主体+摄影词汇） | **Overall 6.4 / Spe 4，verdict GATE VIOLATED** | `subject-gate-validation.json` N-V++（=G1） |
| F-V+ | Overall 6.8 / Spe 6，**GATE VIOLATED** | 同上 |
| F-V++ | Overall 6.8 / Spe 4，GATE RESPECTED | 同上 |
| S-V++（control） | 8.2 / Spe 9，GATE NOT TRIGGERED | 同上 |
| S-V0 / N-V+ | API 400 `json_validate_failed` | 输出契约脆弱（improvements 变 object） |
| preflight seed | 36 条：21 needs_review / 15 revise_first / **0 generate_ok** | `preflight_summary_seed_v1.json` |
| 一致性 | stddev=0（temp=0） | 受控实验 |

## Known limitations
- **无自动化测试/CI**；edge-cases 是 spec 非测试套件
- 不调用真实视频模型；「模型 fit」判断无真对照
- consensus 取最高分引入宽松偏差
- gate 是 prompt 指令非代码强制（N-V++/F-V+ 未达标——GATE VIOLATED）
- preflight 全部 revise_first/needs_review、无 generate_ok（rubric over-strict，`preflight_rubric_calibration_v1.md` 自认）

## Deprecated claims
- ❌ **CASE_STUDY 声称 G1 after=4.6 / Spe=2** — 与持久数据 `subject-gate-validation.json`（6.4 / 4，GATE VIOLATED）矛盾。必须用持久数据口径
- ❌「16 edge case fixtures」— 实为 18
- ❌ README「Pick a model (Claude/Gemini/Groq)」— 代码只有 Groq + DeepSeek
- ❌「gate 修复后 G1 降到 4.6」— 门加入后持久数据显示仍 VIOLATED

## Allowed interview claims
- 「G1 失败发现：无主体+摄影词汇得 8.4 → 受控实验证明词汇密度主导分数 → 加 Subject Detection Gate」——但必须诚实补一句「门是 prompt 级软约束，持久数据 N-V++ 6.4/Spe4 仍 GATE VIOLATED，真正修复需代码级 clamp」
- 「5 维共享 prompt 保证多 provider 可比；确定性聚合；consensus 取最高分有宽松偏差（主动指出）」
- 「preflight 36 条全为 revise_first/needs_review（0 generate_ok），rubric over-strict——这是未接线的研究轨」
- 「无真实视频生成对照，13 条本应可尝试样本全被拦截」

## Forbidden claims
- ❌「gate 已修复 G1 到 4.6」「生成成功率」「节省 credits」
- ❌「接了 Sora/Kling/Pika」——只出现在 prompt 文本作为打分对象
- ❌「有自动化测试/CI」
- ❌ 把 5 维分数说成真实视频生成效果

## 本轮升级（2026-08-07 完成）
- ✅ 新增 `evaluate_preflight.py` 统一机器可读评测入口（offline、stdlib、无 key）：
  - 加载固定 manifest（36 记录）+ schema 校验 + **rubric 重算决策与存储完全一致（36/36，0 mismatch）**
  - 5 条 invariants 全部 PASS；输出唯一 JSON 报告 `data/reports/preflight_eval_report.json` + Markdown 摘要
  - subject-gate 证据并入：N-V++/F-V+ VIOLATED、S-V0/N-V+ ERROR（violation rate 0.333）如实暴露
  - shadow revision benchmark = **FUTURE**（无审计的人工修订样本，不编造）
- ✅ CASE_STUDY G1 数字修正：4.6/2 → 持久数据 6.4/4（GATE VIOLATED），诚实重构「gate 生效但未达标，需代码级 clamp」；明确唯一权威源
- 证据：`py evaluate_preflight.py` 运行 exit 0，hard_pass=True
- 未做：无自动化测试套件（沿用 invariant+exit code 做门）、无真实视频生成对照、无 shadow revision 数据
