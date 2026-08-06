# ADR — video-prompt-qa unified preflight evaluation（2026-08-07）

### ADR-001：为什么加统一评测入口而不是「更像 Agent」
- 背景：评分是有界单次判断；preflight 是确定性映射；两者都无统一机器可读入口。
- 最终选择：`evaluate_preflight.py`（offline、stdlib、无 key）——单一 JSON 报告 + invariants + schema 校验 + subject-gate 证据并入。
- 为什么不是更复杂的 Agent：多轮不增加判分信息量；Agent loop 纯增成本。真正需要多轮的是生成后 critique（接真视频模型，另一量级）。
- 代价：只验证确定性层，不验证 LLM 评分质量。
- 重审：接入真实视频生成对照后再扩展。

### ADR-002：为什么 rubric 重算必须精确复现 harness 聚合
- 背景：第一次按 impact 排序重算得 30/6，与存储 21/15 不符；harness 是先 impact→decision 再取 `needs_review>revise_first>generate_ok`。
- 最终选择：用 harness 的精确聚合逻辑（`scripts/run_preflight_harness.mjs`），得到 36/36 一致、0 mismatch。
- 为什么：「复现现有工具行为」不是发明新算法；不一致说明某个环节有 bug 或口径漂移。
- 代价：聚合逻辑与 harness 耦合（若 harness 改了，脚本要同步）。
- 重审：harness 版本升级时重跑本脚本核对。

### ADR-003：为什么 subject-gate 的 VIOLATED/ERROR 如实暴露而不是「修」掉
- 背景：CASE_STUDY 曾声称 G1 降到 4.6/2；持久数据是 6.4/4 GATE VIOLATED + 2 个 ERROR。
- 最终选择：报告如实记录 violation rate 0.333 + error records；CASE_STUDY 对齐持久口径，诚实讲「gate 生效但未达标，需代码级 clamp」。
- 为什么：证据纪律——数字必须来自持久数据，不能选「看起来好」的版本；CASE_STUDY 不得维护另一套数字。
- 代价：不能宣称「gate 已修复」。
- 重审：实现代码级 clamp 后重跑 gate 验证（列 backlog）。

### ADR-004：为什么 shadow revision benchmark 标 FUTURE 而不是编造
- 背景：brief 建议 shadow revision benchmark（改 prompt→再 preflight→风险下降）；但 repo 无审计的人工修订样本。
- 最终选择：报告 `shadow_revision_benchmark: {"status":"future"}`，注明原因。
- 为什么：没有真实修订样本时编造数字会污染整个证据链。
- 代价：这项能力未展示。
- 重审：收集到真实人工修订对后补上。
