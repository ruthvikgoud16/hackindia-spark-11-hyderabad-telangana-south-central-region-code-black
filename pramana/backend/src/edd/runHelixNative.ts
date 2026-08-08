/**
 * Boot Mutagent Helix inside Claude Code (native harness) and package JSONL transcripts.
 * Frugal: Haiku + hard $ budget. Does NOT invent session files — only copies real Claude Code logs.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

const ROOT = process.cwd();
const RUN_ID = `pramana-helix-native-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
const OUT = join(ROOT, "submissions", "pramana", "transcripts", RUN_ID);

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function ensure(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Claude Code encodes cwd as a folder under ~/.claude/projects */
function projectDirCandidates(cwd: string): string[] {
  const base = join(homedir(), ".claude", "projects");
  if (!existsSync(base)) return [];
  const encoded = cwd.replace(/\\/g, "/").replace(/:/g, "").replace(/\//g, "-");
  const encoded2 = cwd.replace(/\\/g, "-").replace(/:/g, "-");
  const encoded3 = cwd.replace(/:/g, "").replace(/[\\/]/g, "-");
  return [join(base, encoded), join(base, encoded2), join(base, encoded3), base];
}

function findNewestJsonl(sinceMs: number): string[] {
  const found: { path: string; mtime: number }[] = [];
  const roots = projectDirCandidates(ROOT);
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (name.endsWith(".jsonl") && st.mtimeMs >= sinceMs - 2000) {
        found.push({ path: p, mtime: st.mtimeMs });
      }
    }
  };
  for (const r of roots) walk(r, 0);
  found.sort((a, b) => b.mtime - a.mtime);
  return found.map((f) => f.path);
}

function main() {
  loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY required for native Helix boot");
  }
  ensure(OUT);

  const claudeExe = join(
    ROOT,
    "node_modules",
    "@anthropic-ai",
    "claude-code",
    "bin",
    "claude.exe",
  );
  if (!existsSync(claudeExe)) {
    throw new Error(`Claude Code not installed at ${claudeExe}`);
  }

  const prompt = [
    "Boot Mutagent Helix for this repo.",
    "1) Read AGENTS.md at repo root.",
    "2) Read .agents/skills/mutagent-helix/orchestrator.md — adopt Helix persona briefly.",
    "3) Output a COMPACT *status (lifecycle stage + onboarding from .mutagent/config.yaml) — do NOT paste the full ASCII dashboard box (token budget).",
    "4) Run Bash: npm run eval — report pass/total only.",
    "5) If all green, say Diagnose→SHIP. Do not edit files. Then stop.",
  ].join("\n");

  const started = Date.now();
  writeFileSync(join(OUT, "prompt.txt"), prompt);

  console.log(`# Native Helix via Claude Code\nrun_id: ${RUN_ID}`);
  console.log("Launching claude -p (Haiku, max $0.45)...");

  const args = [
    "-p",
    "--bare",
    "--model",
    "claude-haiku-4-5-20251001",
    "--max-budget-usd",
    "0.45",
    "--permission-mode",
    "bypassPermissions",
    "--allowedTools",
    "Read,Bash",
    "--output-format",
    "json",
    prompt,
  ];

  const res = spawnSync(claudeExe, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      // Prefer API key auth
      CLAUDE_CODE_USE_BEDROCK: undefined,
    },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180_000,
  });

  writeFileSync(
    join(OUT, "claude-print.json"),
    (res.stdout || "") + (res.stderr ? `\n/*stderr*/\n${res.stderr}` : ""),
  );
  writeFileSync(
    join(OUT, "claude-exit.json"),
    JSON.stringify(
      {
        status: res.status,
        signal: res.signal,
        error: res.error ? String(res.error) : null,
      },
      null,
      2,
    ),
  );

  const jsonls = findNewestJsonl(started);
  const nativeDir = join(OUT, "claude-code-native");
  ensure(nativeDir);

  let copied = 0;
  for (const src of jsonls.slice(0, 8)) {
    const dest = join(nativeDir, basename(src));
    try {
      copyFileSync(src, dest);
      copied++;
      console.log(`copied ${src} → ${dest}`);
    } catch (e) {
      console.warn("copy failed", src, e);
    }
  }

  // Also write a Helix-facing main-session pointer from print JSON if no jsonl found
  if (copied === 0 && res.stdout) {
    writeFileSync(
      join(OUT, "main-session.jsonl"),
      JSON.stringify({
        type: "warning",
        note: "No ~/.claude/projects/*.jsonl found; packaging print-mode stdout as session surrogate. Judges prefer disk JSONL — re-run without --no-session-persistence.",
        harness: "claude-code",
        model: "claude-haiku-4-5-20251001",
        stdoutPath: "claude-print.json",
      }) + "\n",
    );
  } else if (copied > 0) {
    // Pick largest as main
    const mains = readdirSync(nativeDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(nativeDir, f))
      .sort(
        (a, b) => statSync(b).size - statSync(a).size,
      );
    if (mains[0]) {
      copyFileSync(mains[0], join(OUT, "main-session.jsonl"));
    }
  }

  writeFileSync(
    join(OUT, "README.md"),
    `# Native Helix transcript pack — ${RUN_ID}

Harness: **Claude Code** (\`claude -p --bare\`) + Helix skills under \`.agents/skills/mutagent-helix\`.

- \`claude-print.json\` — print-mode result
- \`claude-code-native/\` — copied session JSONL from \`~/.claude/projects\` (if present)
- \`main-session.jsonl\` — primary session

This is **not** the Cursor EDD runner package.
`,
  );

  console.log(
    JSON.stringify(
      {
        runId: RUN_ID,
        exit: res.status,
        jsonlCopied: copied,
        out: OUT,
      },
      null,
      2,
    ),
  );

  if (res.status !== 0 && copied === 0) {
    process.exitCode = 1;
  }
}

main();
