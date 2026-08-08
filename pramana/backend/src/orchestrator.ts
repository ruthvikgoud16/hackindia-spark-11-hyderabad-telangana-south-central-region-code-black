import { runDraft } from "./agents/draft.js";
import { runFactcheck } from "./agents/factcheck.js";
import { runGovern } from "./agents/govern.js";
import { runPrivacyGate } from "./agents/privacy_gate.js";
import { runRetriever } from "./agents/retriever.js";
import { runVerify } from "./agents/verify.js";
import { ToolBus } from "./tools/bus.js";
import type { TriggerEvent } from "./triggers/index.js";
import type {
  AgentHop,
  AuditEvent,
  PipelineResult,
  Principal,
} from "./types.js";

function hop(
  agent: string,
  status: AgentHop["status"],
  detail: string,
  startedAt: number,
): AgentHop {
  return { agent, status, detail, startedAt, finishedAt: Date.now() };
}

export interface PipelineOptions {
  trigger?: TriggerEvent;
  /** When true and COMPASS_URL set, call Compass judge-only after factcheck pass */
  compassJudge?: boolean;
}

/**
 * Orchestrator — fixed order; never retrieves before authz.
 * Tools are first-class audited jobs (policy, search, graph, claims, notify).
 */
export function runTrustPipeline(
  principal: Principal,
  query: string,
  options: PipelineOptions = {},
): PipelineResult {
  const hops: AgentHop[] = [];
  const priorAudit: AuditEvent[] = [];
  const tools = new ToolBus();

  let t = Date.now();
  const authz = tools.run("policy.check", { principalId: principal.id, query }, () =>
    runPrivacyGate(principal, query),
  );
  priorAudit.push(...authz.audit);
  hops.push(
    hop(
      "privacy_gate",
      authz.allow ? "passed" : "denied",
      authz.allow
        ? `ticket ${authz.ticket}`
        : `${authz.rbac.reason}; ${authz.abac.reason}`,
      t,
    ),
  );

  if (!authz.allow) {
    tools.run(
      "notify.compliance",
      {
        reason: "authz_deny",
        principal: principal.id,
        ticketRef: options.trigger?.payload.ticketRef,
      },
      () => ({
        queued: true,
        channel: "compliance-outbox",
        event: "access_denied",
      }),
    );

    for (const a of ["retriever", "draft", "verify", "factcheck"] as const) {
      hops.push(hop(a, "skipped", "deny short-circuit", Date.now()));
    }
    t = Date.now();
    const { govern, output } = tools.run("audit.seal", { path: "deny" }, () =>
      runGovern({
        authz,
        deniedEarly: true,
        priorAudit,
      }),
    );
    hops.push(hop("govern", "passed", `trust=${govern.trustScore}`, t));
    return {
      hops,
      authz,
      govern,
      output,
      tools: tools.calls,
      trigger: options.trigger
        ? {
            kind: options.trigger.kind,
            source: options.trigger.source,
            correlationId: options.trigger.correlationId,
            ticketRef: options.trigger.payload.ticketRef,
          }
        : undefined,
      helix: {
        stageHint: "evaluate",
        note: "Correct deny before retrieve — PASS under refusal_is_success / authz_deny_before_retrieve.",
      },
    };
  }

  t = Date.now();
  const retrieval = tools.run(
    "corpus.search",
    { ticket: authz.ticket, query },
    () => runRetriever(principal, query, authz),
  );
  tools.run(
    "graph.expand",
    { entities: retrieval.linkedEntities },
    () => ({
      linked: retrieval.linkedEntities,
      subgraphKeys: Object.keys(retrieval.subgraph),
    }),
  );
  priorAudit.push(...retrieval.audit);
  hops.push(
    hop(
      "retriever",
      retrieval.hits.length ? "passed" : "failed",
      `hits=${retrieval.hits.length}`,
      t,
    ),
  );

  t = Date.now();
  const draft = runDraft(query, retrieval);
  priorAudit.push(...draft.audit);
  hops.push(hop("draft", "passed", `docs=${draft.usedDocIds.join(",")}`, t));

  t = Date.now();
  const verify = tools.run("claims.extract", { draftChars: draft.draft.length }, () =>
    runVerify(draft.draft, retrieval.hits),
  );
  tools.run(
    "evidence.bind",
    { claims: verify.claims.length },
    () => ({
      supported: verify.claims.filter((c) => c.supported).length,
      evidenceMapKeys: Object.keys(verify.evidenceMap).length,
    }),
  );
  priorAudit.push(...verify.audit);
  hops.push(hop("verify", "passed", `claims=${verify.claims.length}`, t));

  t = Date.now();
  const factcheck = tools.run(
    "hallucination.scan",
    { claims: verify.claims.length },
    () => runFactcheck(verify.claims, retrieval.hits),
  );
  priorAudit.push(...factcheck.audit);
  hops.push(
    hop(
      "factcheck",
      factcheck.refuse ? "denied" : "passed",
      factcheck.refuseReason ?? `confidence=${factcheck.confidence}`,
      t,
    ),
  );

  t = Date.now();
  const { govern, output } = tools.run("audit.seal", { path: "allow" }, () =>
    runGovern({
      authz,
      retrieval,
      draftText: draft.draft,
      factcheck,
      deniedEarly: false,
      priorAudit,
    }),
  );
  hops.push(hop("govern", "passed", `trust=${govern.trustScore}`, t));

  return {
    hops,
    authz,
    retrieval,
    draft,
    verify,
    factcheck,
    govern,
    output,
    tools: tools.calls,
    trigger: options.trigger
      ? {
          kind: options.trigger.kind,
          source: options.trigger.source,
          correlationId: options.trigger.correlationId,
          ticketRef: options.trigger.payload.ticketRef,
        }
      : undefined,
    helix: {
      stageHint: factcheck.refuse ? "govern" : "evaluate",
      note: factcheck.refuse
        ? "Run Helix *govern to classify trust vs quality, then *diagnose if needed."
        : "Export trace; Helix *evaluate against AgentSpec criteria.",
    },
  };
}
