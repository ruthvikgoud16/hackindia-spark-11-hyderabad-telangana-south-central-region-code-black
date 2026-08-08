# CODE BLACK · HackIndia Spark 11 (Hyderabad)

Team repository for **CODE BLACK** — HackIndia Spark 11, Hyderabad / Telangana / South Central.

## Project: PRAMĀṆA

**Evidence-gated enterprise knowledge multi-agent** — authorize before retrieve, cite every claim, treat deny/refuse as success.

| Role | Name (KMIT) |
|------|-------------|
| Backend | Ruthvik Goud |
| Frontend | Monisha Sarai |
| DevOps | Rohith |

### Proof

- Unit tests **35/35**
- Trust-core eval **27/27** (`passRate: 1.0`)
- Self-evolve: 18/27 → 27/27 SHIP

### Quick start

```bash
cd pramana
cp .env.example .env.local
cp frontend/.env.example frontend/.env.local
# fill secrets locally — never commit them

npm install
npm --prefix frontend install

npm test                 # 35/35
npm run eval             # 27/27
npm run dev              # API  → http://localhost:8787
npm run dev:web          # UI   → http://localhost:5173
```

### Judge pack

| Doc | Path |
|-----|------|
| Architecture PDF | [pramana/files/PRAMANA_Architecture.pdf](./pramana/files/PRAMANA_Architecture.pdf) |
| Audit report PDF | [pramana/files/PRAMANA_Audit_Report.pdf](./pramana/files/PRAMANA_Audit_Report.pdf) |
| Full README | [pramana/README.md](./pramana/README.md) |
| Pitch | [pramana/PITCH.md](./pramana/PITCH.md) |
| Scorecard | [pramana/eval/scorecard.json](./pramana/eval/scorecard.json) |

Pipeline: `privacy_gate → retriever → draft → verify → factcheck → govern`  
(deny short-circuits before retrieve; govern always seals the audit)

Also submitted to Mutagent: https://github.com/mutagent-io/mutagent-hackathon/pull/13
