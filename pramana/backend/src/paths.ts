import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Support both layouts:
 * - Monorepo root (E:/PRAMANA) with submissions/pramana/
 * - Submission package root (submissions/pramana as cwd)
 */
export function resolvePramanaRoot(cwd = process.cwd()) {
  if (
    existsSync(join(cwd, "backend", "src")) &&
    existsSync(join(cwd, "eval"))
  ) {
    return cwd;
  }
  const nested = join(cwd, "submissions", "pramana");
  if (existsSync(nested)) return nested;
  return cwd;
}

export function resolveWorkspaceRoot(cwd = process.cwd()) {
  const pramana = resolvePramanaRoot(cwd);
  if (pramana === cwd) {
    // submission-local: workspace is parent of submissions/ or cwd itself
    const parent = join(cwd, "..", "..");
    if (existsSync(join(parent, ".mutagent"))) return parent;
    if (existsSync(join(cwd, ".mutagent"))) return cwd;
    return cwd;
  }
  return cwd;
}
