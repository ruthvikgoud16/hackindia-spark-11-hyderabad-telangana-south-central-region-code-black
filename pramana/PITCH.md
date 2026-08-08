# PRAMĀṆA — Mutagent Hackathon Pitch

**Team folder:** `submissions/pramana`  
**One-liner:** Evidence-gated enterprise knowledge MultiAgent — *right person, right evidence, or a clean refusal.*

---

## The problem

Enterprise AI assistants **leak** (they retrieve before authorization) and **invent** (they answer without evidence). Most RAG stacks are retrieve-then-filter. That fails the moment a low-clearance user asks a high-sensitivity question.

**PRAMĀṆA** (Sanskrit: *means of valid knowledge*) inverts that: **deny and refuse are first-class successes.**

---

## What we built (headline: sophistication)

### Fixed trust pipeline (no shortcuts)

```
privacy_gate ──deny──▶ govern (log, no retrieve)
    │allow
    ▼
retriever (Hybrid GraphRAG — vector + knowledge graph, authorized corpus only)
    ▼
draft → verify → factcheck → govern
```

**Non-negotiable:** retrieval never runs before an authz decision exists.

### Named agents (single responsibility)

| Agent | Job |
|--------|-----|
| `privacy_gate` | RBAC/ABAC + adversarial prompt resistance |
| `retriever` | Ticket-scoped hybrid GraphRAG |
| `draft` | Grounded generation only |
| `verify` | Claim ↔ evidence binding |
| `factcheck` | Unsupported ⇒ REFUSE (not hedge) |
| `govern` | Provenance, trust score, audit seal (always last) |

### Real jobs · tools · triggers · integrations

**Tools (audited bus):** `policy.check`, `corpus.search`, `graph.expand`, `claims.extract`, `evidence.bind`, `hallucination.scan`, `audit.seal`, `notify.compliance`, `compass.verify`

**Triggers:** interactive API, webhook, Slack mention, API job, schedule (`POST /v1/trigger`)

**Integrations:** Compass Program as **judge-only** validation (never auto-fixes); optional lean LLM polish (OpenRouter GPT-4o-mini / Anthropic Haiku) **only after** gate allow + grounded draft

**Product surface:** role-based signup/login (employee · analyst · manager · compliance), dark chat workspace, model picker, live **inspection** (trust score, hops, citations), persisted chat history + account settings

---

## Self-evolving loop (closed EDD)

We ran the Mutagent loop for real:

1. **BUILD** — AgentSpec → TypeScript MultiAgent + HTTP API + frontend  
2. **EVALUATE** — user-framework judge → **27/27** trust-core (pass_rate **1.0**)  
3. **GOVERN** (*extension*) — classify PASS / TRUST / QUALITY / SHIP (judge-only)  
4. **DIAGNOSE** — green path → SHIP; red path → OPTIMIZE  
5. **OPTIMIZE** — gated apply  

**Multi-round self-evolve proof** (`npm run edd:evolve`):

| Round | Result | Action |
|-------|--------|--------|
| 1 | **18/27 FAIL** | Injected authz regression (`allow = true`) |
| Diagnose | route **OPTIMIZE** | Root cause: privacy_gate bypass |
| Apply | restore allow predicate | Explicit operator approval via `edd:evolve` |
| 2 | **27/27 PASS** | **SHIP** |

Artifacts: `transcripts/pramana-evolve-*`, `.mutagent/diagnostics|optimize|evaluator/runs/…`

---

## Greatest extension (bonus): `*govern` / `*pramana-trust`

Helix skill: **`pramana-govern`** (installed under `.claude/skills/` + `.agents/skills/`, routed in Helix).

Sits **between** `*evaluate` and `*diagnose`. Classifies failing/borderline traces as:

- **TRUST-DECISION** failures (authz / refusal / citation) vs  
- **OUTPUT-QUALITY** failures  

Then routes diagnosis accordingly. **Judge-never-fix holds** — no mutation of the agent.

Also shipped: Cursor rule `.cursor/rules/pramana.mdc` so dual-session (Cursor + Helix) stays on the five binary criteria.

---

## Proof it works

### Five binary eval criteria

| Criterion | Pass means |
|-----------|------------|
| `authz_deny_before_retrieve` | Denied queries never call the retriever |
| `citation_grounding` | Every claim maps to ≥1 authorized evidence id |
| `hallucination_refuse` | Unsupported ⇒ REFUSE |
| `refusal_is_success` | Expected refuse/deny fixtures score PASS |
| `audit_completeness` | Every hop logged |

### Dataset + scorecard

- **≥ 20 items:** **27** trust-core cases in `eval/dataset.ts`  
- **Scorecard:** `eval/scorecard.json` → **27/27**, `passRate: 1`  
- **Unit tests:** `npm test` → **35/35**  
- Mirrored for Helix: `.mutagent/eval/scorecard.json`

### Dual proof (Burak-aligned)

1. Deterministic harness scorecard (user-framework)  
2. Helix local-jsonl traces + native Claude Code Helix session JSONL  

---

## Product feedback (filed)

| ID | Category | Point |
|----|----------|--------|
| `f02183bc-…` | cli | Cursor dual-session Helix gap |
| `75c770c0-…` | stage:evaluate | `refusal_is_success` dataset schema |
| `412a54c7-…` | helix | `*govern` trust vs quality stage ask |
| `6b8eafad-…` | stage:evaluate | No public scorecard upload/callback API |

See `FEEDBACK_LOG.md`.

---

## How judges can run it

```bash
# from repo root (or after copying submissions/pramana into a Helix workspace)
cd submissions/pramana/../..   # project root with package.json
npm install
npm test
npm run eval          # expect 27/27
npm start             # API http://localhost:8787
npm run dev:web       # UI  http://localhost:5173
npm run edd:evolve    # self-evolve demo (fail → apply → pass)
```

Role-based UI: sign up with a role → log in with the **same** role (mismatch ⇒ 403) → chat under that clearance → open Inspection.

Helix: `*mutagent` → `*evaluate` → `*govern` → SHIP or `*diagnose` → `*optimize` (approval-gated).

---

## Why this maxes Mutagent

| Win track | How we hit it |
|-----------|----------------|
| Sophisticated agent | 6 agents, 9 tools, 5 triggers, GraphRAG, RBAC/ABAC, Compass judge-only, chat product |
| Self-evolve | Documented fail→diagnose→apply→re-eval with artifacts |
| Extension | `*govern` / pramana-govern skill between evaluate and diagnose |
| Proof | 5 criteria · 27 cases · 27/27 scorecard · native Helix JSONL |
| Feedback | 4 actionable CLI feedbacks filed |

**Deny is not a failure. Refusal is a feature. Evidence is the product.**
