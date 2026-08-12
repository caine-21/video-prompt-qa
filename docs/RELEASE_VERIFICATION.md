# Release Verification — video-prompt-qa

> Clean-room verification: 提取 `77477ea` committed 树到临时目录，无未跟踪文件、无 API key、无网络。

- **Verified commit**: `77477ea fix: unify preflight evaluation evidence`
- **Verified date**: 2026-08-07
- **Environment**: Windows 11 / Python 3.14.4（仅 stdlib，无额外依赖）
- **Isolation method**: `git archive 77477ea | tar -x -C <tmpdir>`

## Install command
无需安装（纯 stdlib 脚本）。

## Test / Smoke command
```bash
py evaluate_preflight.py
```

## Result
```
records: 36  hard_pass: True
decision dist (stored): {revise_first: 15, needs_review: 21}
recompute matches stored: 36/36  mismatches: 0
schema errors: 0  per-record: {pass: 36}
subject gate violated: [F-V+, N-V++]  violation rate: 0.333
shadow benchmark: future
exit 0
```
→ **clean commit 完全复现**：5 条 invariants 全 PASS、36/36 rubric 一致、唯一 JSON 报告生成。

## Mocked components
- 无（脚本是确定性映射 + 读取持久化数据；不调用任何 LLM）

## Known warnings
- subject-gate 持久数据如实暴露 2 VIOLATED + 2 ERROR（这是证据，不是失败）
- shadow revision benchmark = FUTURE（无真实人工修订样本）

## Not verified
- 在线评分 pipeline（Next.js + DeepSeek API）——需 API key + 前端环境
- 真实视频生成对照（Sora/Kling/Pika）——从未接入，也不在 clean-room 范围
