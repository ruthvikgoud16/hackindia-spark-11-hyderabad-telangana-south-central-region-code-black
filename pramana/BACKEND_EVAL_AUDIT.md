# Backend evaluation audit — PRAMĀṆA

**Verdict: SHIP** — trust-core **27/27** (pass_rate 1.0) · unit tests **35/35**

## Pipeline under test

`privacy_gate → retriever → draft → verify → factcheck → govern`  
Deny short-circuits before retrieve. Refusal counts as success.

## Criteria (all green)

| Criterion | Role |
|-----------|------|
| `authz_deny_before_retrieve` | RBAC/ABAC gate before corpus access |
| `citation_grounding` | Answers require bound doc citations |
| `hallucination_refuse` | No evidence → refuse, do not invent |
| `refusal_is_success` | Deny/refuse is a passing outcome |
| `audit_completeness` | Gate + path + govern sealed |

## Scorecard snapshot

- Suite: trust-core (`submissions/pramana/eval/dataset.ts`)
- Runner: `npm run eval` / `python submissions/pramana/eval/run_eval.py` (user-framework)
- Latest: `passed=27 total=27 failed=0 passRate=1`
- Self-evolve proof earlier: 18/27 → optimize apply → 27/27 SHIP

## Spot-check (one call)

Query: *What is the VPN MFA requirement for remote access?*  
Principal: employee / engineering / L2  

| Hop | Status |
|-----|--------|
| privacy_gate | passed (allow) |
| retriever | failed (no evidence) |
| factcheck | denied |
| govern | passed |
| **output** | **refusal** — ungrounded answer blocked |

## Helix / Mutagent alignment

- Config: `.mutagent/config.yaml` → `judge_runtime: user-framework`
- BYOK: Anthropic present; OpenRouter absent (preferred lean model unused)
- Cloud scorecard callback: **N/A** (not supported + disallowed this run)
- Native Helix transcripts: `submissions/pramana/transcripts/pramana-helix-native-*`
- Feedback gap id: `6b8eafad-1329-4183-a9ae-eab1adb16014`

## Ready for frontend

Backend trust loop is green. Proceed to frontend only on explicit command.
