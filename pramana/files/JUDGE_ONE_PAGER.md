# PRAMĀṆA — One-pager (judges)

**Evidence-gated enterprise knowledge MultiAgent**  
Keshav Memorial Institute of Technology (KMIT) · Mutagent Hackathon

> Truth is not assumed. It is proven.  
> **Deny / refuse = PASS.**

| Role | Name |
|------|------|
| Backend | Ruthvik Goud |
| Frontend | Monisha Sarai |
| DevOps | Rohith |

---

## Problem

Enterprise AI **leaks** (retrieve-before-authz) and **invents** (answers without evidence).  
PRAMĀṆA inverts that: authorization first, evidence always, refusal as success.

## Pipeline (non-negotiable order)

```
privacy_gate ──deny──▶ govern
     │allow
     ▼
retriever → draft → verify → factcheck → govern
```

Six named agents. No god-agent. No retrieve-then-filter.

## Proof (latest local run)

| Gate | Result |
|------|--------|
| Unit tests | **35/35** |
| Trust-core eval | **27/27** (passRate **1.0**) |
| Self-evolve | 18/27 FAIL → apply → **27/27 SHIP** |

Five criteria: `authz_deny_before_retrieve` · `citation_grounding` · `hallucination_refuse` · `refusal_is_success` · `audit_completeness`

## Product

- Sage UI chat + live **inspection** (hops, citations, trust)
- Supabase OAuth (Google / GitHub) + clearance roles
- Helix loop + bonus `*govern` (trust vs quality, judge-only)

## Run in 60 seconds

```bash
cd submissions/pramana
npm install && npm --prefix frontend install
npm test && npm run eval    # expect 35/35 and 27/27
npm run dev                 # API :8787
npm run dev:web             # UI  :5173
```

## Judge pack

- [PRAMANA_Architecture.pdf](./PRAMANA_Architecture.pdf)
- [PRAMANA_Audit_Report.pdf](./PRAMANA_Audit_Report.pdf)
- [JUDGE_QUICKSTART.md](./JUDGE_QUICKSTART.md)
