# Security

## Do not commit

- `.env`, `.env.local`, `.env.*.local`
- API keys (`MUTAGENT_*`, `ANTHROPIC_*`, `OPENROUTER_*`, …)
- Database URLs / passwords
- OAuth client secrets (Google / GitHub)
- Local auth stores under `.mutagent/pramana-data/`

## Safe templates

| File | Purpose |
|------|---------|
| `submissions/pramana/.env.example` | Backend / Mutagent / Supabase server placeholders |
| `submissions/pramana/frontend/.env.example` | Vite `VITE_SUPABASE_*` placeholders only |
| `SECRETS_SETUP.md` | How to wire secrets locally |

## Browser vs server

- Only `VITE_*` variables are bundled into the frontend.
- `DATABASE_URL` and Mutagent/Anthropic keys must stay on the server / local machine.

## If a secret leaked

Rotate it in the provider dashboard (Supabase, Mutagent, Anthropic, Google Cloud, GitHub) and update your local `.env.local` only.
