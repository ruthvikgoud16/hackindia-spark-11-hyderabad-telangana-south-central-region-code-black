import type {
  AuditEvent,
  AuthzDecision,
  FactcheckResult,
  GovernResult,
  RetrievalResult,
  Sensitivity,
  TrustOutput,
} from "../types.js";

export interface GovernInput {
  authz: AuthzDecision;
  retrieval?: RetrievalResult;
  draftText?: string;
  factcheck?: FactcheckResult;
  deniedEarly: boolean;
  priorAudit: AuditEvent[];
}

/**
 * govern — Provenance, trust score, sealed audit. Always last.
 * Protects: audit_completeness, refusal_is_success
 */
export function runGovern(input: GovernInput): {
  govern: GovernResult;
  output: TrustOutput;
} {
  const { authz, retrieval, draftText, factcheck, deniedEarly, priorAudit } =
    input;
  const audit: AuditEvent[] = [...priorAudit];

  const docIds =
    factcheck?.citations.map((c) => c.docId) ??
    retrieval?.hits.map((h) => h.doc.id) ??
    [];
  const entities = retrieval?.linkedEntities ?? [];

  let trustScore: number;
  if (deniedEarly) trustScore = 96;
  else if (factcheck?.refuse) trustScore = 92;
  else {
    trustScore = Math.min(
      99,
      Math.round(
        (factcheck?.confidence ?? 50) * 0.7 + (100 - authz.risk) * 0.3,
      ),
    );
  }

  const sealedAt = Date.now();
  audit.push({
    at: sealedAt,
    agent: "govern",
    action: "seal",
    detail: `trustScore=${trustScore}; docs=${docIds.join(",") || "none"}; deniedEarly=${deniedEarly}`,
    evidenceRefs: docIds,
  });

  const govern: GovernResult = {
    trustScore,
    provenance: {
      ticket: authz.ticket,
      sensitivity: authz.sensitivity as Sensitivity,
      docIds: [...new Set(docIds)],
      entities,
    },
    audit,
    sealedAt,
  };

  let output: TrustOutput;
  if (deniedEarly) {
    output = {
      kind: "refusal",
      response:
        "Access denied. Your role, department, or clearance does not authorize this knowledge class. The request was blocked before retrieval.",
      confidence: 100,
      explanation: [
        "privacy_gate short-circuited before GraphRAG",
        authz.rbac.reason,
        authz.abac.reason,
        `Privacy risk score ${authz.risk}/100`,
      ],
      citations: [],
      trustScore,
      audit,
    };
  } else if (factcheck?.refuse) {
    const gaps = factcheck.claims
      .filter((c) => !c.supported)
      .map((c) => c.text.slice(0, 100));
    output = {
      kind: "refusal",
      response:
        factcheck.refuseReason ??
        "I cannot provide a grounded answer with the authorized evidence available.",
      confidence: factcheck.confidence,
      explanation: [
        "factcheck REFUSE — unsupported or partial evidence",
        ...gaps.map((g) => `Unsupported: “${g}…”`),
      ],
      citations: factcheck.citations,
      trustScore,
      audit,
      gaps,
    };
  } else {
    output = {
      kind: "answer",
      response:
        draftText ??
        factcheck?.claims.map((c) => c.text).join(" ") ??
        "Authorized answer assembled from evidence.",
      confidence: factcheck?.confidence ?? 0,
      explanation: [
        `Authorized under ticket ${authz.ticket}`,
        `Hybrid GraphRAG returned ${retrieval?.hits.length ?? 0} evidence nodes`,
        `Validation confidence ${factcheck?.confidence ?? 0}%`,
        `Privacy risk ${authz.risk}/100`,
      ],
      citations: factcheck?.citations ?? [],
      trustScore,
      audit,
    };
  }

  return { govern, output };
}
