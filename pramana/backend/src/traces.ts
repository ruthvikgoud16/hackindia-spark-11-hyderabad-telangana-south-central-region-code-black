import { mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PipelineResult, Principal } from "./types.js";
import { resolvePramanaRoot } from "./paths.js";

function tracesRoot(): string {
  return join(resolvePramanaRoot(), "traces");
}

export function toHelixTraceLine(
  principal: Principal,
  query: string,
  result: PipelineResult,
): string {
  return JSON.stringify({
    id: `pramana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: new Date().toISOString(),
    messages: [
      {
        role: "user",
        content: query,
        metadata: {
          principal: principal.id,
          role: principal.role,
          dept: principal.dept,
          clearance: principal.clearance,
          channel: principal.channel,
        },
      },
      {
        role: "assistant",
        content: result.output.response,
        metadata: {
          kind: result.output.kind,
          confidence: result.output.confidence,
          trustScore: result.output.trustScore,
          citations: result.output.citations,
          policyAllow: result.authz.allow,
          retrieved: result.retrieval?.retrieved ?? false,
          helixHint: result.helix.stageHint,
        },
      },
    ],
    hops: result.hops,
    tools: result.tools,
    trigger: result.trigger,
    audit: result.output.audit,
    evaluationHints: {
      refusalIsSuccess: result.output.kind === "refusal",
      criteria: [
        "authz_deny_before_retrieve",
        "citation_grounding",
        "hallucination_refuse",
        "refusal_is_success",
        "audit_completeness",
      ],
    },
  });
}

export function persistTrace(
  principal: Principal,
  query: string,
  result: PipelineResult,
): string {
  const root = tracesRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const file = join(
    root,
    `pramana-${new Date().toISOString().slice(0, 10)}.jsonl`,
  );
  appendFileSync(file, `${toHelixTraceLine(principal, query, result)}\n`, "utf8");
  return file;
}
