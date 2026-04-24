# CLAUDE.md — Mode Controller

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **This file is the single source of truth for active mode.**
> Do not edit manually. Use `switch-mode.sh` or `switch-mode.ps1`.

---

## ACTIVE MODE
<!-- SWITCH-TARGET -->
> ENGINEERING
<!-- END SWITCH-TARGET -->

---

## Core Principle

**Mode is ALWAYS user-defined. Claude must NEVER infer, guess, or auto-switch mode.**

```
USER sets MODE → CLAUDE obeys MODE strictly
```

Three rules, no exceptions:

1. **No inference rule** — Claude does not guess mode from context or task type
2. **Hard binding rule** — All behavior follows ACTIVE MODE exclusively
3. **Switch rule** — Mode changes only when the user explicitly requests it or edits the ACTIVE MODE block above

---

## Session Protocol

At the start of every session:

1. Read the ACTIVE MODE block above
2. Load the corresponding mode file (see table below)
3. Confirm in first response: `[MODE: ENGINEERING]` or equivalent
4. Operate exclusively under that mode's rules for the rest of the session

---

## Mode Reference

| Mode | File | Type | Purpose |
|---|---|---|---|
| `ENGINEERING` | `CLAUDE.engineering.md` | Core | Build — code, architecture, type correctness |
| `PRODUCT` | `CLAUDE.product.md` | Core | Communicate — evaluation design, interview, reasoning |
| `RESEARCH` | `CLAUDE.research.md` | Aux (sandbox) | Experiment — hypothesis, observation, never production |

**Core modes** are production environments. **Aux mode** is an isolated sandbox — findings from RESEARCH must not affect production directly.

---

## Mode CLI

`mode.sh` / `mode.ps1` is the single interface for all mode operations:

```bash
# Bash (Git Bash / WSL / Mac)
bash mode.sh get                               # show current mode + status
bash mode.sh set product                       # switch mode
bash mode.sh set research "debug edge case"    # switch with reason
bash mode.sh log                               # full switch history
bash mode.sh log --tail 5                      # last 5 entries

# PowerShell (Windows)
.\mode.ps1 get
.\mode.ps1 set product
.\mode.ps1 set research "debug edge case"
.\mode.ps1 log
.\mode.ps1 log --tail 5
```

`mode get` output example:
```
  Active Mode : ENGINEERING
  Type        : Core
  Mode File   : CLAUDE.engineering.md
  Last Switch : | 2026-04-24T12:00:00Z | PRODUCT → ENGINEERING | back to build |
```

Every `set` is a 6-step atomic transaction — any failure rolls back `CLAUDE.md` to `.bak` automatically.

**In RESEARCH mode**, wrap commands with the guard to enforce sandbox at the shell level:

```bash
bash research-guard.sh npm run dev        # allowed
bash research-guard.sh git commit -m "x"  # blocked → exit 1
.\research-guard.ps1 git push             # blocked (PowerShell)
```

---

## Safety Rules

Stop and surface before proceeding when:

| Condition | Required action |
|---|---|
| ACTIVE MODE line is missing or ambiguous | Stop. Ask user to run `switch-mode` to restore clean state |
| Multiple `> MODE` lines detected | Stop. Warn: "CLAUDE.md has conflicting mode declarations" |
| `CLAUDE.md` and `.bak` differ unexpectedly | Warn before any switch attempt |
| Request conflicts with active mode | Use Conflict Handling Protocol below |

---

## Conflict Handling Protocol

When a user request conflicts with the active mode, do not proceed silently and do not blend modes.

Respond with exactly this structure:

```
[MODE CONFLICT DETECTED]
Active Mode : [current mode]
Request type: [what was asked — one line]
Conflict    : [why this doesn't fit the active mode — one line]

To proceed, submit a mode override request:

[MODE OVERRIDE REQUEST]
Target Mode : [engineering | product | research]
Reason      : [why you need to switch]
Scope       : [what you will do in the new mode, then return or stay]
```

**The override request is a fill-in form, not a discussion.** Once submitted, Claude switches mode, confirms, and executes within the new mode's rules.

---

## Next.js Version Warning

This version has breaking changes from common training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.
