# Helix transcripts (PRAMĀṆA)

Hackathon evidence packs. Judges: prefer **native Claude Code** JSONL over runner-packaged sessions.

## Packs

| Pack | Kind | What it proves |
|------|------|----------------|
| `pramana-helix-native-2026-08-07T17-35-09/` | **Native** Claude Code → Helix | Real `~/.claude/projects/E--PRAMANA/*.jsonl`. Helix *status → `npm run eval` 27/27 → Diagnose→SHIP. Cost ≈ $0.04 Haiku. |
| `pramana-evolve-2026-08-07T17-35-09/` | Multi-round self-evolve | Round1 **18/27 FAIL** → diagnose OPTIMIZE → **apply** `privacy_gate` restore → Round2 **27/27** → SHIP |
| `pramana-edd-2026-08-07T17-24-11/` | EDD runner (Cursor+Haiku govern) | Build→evaluate→govern→diagnose SHIP; optimize not applied (green path) |

## Reproduce

```powershell
# load .env (ANTHROPIC_API_KEY)
npm run helix:native   # native Claude Code Helix JSONL
npm run edd:evolve     # fail → diagnose → apply → pass
npm run edd            # green-path EDD (no apply)
```

## Notes

- Native pack is **not** invented JSONL — copied from Claude Code session `c02ee0ac-44fd-41db-9317-9e3abefddadc`.
- Self-evolve temporarily injects an authz bypass, then restores the real allow predicate; gate is clean after the run.
- Do not invent Helix `HumanLabel` fields on local-jsonl rows.
