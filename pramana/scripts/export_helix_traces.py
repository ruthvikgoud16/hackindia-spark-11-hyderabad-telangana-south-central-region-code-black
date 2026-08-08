#!/usr/bin/env python3
"""Export PRAMĀṆA traces into Helix local-jsonl layout under traces/helix/."""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
PRAMANA = HERE.parent
ROOT = PRAMANA.parents[1] if PRAMANA.name == "pramana" else PRAMANA.parent

SRC_DIRS = [
    PRAMANA / "traces",
    PRAMANA / "transcripts",
    ROOT / "traces",
]
OUT_DIR = PRAMANA / "traces" / "helix"
OUT_FILE = OUT_DIR / "pramana-runs.jsonl"


def iter_jsonl(path: Path):
    if not path.exists():
        return
    if path.is_file() and path.suffix == ".jsonl":
        yield path
        return
    if path.is_dir():
        for p in path.rglob("*.jsonl"):
            yield p


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    seen = 0
    for d in SRC_DIRS:
        for p in iter_jsonl(d):
            # skip our own export target
            if p.resolve() == OUT_FILE.resolve():
                continue
            try:
                text = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for raw in text.splitlines():
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    obj = json.loads(raw)
                except json.JSONDecodeError:
                    obj = {"raw": raw}
                envelope = {
                    "exportedAt": datetime.now(timezone.utc).isoformat(),
                    "sourcePath": str(p.relative_to(ROOT)).replace("\\", "/"),
                    "record": obj,
                }
                lines.append(json.dumps(envelope, ensure_ascii=False))
                seen += 1

    OUT_FILE.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

    # Mirror under repo traces/ for Helix config globs
    mirror = ROOT / "traces" / "helix"
    mirror.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_FILE, mirror / "pramana-runs.jsonl")

    print(f"exported {seen} records -> {OUT_FILE}")
    print(f"mirrored -> {mirror / 'pramana-runs.jsonl'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
