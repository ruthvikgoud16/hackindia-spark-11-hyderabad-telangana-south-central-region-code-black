# Secrets wiring (local only)

**Never commit** `.env`, `.env.local`, API keys, DB URLs, or OAuth client secrets.

| Secret | Where (local) | Notes |
|---|---|---|
| Mutagent API | `submissions/pramana/.env.local` → `MUTAGENT_API_KEY` | CLI + feedback dock |
| Anthropic | same → `ANTHROPIC_API_KEY` | Helix EDD only when approved |
| Supabase (server) | same → `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Auth bridge |
| Supabase (browser) | `frontend/.env.local` → `VITE_SUPABASE_*` | OAuth client only |
| Postgres | `DATABASE_URL` in backend `.env.local` only | Never put in Vite |

## Templates

```bash
cp submissions/pramana/.env.example submissions/pramana/.env.local
cp submissions/pramana/frontend/.env.example submissions/pramana/frontend/.env.local
# then fill values privately
```

## Supabase Auth (Google / GitHub)

1. Enable **Google** + **GitHub** providers in the Supabase dashboard.
2. Provider callback (Google/GitHub apps):  
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Supabase redirect URLs:  
   `http://localhost:5173/oauth/callback` (+ production origin)

## Rules

- Do not paste secrets into README, PITCH, transcripts, or chat logs you will publish.
- Rotate any key that was ever shared in plaintext.
- Prefer Mutagent CLI login over committing API keys.
