#!/usr/bin/env python3
"""PRAMĀṆA user-framework judge — wraps the TypeScript trust-core suite.

Expect: all cases pass (currently 27/27 trust-core). Exit 0 on full pass.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # E:\PRAMANA
SCORECARD = ROOT / "submissions" / "pramana" / "eval" / "scorecard.json"


def main() -> int:
    print("PRAMANA user-framework evaluate -> npm run eval")
    proc = subprocess.run(
        ["npm", "run", "eval"],
        cwd=str(ROOT),
        shell=sys.platform.startswith("win"),
    )
    if not SCORECARD.exists():
        print("ERROR: scorecard.json missing after eval", file=sys.stderr)
        return 2
    data = json.loads(SCORECARD.read_text(encoding="utf-8"))
    passed = data.get("passed", 0)
    total = data.get("total", 0)
    rate = data.get("passRate", 0)
    print(f"SCORECARD {passed}/{total} pass_rate={rate}")
    # Copy into .mutagent/eval for Helix
    dest = ROOT / ".mutagent" / "eval" / "scorecard.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return 0 if proc.returncode == 0 and passed == total and total > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
