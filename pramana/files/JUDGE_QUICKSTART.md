# PRAMĀṆA — Judge quick start & demo script

## Prerequisites

- Node.js 20+
- (Optional) Python 3 for `eval/run_eval.py`
- Copy env templates — **no secrets in git**

```bash
cd submissions/pramana
cp .env.example .env.local
cp frontend/.env.example frontend/.env.local
# fill locally — see SECRETS_SETUP.md
npm install
npm --prefix frontend install
```

OAuth redirect used by the app: `/oauth/callback`  
(Supabase → Authentication → URL Configuration must match.)

---

## Verification (before UI)

```bash
npm test          # → 35/35
npm run eval      # → 27/27, writes eval/scorecard.json
```

Optional self-evolve demo:

```bash
npm run edd:evolve   # FAIL → diagnose → apply → PASS
```

---

## Live demo script (~5 minutes)

### 1. Boot

```bash
npm run dev          # http://localhost:8787
npm run dev:web      # http://localhost:5173
```

### 2. Login

1. Open the UI  
2. Pick a clearance **role**  
3. Continue with **Google** or **GitHub**  
4. Land in the chat workspace  

### 3. Show trust paths

| Demo | What to ask / do | Expected |
|------|------------------|----------|
| **Answer** | Authorized HR/public policy (e.g. PTO / mission) | Grounded answer + citations in Inspection |
| **Deny** | Salary / board / restricted ask under wrong role | Refusal; hops show gate **denied**, retriever **skipped** |
| **Refuse** | Invented / out-of-corpus ask | Refusal after factcheck; no hedged hallucination |

Open **Inspection**: trust score, agent hops, evidence ids, audit seal.

### 4. Helix (if time)

Separate terminal with Helix installed:

```
*mutagent → *evaluate → *govern → SHIP
```

Emphasize: Evaluate **never fixes**; `*govern` is judge-only routing.

---

## What judges should open first

1. [JUDGE_ONE_PAGER.md](./JUDGE_ONE_PAGER.md)  
2. [PRAMANA_Architecture.pdf](./PRAMANA_Architecture.pdf)  
3. [PRAMANA_Audit_Report.pdf](./PRAMANA_Audit_Report.pdf)  
4. [../PITCH.md](../PITCH.md)  
5. [../eval/scorecard.json](../eval/scorecard.json)  

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OAuth hang / 404 on bridge | Restart backend so `POST /auth/supabase` is live |
| Empty corpus answers | Expected for out-of-scope asks → **refuse** |
| Secrets missing | Fill `.env.local` from examples; never commit real keys |
