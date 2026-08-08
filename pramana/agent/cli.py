#!/usr/bin/env python3
"""Minimal PRAMĀṆA trust CLI spot-check (one-shot via tsx orchestrator)."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("--role", default="employee")
    ap.add_argument("--dept", default="engineering")
    ap.add_argument("--clearance", default="L2")
    ap.add_argument("--name", default="e1")
    ap.add_argument("--no-trace", action="store_true")
    args = ap.parse_args()

    principal = {
        "id": args.name,
        "name": args.name,
        "role": args.role,
        "dept": args.dept,
        "clearance": args.clearance,
        "channel": "web",
    }
    # Relative import from repo root (Windows-safe for tsx ESM)
    script = f"""
import {{ runTrustPipeline }} from "./submissions/pramana/backend/src/orchestrator.ts";
const out = runTrustPipeline({json.dumps(principal)}, {json.dumps(args.query)});
console.log(JSON.stringify({{
  kind: out.output?.kind,
  response: (out.output?.response ?? "").toString().slice(0, 500),
  confidence: out.output?.confidence,
  trustScore: out.output?.trustScore,
  citations: out.output?.citations ?? [],
  gaps: out.output?.gaps ?? [],
  hops: (out.hops ?? []).map((h) => ({{ agent: h.agent, status: h.status }})),
  governClass: out.govern?.classification ?? out.govern?.class ?? null,
  authzAllow: out.authz?.allow,
}}, null, 2));
"""
    tmp = ROOT / "spotcheck-pramana.mts"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(script, encoding="utf-8")
    proc = subprocess.run(
        ["npx", "tsx", str(tmp)],
        cwd=str(ROOT),
        shell=sys.platform.startswith("win"),
        capture_output=True,
        text=True,
    )
    sys.stdout.write(proc.stdout)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr[-4000:])
    if args.no_trace:
        try:
            tmp.unlink()
        except OSError:
            pass
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
