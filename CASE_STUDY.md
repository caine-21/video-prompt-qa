# AI Product Case Study
## Video Prompt QA
### How I discovered that my AI evaluator was wrong.

> **"Stop guessing which prompts work. Replace prompt intuition with repeatable experiments."**
>
> **"不再靠感觉改 Prompt，而是用实验验证 Prompt。"**

**作者：** 李哲雷  
**项目地址：** https://github.com/caine-21/video-prompt-qa  
**Live Demo：** https://video-prompt-qa.vercel.app  
**对抗测试数据：** `ADVERSARIAL_TESTS.md` / `tests/adversarial-results.json`

---

**一个简单的成本问题：**

如果一个 AI 视频团队每天测试 100 个 Prompt，其中 20% 属于「摄影术语堆砌但缺少主体」的情况——就像本文发现的 G1 case——团队会持续把 Credits 花在无效生成上，而且不知道为什么结果总是随机的。

这个项目真正想解决的不是评分问题，而是**降低 AI 内容生产中的试错成本**。评分只是手段；找到系统性失效模式，才是目的。

---

## 1. Opportunity — 为什么做这个

AI 团队每天都在做这些事：修改 Prompt、切换模型、调整参数。

但一个问题很少被系统回答：

> **"我们怎么知道它真的变好了？"**

大多数 Prompt 优化依赖的判断是：

- "看起来比之前好"
- "感觉更稳定了"
- "用户反馈还行"

这些都不是证据。它们是直觉，而直觉不可重复、不可对比、不可审计。

AI 视频生产场景让这个问题变得更具体：一个坏的 Prompt 在 Pika / Runway / Sora 上跑完，浪费的不只是时间——是真实的 credits。大多数团队在生成之后才发现 Prompt 有问题。

**机会点：** 把"生成前的 Prompt 质量判断"从主观经验变成可量化、可重复的实验流程。

---

## 2. User Problem — 谁在遇到这个问题

**直接用户：** AI 视频创作团队、独立内容创作者、每天在 AI 视频平台消耗 credits 的人

**更大的模式：** 这个问题不只属于视频领域。任何在生产环境使用 LLM 的团队都面临同样的结构性困境：

```
改了 Prompt → 主观感觉好了 → 没有对比数据 → 下次遇到同类问题仍靠感觉
```

核心缺失的是**反馈闭环**——把每次 Prompt 迭代变成有记录、可复现的实验，而不是事后无法追溯的感性判断。

**用户痛点的三个层级：**

| 层级 | 问题 | 现有解法的缺陷 |
|---|---|---|
| 即时 | "这个 Prompt 能用吗？" | 靠感觉、靠经验，无法给新人传递标准 |
| 比较 | "A 和 B 哪个更好？" | 没有共同评分标准，比较结果随人而异 |
| 系统 | "我们的 Prompt 质量在变好吗？" | 无历史数据，无法追踪改进轨迹 |

---

## 3. MVP Design — 如何把直觉变成实验

**核心设计原则：把 AI 系统当作可实验对象，而不是黑盒。**

### 3.1 为什么是 5 个维度，而不是 1 个总分

单一分数掩盖了失败的具体位置。如果一个 Prompt 得了 5/10，你不知道是主体不清楚、还是技术上不可行、还是缺少画面语言。

5 个维度来自对 LLM 输出失败模式的分类，每个维度捕捉一种独立的错误类型：

| 维度 | 捕捉的失败 |
|---|---|
| **Clarity（清晰度）** | 主体模糊，同一 Prompt 不同模型解读不同 |
| **Specificity（具体性）** | 描述不足，输出趋向通用素材库质感 |
| **Technical Feasibility（技术可行性）** | 不可能完成的物理场景或镜头要求 |
| **Cinematic Quality（电影质感）** | 缺少镜头语言：景别、运镜、打光、情绪 |
| **Creativity（创意度）** | 输出缺乏视觉辨识度，像素材库风格 |

### 3.2 为什么三个模型共用同一套评估 Prompt

不共用 system prompt，就无法区分"是 Prompt 写得差"还是"是这个模型的基准偏高"。

共享 system prompt 把跨模型比较变成了**模型校准实验**：如果 Claude 给 7/10、Groq 给 4/10，这个分差本身是信号——它告诉你两个模型的评分基准不同，而不是 Prompt 的质量不同。

### 3.3 架构决策

```
用户输入
    ↓
路由层（evaluate() / compare()）
    ↓
编排器（consensus / race / fallback 三种策略）
    ↓
Provider（Groq / Claude / Gemini，共享 system prompt）
    ↓
结构化评分结果（JSON）
```

**关键约束：** 路由层只调用 `evaluate()` 和 `compare()`，从不直接访问 provider。新增一个 provider = 4 个文件，零改动其他代码。这是可扩展性的核心设计决策，不是偶然的结构。

---

## 4. AI Workflow — 怎么用 AI 构建这个系统

整个项目在 Claude Code 辅助下独立完成，但"怎么用 AI"比"用了哪个工具"更重要。

**关键判断：** 在这个项目里，AI 不是代码生成器。最难的问题不是"怎么写代码"，而是：

- 5 个维度应该是哪 5 个？（需要先想清楚失败模式分类）
- system prompt 怎么写才能让三个模型的分数具有可比性？（需要迭代测试）
- orchestrator 的 consensus 策略应该是"取平均"还是"取最高"？（需要理解不同策略的含义）

这些判断 AI 给不了答案，只能辅助执行。

**实际 workflow：**
1. 先写 EVALUATION_SYSTEM_PROMPT 的第一版，手动测试 10 个 Prompt，观察分数分布是否合理
2. 发现 Groq 和 Claude 基准差异后，固定 shared prompt 设计
3. 写 16 个 edge-case fixtures 定义边界行为（不是 automated tests，是 spec）
4. 用 Python 脚本跑 15 个对抗用例，捕获原始 JSON 输出，再分析

---

## 5. Unexpected Findings — 实验中最重要的发现

我设计这套评测系统，是为了判断 Prompt 的质量。

跑完对抗测试之后，我发现了一个更重要的问题：**评测系统本身可以被 gaming。**

**关键数字：G1 = 8.4/10**

测试 Prompt：
> *"A cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field."*

得分：8.4/10，Specificity=8，Clarity=9

这个 Prompt 没有主体。我们完全不知道在拍什么——是人、是城市、是动物？一个 AI 视频模型看到这个 Prompt，只能随机生成"某种东西"。任何有经验的视频导演看到它会立刻追问："拍谁？拍什么？"

但评测器打了 8.4 分。

**为什么：** Specificity 维度的评分 rubric 聚焦"是否有细节"，而这个 Prompt 有大量技术细节。模型被细节的数量误导，没有意识到这些细节全部是关于 *how to film*，没有一个字在说 *what to film*。

这不是 Prompt 写得好，这是 Prompt 在系统性地欺骗评测器。

这也是整个项目最重要的转折点。我原本在评测 Prompt，后来开始评测评测器本身。

---

### 5.1 Subject Omission Attack — 控制实验

G1 是一个数据点。真正有说服力的证明，需要一个**受控实验**：在保持其他变量不变的情况下，系统性地改变主体存在性和词汇密度，观察评分如何变化。

**实验设计（3×3 矩阵）：**

| 组别 | 变量 | 含义 |
|---|---|---|
| S — Real Subject | "A black cat on a rooftop..." | 明确主体 |
| N — No Subject | "A cinematic 4K aerial drone shot..." | 无主体（G1 类型） |
| F — Fake Subject | "Something moving on a rooftop..." | 语法占位符（语义为空） |

每组分三个词汇密度级别：V0（最少）→ V+（适中）→ V++（最大，G1 territory）

**实验结果（Groq / llama-3.3-70b-versatile，2026-06-11）：**

| 组别 | V0 | V+ | V++ | V0→V++ 提升 |
|---|---|---|---|---|
| **S — Real Subject** | 5.2 | 7.6 | 8.0 | +2.8 |
| **N — No Subject** | 4.6 | 6.8 | **8.2** ❌ | **+3.6** |
| **F — Fake Subject** | — | 7.0 | **8.0** ❌ | — |

**三个关键发现：**

**发现 1：在高词汇密度下，添加真实主体几乎不影响分数。**
- N-V++（无主体）：**8.2/10**
- S-V++（相同词汇 + 明确主体）：**8.0/10**
- 差值：-0.2 分

评测器在词汇密度足够高的情况下，对主体是否存在基本失明。

**发现 2：语义空的占位符 ("Something moving") 与真实主体得分相同。**
- F-V++ ("Something moving on a rooftop, cinematic 4K...")：**8.0/10，Specificity=9**
- S-V++ ("A black cat on a rooftop, cinematic 4K...")：8.0/10，Specificity=8

比有真实黑猫的版本 Specificity 还高一分。评测器把"怎么拍"的技术细节误认为"拍什么"的语义完整性。

**发现 3：Gaming 效果在无主体情况下更大。**
- 无主体（N）：V0 → V++，提升 **+3.6 分**
- 有主体（S）：V0 → V++，提升 +2.8 分

词汇对无主体 Prompt 的分数拉动比有主体还要大——因为评测器在没有主体"拉低"清晰度分的情况下，对词汇密度更敏感。

**结论：**

在当前评测配置下（Groq / llama-3.3-70b-versatile + 固定 rubric），**词汇密度对分数的影响强于主体语义完整性**。这个模式在 V0 时轻微可见（S/N 差 0.6 分），在 V++ 时几乎消失（S/N 差 0.2 分）。

这是一个单 provider 的单次观测。结论的准确表述是：在这个配置下，词汇密度是比主体完整性更强的评分信号。是否适用于其他模型（GPT-4 / Claude / Gemini），需要跨 provider 复现才能确认。

---

对抗测试 15 个用例的完整结果（Groq / llama-3.3-70b-versatile，2026-04-26）：

| ID | 类型 | 关键分数 | 评价 |
|---|---|---|---|
| B1 | 空字符串 | 1.0 | ✅ 正确处理 |
| B2 | "cat" | TF=8 | ⚠️ TF 假阳性 |
| **G1** | **零主体 + 摄影词汇** | **Overall=8.4, Spe=8** | **❌ Critical** |
| G2/G3 | 纯形容词堆砌 | Spe=2 | ✅ 正确惩罚 |
| C1-C3 | 矛盾指令 | TF=7-8, Cre=8 | ❌ 矛盾被奖励 |
| T1 | "黑洞内部拍摄" | TF=4 | ⚠️ 应为 1 |
| T2 | "10万fps蜂鸟" | TF=2 | ✅ 最佳捕获 |
| K1-K3 | 一致性检查 | StdDev=0.0 | ✅ 完全确定 |

---

## 6. Failure Taxonomy — 从数据中提炼的失效分类

基于上述测试数据，归纳出 4 类结构性失效模式：

| # | 失效模式 | 严重程度 | 根因 | 实验证据 |
|---|---|---|---|---|
| 1 | **主体缺失攻击（Subject Omission Attack）** | 🔴 严重 | 词汇密度覆盖语义完整性；"怎么拍"的细节被计入"拍什么"的完整性 | N-V++=8.2 vs S-V++=8.0（差0.2）；F-V++ Spe=9 > S-V++ Spe=8 |
| 2 | **矛盾被当创意奖励** | 🟠 高 | 模型假设矛盾是艺术意图，而非结构性错误 | C1-C3 TF=7-8，Cre=8 |
| 3 | **物理不可行降分不足** | 🟡 中 | 模型降分但不归零（应得 1 分却得 4 分） | T1"黑洞内部拍摄" TF=4 |
| 4 | **单词 TF 假阳性** | 🟡 低 | "cat"=TF:8，因为猫"在技术上可拍" | B2 TF=8 |

每类失效都有对应的修复方向，已针对第一类（也是最严重的）完成修复与验证：

### 6.1 Subject Detection Gate — 修复与验证（Prompt Engineering）

**修复方案：** 在 `EVALUATION_SYSTEM_PROMPT` 中加入 Subject Detection Gate。模型在打分前必须先完成主体分类，并依据分类结果遵守硬约束：

```
If Subject is ABSENT → Specificity MUST be ≤ 3, Clarity MUST be ≤ 4
If Subject is PARTIAL-PLACEHOLDER → Specificity MUST be ≤ 5
```

**生产验证数据（2026-06-11，DeepSeek deepseek-chat + Groq llama-3.3-70b）：**

| 用例 | Subject 分类 | Before Overall | After Overall | Before Spe | After Spe |
|---|---|---|---|---|---|
| **G1（无主体+摄影词汇）** | absent ✅ | 8.4 | **4.6** (-3.8) | 8 | **2** |
| **S-V++（黑猫+同等词汇）** | present ✅ | 8.0 | **7.4** (+0.6) | 8 | **8** |

**Gate 效果验证：**

1. **G1 从 8.4 降到 4.6（-45%）**。Specificity 从 8 降到 2。模型在 feedback 中明确写出了根因：*"cinematic, aerial drone shot, bokeh, golden hour, slow-motion, shallow depth of field are all technical descriptions of how to film, not what to film."*——这正是我们在实验中识别的机制。

2. **控制组正确通过**：有真实主体的 S-V++（"A black cat on a rooftop..."）得分维持在 7.4，Subject=present，Gate 未触发，未受误伤。

3. **Warning Card 在生产界面正确显示**：当 `anatomy.Subject.status = "absent"` 时，⚠ SUBJECT MISSING 卡片出现在评分结果上方，包含示例主体和预期提分效果。

**UI 可视化验证：**

```
⚠ SUBJECT MISSING
This prompt describes cinematography technique but does not specify what is 
being filmed. An AI video model will generate random content.

Add a specific subject, e.g.
→ a black cat
→ an elderly fisherman  
→ a neon-lit street market

Expected impact: Specificity +3–5 points after adding a subject
```

这不再是测试脚本里的数字——它是用户在界面上能看到的东西。

---

其余两类失效的修复方向：

2. **Contradiction Detector** — 前置检测逻辑矛盾；矛盾 Prompt 的 TF 不得被 Creativity 拉高
3. **Feasibility Hard Floor** — 物理不可行场景 TF 强制为 1，不允许降分停在 4

---

## 7. Next Iteration — 诚实的差距

**现状：全部是 design-time 工作，没有线上 Monitoring。**

这是我在自己的工程笔记里已经标注的最大缺口（笔记原文："⚠️ 无线上 Monitoring/FailureAnalysis，L6 Feedback Loop：空白"）。

当前系统能做：在构建阶段发现失效模式。

当前系统不能做：在有真实用户使用时，持续收集失效数据并触发系统迭代。

**真正的 Production Feedback Loop 应该是：**

```
用户使用 Prompt 评测
    ↓
用户对评分结果给出反馈（同意/不同意/标记异常）
    ↓
异常评分自动汇聚成新的对抗用例
    ↓
触发重新评估 + rubric 更新
    ↓
版本化的评测系统，有迭代历史
```

这是下一个版本真正要解决的问题。目前 `lib/db.ts` 已接入 Supabase，可以作为反馈数据的存储基础——但收集逻辑、触发机制、迭代流程尚未实现。

**其他迭代方向：**
- 多 Provider 对抗数据集（当前仅有 Groq 数据；Claude 和 Gemini 的失效模式是否相同？）
- Subject Detection 作为 v2 核心功能
- 从视频 Prompt 扩展到通用 LLM 输出评测（核心评测框架已经是通用的）

---

## 总结

这个项目的核心不是"我做了一个评测工具"。

核心是：**一条完整的 AI 可靠性工程闭环。**

```
发现失效模式（G1 = 8.4，无主体 Prompt 被高估）
    ↓
设计控制实验（3×3 矩阵，验证词汇密度是主驱动信号）
    ↓
识别根因（Specificity rubric 将 HOW 误计为 WHAT）
    ↓
设计修复（Subject Detection Gate — 先分类，再约束）
    ↓
验证修复（G1 从 8.4 → 4.6；控制组维持 7.4；未误伤）
    ↓
交付产品功能（Warning Card — 用户在界面上看到 ⚠ SUBJECT MISSING）
```

每一步都有数据，每一个决策都可以被审计。

这个项目让我意识到：**AI 系统最大的风险，往往不是模型出错，而是团队不知道模型什么时候出错。**

构建可靠 AI 系统的核心能力，不是写更好的 Prompt，而是知道当前 Prompt 在什么情况下会失效——并把这种知识变成可重复的检测机制。
