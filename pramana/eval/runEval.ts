import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { EVAL_CASES } from "./dataset.js";
import { scoreCase } from "./score.js";
import { runTrustPipeline } from "../backend/src/orchestrator.js";
import { persistTrace } from "../backend/src/traces.js";
import {
  resolvePramanaRoot,
  resolveWorkspaceRoot,
} from "../backend/src/paths.js";

const PRAMANA = resolvePramanaRoot();
const WORKSPACE = resolveWorkspaceRoot();
const outDir = join(PRAMANA, "eval");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const scorecards = EVAL_CASES.map((c) => {
  const result = runTrustPipeline(c.principal, c.query);
  persistTrace(c.principal, c.query, result);
  return scoreCase(c, result);
});

const passed = scorecards.filter((s) => s.pass).length;
const failed = scorecards.filter((s) => !s.pass);
const report = {
  dataset: "trust-core",
  minItemsRequired: 20,
  total: scorecards.length,
  passed,
  failed: failed.length,
  passRate: Number((passed / scorecards.length).toFixed(4)),
  criteria: [
    "authz_deny_before_retrieve",
    "citation_grounding",
    "hallucination_refuse",
    "refusal_is_success",
    "audit_completeness",
  ],
  scorecards,
};

const outFile = join(outDir, "scorecard.json");
writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

const helixEval = join(WORKSPACE, ".mutagent", "eval");
if (!existsSync(helixEval)) mkdirSync(helixEval, { recursive: true });
writeFileSync(join(helixEval, "scorecard.json"), JSON.stringify(report, null, 2));

console.log(
  `Eval ${passed}/${scorecards.length} passed (${(report.passRate * 100).toFixed(1)}%)`,
);
console.log(`Wrote ${outFile}`);
if (failed.length) {
  console.log("Failures:");
  for (const f of failed) {
    console.log(
      ` - ${f.caseId}: expected ${f.expected_outcome} got ${f.actual}; ${f.criteria
        .filter((c) => !c.pass)
        .map((c) => c.id)
        .join(", ")}`,
    );
  }
  process.exitCode = 1;
}
