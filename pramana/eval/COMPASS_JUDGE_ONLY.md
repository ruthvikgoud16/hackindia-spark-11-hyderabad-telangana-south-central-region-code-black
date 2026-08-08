# Compass → MutagenT (judge-only)

Compass Program is the enterprise validation / fact-check engine (ground-truth chunks, claim verdicts, hallucination scoring).

## Invariant (Burak / ADLC)
- Compass **labels and scores** only.
- It must **never** call Helix apply / optimize / targets.
- Fixes only via Helix `*diagnose` → `*optimize` after human approval.

## How it fits PRAMĀṆA
| Lane | Owner | Output |
|---|---|---|
| Authz / deny-before-retrieve | `privacy_gate` + scorecard | deterministic PASS/FAIL |
| Citation / hallucination | `verify` + `factcheck` (+ optional Compass) | refuse or grounded answer |
| Helix Evaluate | Helix judges on JSONL traces | SHIP or DIAGNOSE suggestion |
| Compass | Optional deeper GT fact-check | report only — no mutate |

## Future (when wiring deeper)
Export Compass `VerificationReport` as a **sidecar score artifact** next to traces (e.g. `.mutagent/eval/compass-*.json`), joined by query/trace id — **not** invented fields inside Helix JSONL unless Burak documents a schema.
