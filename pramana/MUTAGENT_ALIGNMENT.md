# PRAMĀṆA × MutagenT — how we follow the plan (Burak-aligned)

## Problem we solve
Enterprise AI leaks and invents. PRAMĀṆA is an **evidence-gated** MultiAgent:

**Privacy → Hybrid GraphRAG → Draft → Verify → Factcheck → Govern**  
Deny before retrieve. Ungrounded → refuse. **Correct refusal = success.**

## What Burak confirmed (hackathon path)

| Topic | Decision we follow |
|---|---|
| Harness | Plugin (Claude Code/Codex) **or** Pi / Oh My Pi BYOK — our choice. Platform BYOK ≠ Plugin (yet). |
| Proof for judges | **Both**: Helix-shaped local JSONL traces **and** harness-native deterministic scorecard, mapped to `agentspec.yaml` → `evaluation.datasets` |
| Artifacts to commit | **`.mutagent/`** (AgentSpec, eval runs, diagnostics) |
| Transcripts | Main Helix session **+ every subagent** JSONL |
| Evaluate invariant | Judge-only → SHIP or route to DIAGNOSE. **Never fixes.** |
| Custom trust extension | Stay **outside** Evaluate as judge-only (`*govern` / `*pramana-trust`). Do **not** auto-apply or break EDD. |
| Optimize | Only after approval; Diagnostics propose, Optimize applies. |
| AgentSpec | Design intent under `.mutagent/spec/` — portable across Mastra/DeepAgents/harnesses |
| Feedback | `mutagent feedback send "..."` / Helix `*feedback` |

## Dual proof (what we ship)

1. **Deterministic scorecard** (harness-native)  
   `npm test` / `npm run eval` → `submissions/pramana/eval/scorecard.json`  
   mirrored → `.mutagent/eval/scorecard.json`  
   Criteria: `authz_deny_before_retrieve` · `citation_grounding` · `hallucination_refuse` · `refusal_is_success` · `audit_completeness`

2. **Helix local-jsonl traces**  
   `submissions/pramana/traces/*.jsonl` (also in Helix `global.sources`)  
   For Helix `*evaluate` / `*diagnose` when the harness can run model judges (Pi BYOK or Claude subscription).

3. **AgentSpec**  
   `submissions/pramana/agentspec.yaml` + `.mutagent/spec/agentspec.yaml`

## What we deliberately do NOT do
- Invent JSONL “label” fields Helix doesn’t read (HumanLabel is a separate `*review`→`*validate` artifact).
- Wire Compass / factcheck into Optimize or any apply/target path.
- Ask Helix to “just finish the challenge” (breaks askUserQuestions / interview gates).
- Retrieve-then-filter or mutating Evaluate.

## Compass Program (Salesforce-style validation)
`Compass Program/` = DB/ground-truth validation & fact-checking stack.  
**Role:** judge-only signal / future deterministic eval input.  
**Not** an auto-fixer. Does not call Helix apply/optimize.

## Commands
```powershell
npm test          # Mutagent-aligned criteria tests
npm run eval      # scorecard → submissions/... + .mutagent/eval/
npm start         # MultiAgent API :8787
```

Helix (separate terminal — Plugin or Pi):  
`*mutagent` → `*evaluate` → `*govern` (trust vs quality) → `*diagnose` → `*optimize` (approval-gated)
