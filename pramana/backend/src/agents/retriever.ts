import { canAccessDoc, CORPUS, GRAPH } from "../corpus/index.js";
import type {
  AuthzDecision,
  Principal,
  RetrievalHit,
  RetrievalResult,
} from "../types.js";

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * retriever — Hybrid GraphRAG (vector + KG). Requires AuthzDecision.ticket.
 * Protects: authz_deny_before_retrieve (must not run without ticket)
 */
export function runRetriever(
  principal: Principal,
  query: string,
  authz: AuthzDecision,
): RetrievalResult {
  if (!authz.allow || !authz.ticket) {
    return {
      hits: [],
      ticket: "",
      authorizedDocCount: 0,
      retrieved: false,
      linkedEntities: [],
      subgraph: {},
      audit: [
        {
          at: Date.now(),
          agent: "retriever",
          action: "abort",
          detail: "No authz ticket — retrieve forbidden",
        },
      ],
    };
  }

  const qTokens = tokenize(query);
  const qSet = new Set(qTokens);
  const authorized = CORPUS.filter((d) => {
    if (
      d.id === "DOC-ADV-01" &&
      !/poison|injection|override note|poisoned note/i.test(query)
    ) {
      return false;
    }
    return canAccessDoc(principal.clearance, principal.dept, principal.role, d);
  });

  let hits: RetrievalHit[] = authorized
    .map((doc) => {
      const docTokens = tokenize(
        `${doc.title} ${doc.text} ${doc.entities.join(" ")}`,
      );
      let overlap = 0;
      for (const t of docTokens) if (qSet.has(t)) overlap += 1;
      for (const e of doc.entities) {
        if (query.toLowerCase().includes(e.toLowerCase())) overlap += 2.5;
      }
      const vectorScore = overlap / Math.max(3, qTokens.length);
      return {
        doc,
        vectorScore,
        graphScore: 0,
        score: vectorScore,
        snippet: doc.text.slice(0, 180),
      } satisfies RetrievalHit;
    })
    .filter((h) => h.vectorScore >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // KG entity linking + re-rank (no sensitivity escalation)
  const linked = new Set<string>();
  const q = query.toLowerCase();
  for (const entity of Object.keys(GRAPH)) {
    if (q.includes(entity.toLowerCase())) linked.add(entity);
  }
  for (const hit of hits) for (const e of hit.doc.entities) linked.add(e);

  const subgraph: Record<string, string[]> = {};
  for (const e of linked) subgraph[e] = GRAPH[e] ?? [];
  const neighbors = new Set<string>();
  for (const ns of Object.values(subgraph)) for (const n of ns) neighbors.add(n);

  hits = hits
    .map((hit) => {
      let graphBoost = 0;
      for (const e of hit.doc.entities) {
        if (linked.has(e)) graphBoost += 0.15;
        if (neighbors.has(e)) graphBoost += 0.08;
      }
      return {
        ...hit,
        graphScore: graphBoost,
        score: hit.vectorScore + graphBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    hits,
    ticket: authz.ticket,
    authorizedDocCount: authorized.length,
    retrieved: true,
    linkedEntities: [...linked],
    subgraph,
    audit: [
      {
        at: Date.now(),
        agent: "retriever",
        action: "retrieve",
        detail: `ticket=${authz.ticket}; hits=${hits.length}; entities=${[...linked].join(",") || "none"}`,
        evidenceRefs: hits.map((h) => h.doc.id),
      },
    ],
  };
}
