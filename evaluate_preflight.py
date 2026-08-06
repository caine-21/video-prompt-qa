"""evaluate_preflight.py — unified machine-readable evaluation entry.

The SINGLE source of truth for preflight eval numbers (offline, stdlib only).

It:
  1. loads the fixed manifest  data/preflight_records_seed_v1.json  (36 records)
  2. validates record count + schema against data/preflight_record_schema_v0.json
  3. re-runs the current risk analysis: rubric rule -> decision using the exact
     aggregation of scripts/run_preflight_harness.mjs (impact->decision, then
     decision priority needs_review > revise_first > generate_ok)
  4. computes unified metrics (decision distribution, tag frequency)
  5. checks invariants (count, schema, enum, rubric-consistency, tag<->rule identity)
  6. includes the subject-gate evidence (tests/subject-gate-validation.json) and
     reports the CASE_STUDY number conflict as a finding — CASE_STUDY must NOT
     keep a second set of numbers
  7. writes ONE JSON report (data/reports/preflight_eval_report.json) + a short
     Markdown summary

Shadow revision benchmark: no audited human-revised prompt samples exist, so it
is reported as FUTURE (never fabricated).

Run:  py evaluate_preflight.py        (no API keys, no network)
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "data" / "preflight_records_seed_v1.json"
RUBRIC = ROOT / "data" / "preflight_rubric_v0.json"
SCHEMA = ROOT / "data" / "preflight_record_schema_v0.json"
SUBJECT_GATE = ROOT / "tests" / "subject-gate-validation.json"
REPORT_JSON = ROOT / "data" / "reports" / "preflight_eval_report.json"
REPORT_MD = ROOT / "data" / "reports" / "preflight_eval_report.md"

EXPECTED_RECORD_COUNT = 36

# Harness-identical aggregation (scripts/run_preflight_harness.mjs)
IMPACT_TO_DECISION = {
    "allow": "generate_ok",
    "revise_first": "revise_first",
    "warn": "needs_review",
    "do_not_generate_yet": "needs_review",
}
DECISION_PRIORITY = {"generate_ok": 1, "unknown": 2, "revise_first": 3, "needs_review": 4}
DECISION_ENUM = {"generate_ok", "revise_first", "needs_review"}


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def records_from_manifest(manifest: dict) -> list[dict]:
    data = manifest.get("records")
    if not isinstance(data, list):
        raise ValueError(f"manifest has no 'records' array: {manifest.get('version')}")
    return data


def recompute_decision(record: dict, rules_by_tag: dict[str, dict]) -> tuple[str, list[str]]:
    """Re-derive the decision from matched rubric rules (harness-identical)."""
    decisions: list[str] = []
    fired: list[str] = []
    for tag in record.get("matched_rule_ids") or []:
        rule = rules_by_tag.get(tag)
        if rule is None:
            continue  # handled as unknown-tag below
        decisions.append(IMPACT_TO_DECISION[rule["should_generate_impact"]])
        fired.append(tag)
    if not decisions:
        return "needs_review", fired  # conservative default (harness: unknown)
    worst = max(decisions, key=lambda d: DECISION_PRIORITY[d])
    return worst, fired


def validate_record_schema(record: dict, schema: dict) -> list[str]:
    """Return a list of schema errors for one record."""
    errors: list[str] = []
    required = set(schema.get("required_fields", []))
    for field in sorted(required - set(record)):
        errors.append(f"missing required field: {field}")
    dec = record.get("should_generate_decision")
    if dec is not None and dec not in DECISION_ENUM:
        errors.append(f"invalid should_generate_decision: {dec!r}")
    return errors


def subject_gate_report() -> dict:
    """Read tests/subject-gate-validation.json; surface gate results + CASE_STUDY conflict."""
    data = load_json(SUBJECT_GATE)
    records = data.get("records", data) if isinstance(data, dict) else data
    if not isinstance(records, list):
        return {"status": "unsupported", "detail": "unexpected subject-gate file shape"}

    verdicts = {r.get("id"): r.get("verdict") for r in records if isinstance(r, dict)}
    violated = sorted(k for k, v in verdicts.items() if v and "VIOLATED" in str(v).upper())
    respected = sorted(k for k, v in verdicts.items() if v and "RESPECTED" in str(v).upper())
    not_triggered = sorted(
        k for k, v in verdicts.items() if v and "NOT TRIGGERED" in str(v).upper()
    )
    errors = sorted(k for k, v in verdicts.items() if v and "ERROR" in str(v).upper())

    return {
        "status": "ok",
        "total_records": len(records),
        "verdicts": verdicts,
        "gate_violated": violated,
        "gate_respected": respected,
        "not_triggered": not_triggered,
        "error_records": errors,
        "gate_violation_rate": round(
            len(violated) / max(len(records), 1), 3
        ),
        "case_study_conflict": {
            "finding": (
                "Historical conflict: CASE_STUDY.md claimed G1 dropped to Overall 4.6 / "
                "Specificity 2 after the gate, but persisted tests/subject-gate-validation.json "
                "records N-V++ (=G1) Overall 6.4 / Specificity 4, verdict GATE VIOLATED. "
                "Resolved 2026-08-07 by updating CASE_STUDY.md to the persisted numbers; "
                "persisted data + this report are the single source of truth."
            ),
            "status": "resolved",
            "persisted_g1_overall": "6.4",
            "persisted_g1_specificity": "4",
            "persisted_verdict": "GATE VIOLATED",
            "historical_case_study_claim": "4.6 / 2",
        },
    }


def build_report() -> dict:
    manifest = load_json(MANIFEST)
    rubric = load_json(RUBRIC)
    schema = load_json(SCHEMA)
    records = records_from_manifest(manifest)
    rules_by_tag = {r["risk_tag"]: r for r in rubric.get("rules", [])}

    per_record: list[dict] = []
    schema_errors = 0
    enum_violations = 0
    mismatches = 0
    tag_identity_violations = 0
    unknown_tags: Counter = Counter()
    status_counts = Counter()
    recomputed_dist: Counter = Counter()

    for rec in records:
        rid = rec.get("record_id", "?")
        errors = validate_record_schema(rec, schema)
        schema_errors += len(errors)
        if "invalid should_generate_decision" in " ".join(errors):
            enum_violations += 1

        recomputed, _ = recompute_decision(rec, rules_by_tag)
        recomputed_dist[recomputed] += 1
        if recomputed != rec.get("should_generate_decision"):
            mismatches += 1

        if sorted(rec.get("detected_risk_tags") or []) != sorted(rec.get("matched_rule_ids") or []):
            tag_identity_violations += 1

        for tag in rec.get("matched_rule_ids") or []:
            if tag not in rules_by_tag:
                unknown_tags[tag] += 1

        if errors or recomputed != rec.get("should_generate_decision"):
            status = "fail"
        else:
            status = "pass"
        status_counts[status] += 1
        per_record.append(
            {
                "record_id": rid,
                "status": status,
                "schema_errors": errors,
                "recompute": recomputed,
                "stored": rec.get("should_generate_decision"),
            }
        )

    decision_dist = dict(Counter(r["should_generate_decision"] for r in records))

    invariants = [
        {
            "id": "INV-01",
            "name": "record count",
            "passed": len(records) == EXPECTED_RECORD_COUNT,
            "detail": f"{len(records)} (expected {EXPECTED_RECORD_COUNT})",
        },
        {
            "id": "INV-02",
            "name": "schema (required fields + decision enum)",
            "passed": schema_errors == 0,
            "detail": f"{schema_errors} schema errors",
        },
        {
            "id": "INV-03",
            "name": "rubric-consistent decision recompute",
            "passed": mismatches == 0,
            "detail": f"{mismatches} recompute mismatches over {len(records)} records",
        },
        {
            "id": "INV-04",
            "name": "detected_risk_tags == matched_rule_ids",
            "passed": tag_identity_violations == 0,
            "detail": f"{tag_identity_violations} identity violations",
        },
        {
            "id": "INV-05",
            "name": "no unknown rubric rule referenced",
            "passed": sum(unknown_tags.values()) == 0,
            "detail": f"unknown tags: {dict(unknown_tags)}",
        },
    ]

    # generate_ok == 0 is a documented over-strict finding, not a hard failure
    known_limitations = []
    if decision_dist.get("generate_ok", 0) == 0:
        known_limitations.append(
            "No generate_ok decision in the 36-seed manifest — rubric is over-strict "
            "(docs/research/preflight_rubric_calibration_v1.md acknowledges this). "
            "Expected for a research seed, but it means no 'allow to generate' case is validated."
        )

    return {
        "report_version": "preflight_eval_report_v1",
        "manifest": {
            "path": str(MANIFEST.relative_to(ROOT)),
            "version": manifest.get("version"),
            "record_count": len(records),
            "expected_count": EXPECTED_RECORD_COUNT,
        },
        "schema_validation": {
            "total_errors": schema_errors,
            "enum_violations": enum_violations,
        },
        "risk_analysis": {
            "recompute_matches_stored": len(records) - mismatches,
            "recompute_mismatches": mismatches,
            "recomputed_distribution": dict(recomputed_dist),
            "tag_rule_identity_violations": tag_identity_violations,
            "unknown_rule_tags": dict(unknown_tags),
        },
        "metrics": {
            "stored_decision_distribution": decision_dist,
            "top_risk_tags": dict(
                Counter(t for r in records for t in (r.get("detected_risk_tags") or [])).most_common(10)
            ),
        },
        "invariants": invariants,
        "hard_pass": all(i["passed"] for i in invariants),
        "known_limitations": known_limitations,
        "subject_gate": subject_gate_report(),
        "shadow_revision_benchmark": {
            "status": "future",
            "reason": (
                "No audited human-revised prompt samples exist in the repo. "
                "The shadow revision benchmark (original prompt -> preflight risk -> "
                "human revision -> re-preflight -> risk decrease) is listed as FUTURE, "
                "not fabricated."
            ),
        },
        "per_record_summary": dict(status_counts),
        "per_record": per_record,
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# Preflight Evaluation Report",
        "",
        f"- manifest: `{report['manifest']['path']}` ({report['manifest']['record_count']} records)",
        f"- hard pass: **{report['hard_pass']}**",
        "",
        "## Metrics",
        "",
        "| metric | value |",
        "|---|---|",
    ]
    for k, v in report["metrics"]["stored_decision_distribution"].items():
        lines.append(f"| decision `{k}` | {v} |")
    lines.append(f"| recompute matches stored | {report['risk_analysis']['recompute_matches_stored']}/{report['manifest']['record_count']} |")
    lines.append(f"| schema errors | {report['schema_validation']['total_errors']} |")
    lines.append("")
    lines.append("## Invariants")
    for inv in report["invariants"]:
        lines.append(f"- `{inv['id']}` {inv['name']}: {'PASS' if inv['passed'] else 'FAIL'} — {inv['detail']}")
    lines.append("")
    lines.append("## Known limitations")
    for lim in report["known_limitations"]:
        lines.append(f"- {lim}")
    lines.append("")
    lines.append("## Subject gate")
    sg = report["subject_gate"]
    lines.append(f"- gate violated: {sg.get('gate_violated')}  (violation rate {sg.get('gate_violation_rate')})")
    lines.append(f"- gate respected: {sg.get('gate_respected')}")
    lines.append(f"- not triggered (control): {sg.get('not_triggered')}")
    lines.append(f"- error records: {sg.get('error_records')}")
    if sg.get("case_study_conflict"):
        lines.append(f"- **CASE_STUDY conflict**: {sg['case_study_conflict']['finding']}")
    lines.append("")
    lines.append("## Shadow revision benchmark")
    lines.append(f"- status: **{report['shadow_revision_benchmark']['status']}** — {report['shadow_revision_benchmark']['reason']}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    report = build_report()
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    REPORT_MD.write_text(render_markdown(report), encoding="utf-8")

    print(f"records: {report['manifest']['record_count']}  hard_pass: {report['hard_pass']}")
    print(f"decision dist (stored): {report['metrics']['stored_decision_distribution']}")
    print(f"recompute matches stored: {report['risk_analysis']['recompute_matches_stored']}/{report['manifest']['record_count']}  mismatches: {report['risk_analysis']['recompute_mismatches']}")
    print(f"schema errors: {report['schema_validation']['total_errors']}  per-record: {report['per_record_summary']}")
    print(f"subject gate violated: {report['subject_gate'].get('gate_violated')}  violation rate: {report['subject_gate'].get('gate_violation_rate')}")
    print(f"shadow benchmark: {report['shadow_revision_benchmark']['status']}")
    print(f"report json: {REPORT_JSON}")
    print(f"report md: {REPORT_MD}")
    return 0 if report["hard_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
