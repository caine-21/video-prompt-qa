// ═════════════════════════════════════════════════════════════════════════════
// Architectural contract
//
//  Layer             Owner              Access
//  ──────────────    ───────────────    ──────────────────────────────────────
//  prompt            canonical English  LLM always receives English
//  domain schema     DIMENSIONS /       resolve("dimension.<name>", lang)
//                    ANATOMY_COMPONENTS resolve("anatomy.<name>", lang)
//  UI strings        t(key)             useLanguage() → t()
//
//  Rule: domain concept labels (dimension names, anatomy component names)
//  MUST NOT appear in the UI strings object below.
//  The domain schema is the single source of truth for concept translation.
//  UI strings handle grammar, chrome, labels, and states only.
//
//  Namespace convention (feature-based + layered):
//    ui.nav.*           global navigation / chrome
//    ui.loading.*       loading / async states
//    eval.ui.*          evaluate panel UI
//    eval.report.*      evaluation report UI
//    eval.domain.score.*  score quality labels (Strong / Acceptable / Needs Work)
//    cmp.ui.*           compare panel UI
//    cmp.report.*       compare report UI
//    fb.*               feedback widget
//    delta.*            delta banner
//    hist.*             history panel
//    anat.*             prompt anatomy UI
// ═════════════════════════════════════════════════════════════════════════════

export type Lang = "en" | "zh";

type Pair = { readonly en: string; readonly zh: string };
function ns<T extends Record<string, Pair>>(o: T) { return o; }

// ─── §1  Global nav / chrome ──────────────────────────────────────────────────
const UI_NAV = ns({
  "ui.nav.tagline":      { en: "Discover prompt failures before generation", zh: "生成前发现 Prompt 的失效模式" },
  "ui.nav.history":      { en: "History",        zh: "历史记录"  },
  "ui.nav.tab.evaluate":    { en: "Score a Prompt", zh: "评分"       },
  "ui.nav.tab.compare":     { en: "Compare A vs B", zh: "对比 A vs B" },
  "ui.nav.tab.tournament":  { en: "Tournament",     zh: "锦标赛"     },
  "ui.nav.error":        { en: "Error",           zh: "错误"      },
  "ui.nav.export":       { en: "↓ Export JSON",   zh: "↓ 导出 JSON" },
  "ui.nav.footer":       { en: "VideoPromptQA — Replace intuition with experiments", zh: "VideoPromptQA — 用实验替代直觉" },
});

// ─── §2  Async / loading states ───────────────────────────────────────────────
const UI_LOADING = ns({
  "ui.loading.analyzing": { en: "Analyzing via",        zh: "正在通过"    },
  "ui.loading.improving": { en: "Rewriting & re-scoring", zh: "重写并重新评分" },
});

// ─── §3  Evaluate panel UI ────────────────────────────────────────────────────
const EVAL_UI = ns({
  "eval.ui.title":       { en: "Enter your video prompt",  zh: "输入您的视频提示词" },
  "eval.ui.try":         { en: "Try an example:",          zh: "试试示例：" },
  "eval.ui.example":     { en: "Example",                  zh: "示例" },
  "eval.ui.placeholder": { en: "Describe your video scene — subject, action, style, lighting, camera movement...", zh: "描述您的视频场景——主体、动作、风格、光影、镜头运动..." },
  "eval.ui.chars":       { en: "chars",                    zh: "字符" },
  "eval.ui.submit":      { en: "Score This Prompt →",      zh: "评分 →" },
  "eval.ui.loading":     { en: "Analyzing...",             zh: "分析中..." },
});

// ─── §4  Evaluation domain — score quality labels ─────────────────────────────
//  Note: dimension names live in domain schema (DIMENSIONS below), not here.
const EVAL_DOMAIN = ns({
  "eval.domain.score.strong":     { en: "Strong",     zh: "优秀"   },
  "eval.domain.score.acceptable": { en: "Acceptable", zh: "合格"   },
  "eval.domain.score.needswork":  { en: "Needs Work", zh: "需改进" },
});

// ─── §5  Evaluation report UI ─────────────────────────────────────────────────
const EVAL_REPORT = ns({
  "eval.report.overall":       { en: "Overall Score — via",   zh: "总分 — 通过" },
  "eval.report.prompt":        { en: "Evaluated Prompt",      zh: "已评估提示词" },
  "eval.report.dimensions":    { en: "Dimension Analysis",    zh: "维度分析" },
  "eval.report.improve.cta":   { en: "Let AI fix the weak points automatically", zh: "让 AI 自动修复薄弱点" },
  "eval.report.improve.sub":   { en: "Rewrites your prompt using the dimension feedback, then re-scores it", zh: "根据维度反馈重写提示词，然后重新评分" },
  "eval.report.improve.btn":   { en: "✦ AI Improve This Prompt", zh: "✦ AI 优化提示词" },
  "eval.report.improve.busy":  { en: "Improving...",          zh: "优化中..." },
  "eval.report.improvements":  { en: "Improvements",          zh: "改进建议" },
  "eval.report.edgecases":     { en: "Edge Cases Detected",   zh: "检测到边界情况" },
  "eval.report.noedge":        { en: "No edge cases detected.", zh: "未检测到边界情况。" },
  "eval.report.negprompts":    { en: "Negative Prompts — Add these to avoid common failures", zh: "负向提示词 — 添加这些以避免常见失效" },
  "eval.report.copyall":       { en: "Copy All",              zh: "全部复制" },
  "eval.report.copied":        { en: "Copied!",               zh: "已复制！" },
});

// ─── §6  Compare panel UI ─────────────────────────────────────────────────────
const CMP_UI = ns({
  "cmp.ui.promptA":       { en: "Prompt A — Your best version",    zh: "提示词 A — 您的最佳版本" },
  "cmp.ui.promptB":       { en: "Prompt B — Your challenger",      zh: "提示词 B — 挑战者" },
  "cmp.ui.placeholder.a": { en: "Enter your stronger prompt here...", zh: "输入您更强的提示词..." },
  "cmp.ui.placeholder.b": { en: "Enter the prompt you want to test against A...", zh: "输入您想与 A 对比的提示词..." },
  "cmp.ui.submit":        { en: "Run Comparison →",                zh: "运行对比 →" },
  "cmp.ui.loading":       { en: "Comparing...",                    zh: "对比中..." },
});

// ─── §7  Compare report UI ────────────────────────────────────────────────────
const CMP_REPORT = ns({
  "cmp.report.result":  { en: "Result — via",    zh: "结果 — 通过" },
  "cmp.report.tie":     { en: "It's a Tie",      zh: "平局" },
  "cmp.report.winA":    { en: "Prompt A Wins",   zh: "提示词 A 获胜" },
  "cmp.report.winB":    { en: "Prompt B Wins",   zh: "提示词 B 获胜" },
  "cmp.report.scoreA":  { en: "Score A",         zh: "A 得分" },
  "cmp.report.scoreB":  { en: "Score B",         zh: "B 得分" },
  "cmp.report.winnerA": { en: "★ Winner — Prompt A", zh: "★ 获胜 — 提示词 A" },
  "cmp.report.winnerB": { en: "★ Winner — Prompt B", zh: "★ 获胜 — 提示词 B" },
  "cmp.report.labelA":  { en: "Prompt A",        zh: "提示词 A" },
  "cmp.report.labelB":  { en: "Prompt B",        zh: "提示词 B" },
  "cmp.report.why":     { en: "Why",             zh: "原因" },
});

// ─── §8  Feedback widget ──────────────────────────────────────────────────────
const FEEDBACK = ns({
  "fb.question":    { en: "Did the rewrite actually improve the prompt?", zh: "重写真的改善了提示词吗？" },
  "fb.ready":       { en: "Compare both prompts above, then rate.",       zh: "对比上方两个提示词，然后评分。" },
  "fb.wait":        { en: "Read both prompts first — rating unlocks in",  zh: "请先阅读两个提示词 — 评分将在" },
  "fb.waitsuffix":  { en: "s",                                            zh: " 秒后解锁" },
  "fb.rating.1":    { en: "Clearly better",  zh: "明显更好"   },
  "fb.rating.2":    { en: "Slightly better", zh: "略有改善"   },
  "fb.rating.3":    { en: "No improvement",  zh: "没有改善"   },
  "fb.wrong":       { en: "What went wrong? (optional)", zh: "哪里出了问题？（可选）" },
  "fb.tag.unclear": { en: "Still unclear",      zh: "仍然不清晰" },
  "fb.tag.generic": { en: "Too generic",        zh: "太笼统"    },
  "fb.tag.focus":   { en: "Changed wrong thing", zh: "改错了地方" },
  "fb.tag.verbose": { en: "Became too long",    zh: "变得太长"   },
  "fb.submit":      { en: "Submit Feedback",    zh: "提交反馈"   },
  "fb.done":        { en: "Feedback recorded — this helps calibrate the evaluator.", zh: "反馈已记录 — 这有助于校准评估器。" },
});

// ─── §9  Delta banner ─────────────────────────────────────────────────────────
const DELTA = ns({
  "delta.title":    { en: "✦ AI Improvement Complete", zh: "✦ AI 优化完成"  },
  "delta.before":   { en: "Before",                    zh: "之前"           },
  "delta.after":    { en: "After",                     zh: "之后"           },
  "delta.original": { en: "Original prompt",           zh: "原始提示词"     },
});

// ─── §10  History panel ───────────────────────────────────────────────────────
const HISTORY = ns({
  "hist.empty":       { en: "No evaluations yet — score a prompt to start building history", zh: "暂无评分记录 — 评分一个提示词以开始构建历史" },
  "hist.title":       { en: "History",       zh: "历史记录"   },
  "hist.eval":        { en: "evaluation",    zh: "条评分"    },
  "hist.evals":       { en: "evaluations",   zh: "条评分"    },
  "hist.showing":     { en: "Showing",       zh: "显示"      },
  "hist.all":         { en: "All",           zh: "全部"      },
  "hist.negative":    { en: "👎 Only",       zh: "👎 仅显示" },
  "hist.sort.recent": { en: "Sort: Recent",  zh: "排序：最新"   },
  "hist.sort.delta":  { en: "Sort: Δ Score", zh: "排序：Δ 分数" },
  "hist.clear":       { en: "Clear All",     zh: "清除全部"   },
  "hist.nonegative":  { en: "No negative-feedback entries yet", zh: "暂无负向反馈记录" },
  "hist.ago.now":     { en: "just now",      zh: "刚刚"     },
  "hist.ago.m":       { en: "m ago",         zh: "分钟前"   },
  "hist.ago.h":       { en: "h ago",         zh: "小时前"   },
  "hist.ago.d":       { en: "d ago",         zh: "天前"     },
});

// ─── §11  Prompt anatomy UI ───────────────────────────────────────────────────
//  Note: component names (Subject, Camera…) live in domain schema, not here.
const ANATOMY_UI = ns({
  "anat.title":          { en: "Prompt Anatomy", zh: "提示词解析" },
  "anat.components":     { en: "Components",     zh: "个组件"    },
  "anat.present":        { en: "present",        zh: "已有"      },
  "anat.partial":        { en: "partial",        zh: "部分"      },
  "anat.absent":         { en: "absent",         zh: "缺失"      },
  "anat.status.present": { en: "Present",        zh: "已有"      },
  "anat.status.partial": { en: "Partial",        zh: "部分"      },
  "anat.status.absent":  { en: "Absent",         zh: "缺失"      },
  "anat.unspecified":    { en: "not specified",  zh: "未指定"    },
});

// ─── §12  Tournament UI ───────────────────────────────────────────────────────
const TOURNAMENT_UI = ns({
  "trn.ui.subtitle":       { en: "Rank 2–5 prompts by head-to-head comparison — relative judgment is more reliable than absolute scoring", zh: "通过两两对比排名 2–5 个提示词 — 相对判断比绝对评分更可靠" },
  "trn.ui.promptlabel":    { en: "Prompt",           zh: "提示词"      },
  "trn.ui.addprompt":      { en: "+ Add Prompt",     zh: "+ 添加提示词" },
  "trn.ui.removeprompt":   { en: "Remove",           zh: "删除"        },
  "trn.ui.submit":         { en: "Run Tournament →", zh: "运行锦标赛 →" },
  "trn.ui.loading":        { en: "Running matchups...", zh: "对比进行中..." },
  "trn.report.champion":   { en: "Champion",         zh: "冠军"        },
  "trn.report.leaderboard":{ en: "Leaderboard",      zh: "排行榜"      },
  "trn.report.rank":       { en: "Rank",             zh: "排名"        },
  "trn.report.wins":       { en: "Wins",             zh: "胜"          },
  "trn.report.losses":     { en: "Losses",           zh: "负"          },
  "trn.report.ties":       { en: "Ties",             zh: "平"          },
  "trn.report.avgscore":   { en: "Avg Score",        zh: "平均分"      },
  "trn.report.matchups":   { en: "All Matchups",     zh: "全部对局"    },
  "trn.report.via":        { en: "via",              zh: "通过"        },
  "trn.report.match":      { en: "Match",            zh: "对局"        },
  "trn.report.matches":    { en: "Matches",          zh: "对局"        },
});

// ─── §12.5  Model Fit ──────────────────────────────────────────────────────────
const MODELFIT_UI = ns({
  "mf.title":      { en: "Model Fit — Which AI video tool to use", zh: "模型适配 — 选择合适的 AI 视频工具" },
  "mf.bestmatch":  { en: "Best Match",  zh: "最佳匹配" },
});

// ─── §13  Subject Warning Card ────────────────────────────────────────────────
const WARN_UI = ns({
  "warn.absent.title":      { en: "SUBJECT MISSING",    zh: "主体缺失" },
  "warn.placeholder.title": { en: "SUBJECT UNCLEAR",    zh: "主体不明确" },
  "warn.absent.body":       { en: "This prompt describes cinematography technique but does not specify what is being filmed. An AI video model will generate random content.", zh: "这个提示词描述了摄影技法，但未指定拍摄对象。AI 视频模型将随机生成内容。" },
  "warn.placeholder.body":  { en: "The subject is a placeholder with no referent. Specificity cannot be assessed without knowing what is being filmed.", zh: "主体是占位符，没有实际指代。在不知道拍摄什么的情况下，无法评估具体性。" },
  "warn.examples.label":    { en: "Add a specific subject, e.g.", zh: "添加具体主体，例如" },
  "warn.impact.label":      { en: "Expected impact",    zh: "预期效果" },
  "warn.impact.value":      { en: "Specificity +3–5",   zh: "具体性 +3–5" },
  "warn.impact.suffix":     { en: "points after adding a subject", zh: "分（添加主体后）" },
});

// ─── §14  Landing Hero ───────────────────────────────────────────────────────
const HERO_UI = ns({
  "hero.statement":       { en: "Reliability is not a model property. It's an engineering process.\nThis project turns AI evaluation failures into measurable experiments, validated fixes, and production safeguards.", zh: "可靠性不是模型属性，而是工程过程。\n本项目将 AI 评测失效转化为可测量实验、可验证修复和生产级护栏。" },
  "hero.step.find":       { en: "Find",        zh: "发现" },
  "hero.step.experiment": { en: "Experiment",  zh: "实验" },
  "hero.step.rootcause":  { en: "Root Cause",  zh: "根因" },
  "hero.step.fix":        { en: "Fix",         zh: "修复" },
  "hero.step.validate":   { en: "Validate",    zh: "验证" },
  "hero.step.ship":       { en: "Ship",        zh: "上线" },
  "hero.badge.cases":     { en: "15 adversarial cases",      zh: "15 个对抗用例" },
  "hero.badge.experiment":{ en: "3×3 controlled experiment", zh: "3×3 受控实验" },
  "hero.badge.gate":      { en: "1 production safeguard",    zh: "1 个生产级护栏" },
  "hero.divider":         { en: "Try it yourself",           zh: "试试看" },
});

// ─── Master lookup ────────────────────────────────────────────────────────────
const ALL_STRINGS = {
  ...UI_NAV, ...UI_LOADING,
  ...EVAL_UI, ...EVAL_DOMAIN, ...EVAL_REPORT,
  ...CMP_UI, ...CMP_REPORT,
  ...FEEDBACK, ...DELTA, ...HISTORY, ...ANATOMY_UI,
  ...TOURNAMENT_UI, ...MODELFIT_UI, ...WARN_UI, ...HERO_UI,
} as const;

export type UiKey = keyof typeof ALL_STRINGS;

export function t(key: UiKey, lang: Lang): string {
  return ALL_STRINGS[key][lang];
}

// ═════════════════════════════════════════════════════════════════════════════
// Domain schema
//
//  Two-principle architecture:
//    namespace  = UI layout  (tells the UI *where* to use a string)
//    resolve()  = domain semantics  (tells the system *what* a concept is)
//  These two layers must never merge. A namespace key never describes a domain
//  concept; a resolve path never describes a UI position.
//
//  Single source of truth for evaluation dimensions and anatomy components.
//  Keys match the English strings returned by the LLM (prompt stays canonical
//  English; the UI layer calls resolve() to get the localised display label).
//
//  To add a field (description, tooltip, colour…): extend DomainLabel here.
//  To add a new concept type: call registerDomainResolver() — do NOT add a
//  new case to resolve() itself.
//  Components always call resolve() — never hardcode translations inline.
// ═════════════════════════════════════════════════════════════════════════════
export interface DomainLabel {
  /** Canonical key — must match the English string the LLM returns */
  key: string;
  label: { en: string; zh: string };
}

export const DIMENSIONS: readonly DomainLabel[] = [
  { key: "Clarity",               label: { en: "Clarity",               zh: "清晰度"    } },
  { key: "Specificity",           label: { en: "Specificity",           zh: "具体性"    } },
  { key: "Technical Feasibility", label: { en: "Technical Feasibility", zh: "技术可行性" } },
  { key: "Cinematic Quality",     label: { en: "Cinematic Quality",     zh: "电影质感"   } },
  { key: "Creativity",            label: { en: "Creativity",            zh: "创意"      } },
] as const;

export const ANATOMY_COMPONENTS: readonly DomainLabel[] = [
  { key: "Subject",  label: { en: "Subject",  zh: "主体" } },
  { key: "Action",   label: { en: "Action",   zh: "动作" } },
  { key: "Style",    label: { en: "Style",    zh: "风格" } },
  { key: "Lighting", label: { en: "Lighting", zh: "光影" } },
  { key: "Camera",   label: { en: "Camera",   zh: "镜头" } },
  { key: "Mood",     label: { en: "Mood",     zh: "氛围" } },
  { key: "Duration", label: { en: "Duration", zh: "时长" } },
] as const;

// ─── Registry-driven resolver ─────────────────────────────────────────────────
//  Each domain type owns its lookup logic. resolve() is a stable dispatcher —
//  it never grows a new case. To add "score", "model", "run", etc.:
//    registerDomainResolver("score", (name, lang) => ...)
//  That's the only change required — resolve() is untouched.
// ─────────────────────────────────────────────────────────────────────────────
type DomainResolver = (canonicalName: string, lang: Lang) => string;

const DOMAIN_REGISTRY: Record<string, DomainResolver> = {
  dimension: (name, lang) => DIMENSIONS.find(d => d.key === name)?.label[lang] ?? name,
  anatomy:   (name, lang) => ANATOMY_COMPONENTS.find(a => a.key === name)?.label[lang] ?? name,
};

/**
 * Register a domain resolver without modifying resolve().
 * Call from the module that owns the domain type.
 *
 * @example
 * registerDomainResolver("model", (name, lang) => MODELS.find(m => m.key === name)?.label[lang] ?? name);
 */
export function registerDomainResolver(type: string, resolver: DomainResolver): void {
  DOMAIN_REGISTRY[type] = resolver;
}

/**
 * Resolve a domain concept label to a localised string.
 * Stable dispatcher — delegates to the registered resolver for the type.
 *
 * @param path  "{type}.{canonical-name}"  e.g. "dimension.Clarity"
 *                                              "anatomy.Subject"
 * @param lang  display language
 */
export function resolve(path: string, lang: Lang): string {
  const dot = path.indexOf(".");
  if (dot === -1) return path;
  const type = path.slice(0, dot);
  const name = path.slice(dot + 1);
  return DOMAIN_REGISTRY[type]?.(name, lang) ?? name;
}
