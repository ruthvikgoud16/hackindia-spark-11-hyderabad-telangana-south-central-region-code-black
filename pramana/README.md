# PRAMĀṆA

**Evidence-gated enterprise knowledge multi-agent** for the [Mutagent](https://mutagent.io) hackathon.

> Truth is not assumed. It is proven.  
> **Deny / refuse = PASS.**

Built by students of **Keshav Memorial Institute of Technology (KMIT)**.

| Role | Name |
|------|------|
| Backend | **Ruthvik Goud** |
| Frontend | **Monisha Sarai** |
| DevOps | **Rohith** |

---

## Judge pack (start here)

| Document | Link |
|----------|------|
| **Architecture PDF** | [files/PRAMANA_Architecture.pdf](./files/PRAMANA_Architecture.pdf) |
| **Audit report PDF** (tests · eval · backend · project) | [files/PRAMANA_Audit_Report.pdf](./files/PRAMANA_Audit_Report.pdf) |
| Judge pack index | [files/INDEX.md](./files/INDEX.md) |
| One-pager | [files/JUDGE_ONE_PAGER.md](./files/JUDGE_ONE_PAGER.md) |
| Quick start / demo script | [files/JUDGE_QUICKSTART.md](./files/JUDGE_QUICKSTART.md) |
| Response examples (answer · deny · refuse) | [files/RESPONSE_EXAMPLES.md](./files/RESPONSE_EXAMPLES.md) |
| Eval scorecard summary | [files/EVAL_SCORECARD_SUMMARY.md](./files/EVAL_SCORECARD_SUMMARY.md) |
| Pitch | [PITCH.md](./PITCH.md) |
| Live scorecard JSON | [eval/scorecard.json](./eval/scorecard.json) |

**Latest local proof:** unit tests **35/35** · trust-core eval **27/27** (`passRate: 1.0`) · self-evolve **18/27 → 27/27 SHIP**.

---

## What it is

PRAMĀṆA authorizes **before** retrieval, grounds every claim in authorized evidence, and treats policy-correct denial and hallucination refusal as **successful** outcomes.

### Fixed pipeline

```
privacy_gate ──deny──▶ govern (log, no retrieve)
     │allow
     ▼
retriever (Hybrid GraphRAG) → draft → verify → factcheck → govern
```

### Five binary eval criteria

| Criterion | Pass means |
|-----------|------------|
| `authz_deny_before_retrieve` | Denied queries never call the retriever |
| `citation_grounding` | Every claim maps to ≥1 authorized evidence id |
| `hallucination_refuse` | Unsupported ⇒ REFUSE, not hedge |
| `refusal_is_success` | Expected refuse/deny fixtures score PASS |
| `audit_completeness` | Every hop logged (agent, decision, evidence refs) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Agents** | 6 named single-responsibility agents · Hybrid GraphRAG (vector + KG) · RBAC / ABAC |
| **Orchestration** | Deterministic TypeScript orchestrator · audited ToolBus · deny short-circuit before retrieve |
| **Backend** | Node.js · Express 5 · TypeScript · Zod · `tsx` |
| **Frontend** | React 19 · Vite · Tailwind CSS · Lucide · Cormorant + Inter |
| **Auth** | Supabase Auth OAuth (Google / GitHub) → PRAMĀṆA session bridge (`POST /auth/supabase`) |
| **Eval** | User-framework deterministic judge · `eval/dataset.ts` (27 cases) · `eval/scorecard.json` |
| **Lifecycle** | Mutagent Helix — `*spec` → `*build` → `*evaluate` → `*govern` → `*diagnose` / `*optimize` |
| **Extension** | `helix-extension/pramana-govern` (`*govern` / `*redteam`) — trust vs quality, judge-only |
| **Feedback** | `mutagent feedback send` (UI dock + CLI) |
| **Optional polish** | OpenRouter GPT-4o-mini / Anthropic Haiku — only **after** gate allow + grounded draft |
| **Reference** | Compass Program (judge-only validation signal; never auto-fixes) |

---

## Repository layout

```
submissions/pramana/                 ← this deliverable (PR scope)
├── backend/                         ← pipeline, auth, API (:8787)
│   ├── src/agents/                  ← privacy_gate · retriever · draft · verify · factcheck · govern
│   ├── src/orchestrator.ts
│   └── tests/pipeline.test.ts       ← 35 tests
├── frontend/                        ← sage UI (:5173)
├── eval/                            ← dataset + scorecard runner
├── files/                           ← judge PDFs + guides
├── traces/                          ← Helix-consumable JSONL
├── transcripts/                     ← main + subagent session packs
├── helix-extension/pramana-govern/  ← *govern skill
├── agent/cli.py                     ← one-shot spot-check CLI
├── agentspec.yaml
├── PITCH.md · SECURITY.md · …
└── .env.example                     ← templates only (no real keys)
```

Helix system install (`.agents/` / `.claude/` / `.codex/`) lives at the **workspace root** via `mutagent install helix` — not committed inside this folder.

---

## Quick start

```bash
cd submissions/pramana
cp .env.example .env.local
cp frontend/.env.example frontend/.env.local
# fill secrets locally — see SECRETS_SETUP.md

npm install
npm --prefix frontend install

npm test                 # → 35/35
npm run eval             # → 27/27, writes eval/scorecard.json
npm run dev              # API  → http://localhost:8787
npm run dev:web          # UI   → http://localhost:5173
```

From monorepo root (if using the workspace wrappers):

```bash
npm test && npm run eval
npm run dev
npm run dev:web
```

### Product flow

1. Open [http://localhost:5173](http://localhost:5173)  
2. **Login** → pick clearance role → Continue with Google / GitHub  
3. Chat → open **Inspection** (hops, citations, trust)  
4. Optional: Feedback dock → Mutagent product feedback  

OAuth redirect: `/oauth/callback` (must match Supabase Auth URL config).

### Demo paths for judges

| Path | Expect |
|------|--------|
| Authorized policy ask | `answer` + citations |
| Wrong-role / low-clearance sensitive ask | `refusal` · gate **denied** · retriever **skipped** |
| Invent / out-of-corpus ask | `refusal` · factcheck REFUSE |

---

## Links

| Resource | Link |
|----------|------|
| Architecture PDF | [files/PRAMANA_Architecture.pdf](./files/PRAMANA_Architecture.pdf) |
| Audit report PDF | [files/PRAMANA_Audit_Report.pdf](./files/PRAMANA_Audit_Report.pdf) |
| Judge pack index | [files/INDEX.md](./files/INDEX.md) |
| One-pager | [files/JUDGE_ONE_PAGER.md](./files/JUDGE_ONE_PAGER.md) |
| Quick start | [files/JUDGE_QUICKSTART.md](./files/JUDGE_QUICKSTART.md) |
| Response examples | [files/RESPONSE_EXAMPLES.md](./files/RESPONSE_EXAMPLES.md) |
| Eval summary | [files/EVAL_SCORECARD_SUMMARY.md](./files/EVAL_SCORECARD_SUMMARY.md) |
| Pitch | [PITCH.md](./PITCH.md) |
| Mutagent alignment | [MUTAGENT_ALIGNMENT.md](./MUTAGENT_ALIGNMENT.md) |
| Backend eval audit | [BACKEND_EVAL_AUDIT.md](./BACKEND_EVAL_AUDIT.md) |
| Security | [SECURITY.md](./SECURITY.md) |
| Secrets setup | [SECRETS_SETUP.md](./SECRETS_SETUP.md) |
| Feedback log | [FEEDBACK_LOG.md](./FEEDBACK_LOG.md) |
| AgentSpec | [agentspec.yaml](./agentspec.yaml) |
| Scorecard | [eval/scorecard.json](./eval/scorecard.json) |
| `*govern` skill | [helix-extension/pramana-govern/SKILL.md](./helix-extension/pramana-govern/SKILL.md) |
| Mutagent docs | https://docs.mutagent.io |
| Mutagent dashboard | https://app.mutagent.io |
| Mutagent CLI | https://docs.mutagent.io/cli |
| Supabase | https://supabase.com/dashboard |
| KMIT | https://www.kmit.in |

---

## Helix / self-evolve

```
*mutagent → *evaluate → *govern → SHIP
                       ↘ *diagnose → *optimize (approval-gated)
```

```bash
npm run edd:evolve    # documented fail → diagnose → apply → 27/27
```

Native packs: `transcripts/`. Traces: `traces/`.

---

## Security

- Real keys only in **gitignored** `.env.local`  
- Templates: `.env.example` / `frontend/.env.example`  
- Never commit DB URLs, OAuth client secrets, or Mutagent API keys  

---

## Team — KMIT

| Name | Focus |
|------|--------|
| **Ruthvik Goud** | Backend · pipeline · auth bridge · eval |
| **Monisha Sarai** | Frontend · UX · inspection studio |
| **Rohith** | DevOps · tooling · Mutagent / deploy hygiene |

College: **Keshav Memorial Institute of Technology (KMIT)**

---

## License / hackathon

Built for the **Mutagent** hackathon. Submit via PR to [`mutagent-io/mutagent-hackathon`](https://github.com/mutagent-io/mutagent-hackathon) under `submissions/pramana/`.
