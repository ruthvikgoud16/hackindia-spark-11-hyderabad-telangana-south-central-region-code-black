# Helix + Claude API (local)

## Config
`.mutagent/config.yaml` now has:
- `global.providers[anthropic].credentials_ref: ANTHROPIC_API_KEY`
- `global.models.default` / `judge_model`: **Haiku** (cheap)
- `lifecycle.evaluator.judge_runtime: in-house` → uses Claude API, not Claude Code subscription

## Before any Helix session
Load `.env` in the shell (PowerShell):

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k,$v = $_ -split '=',2
  Set-Item -Path "Env:$k" -Value $v.Trim()
}
```

## Budget
~$4.90 Claude left. Haiku only. No full EDD loop until operator says **go**.

## Note (Burak)
Platform BYOK ≠ Claude Code Plugin. `in-house` judge path uses env `ANTHROPIC_API_KEY` for Helix evaluate scripts. For a full Pi harness session, still `/login` with Anthropic there.
