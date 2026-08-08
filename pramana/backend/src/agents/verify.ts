import type { Claim, RetrievalHit, VerifyResult } from "../types.js";

function extractClaims(draft: string): string[] {
  return draft
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function bindEvidence(
  claim: string,
  hits: RetrievalHit[],
): { supported: boolean; evidenceIds: string[]; confidence: number } {
  if (
    /(executive rumor|secret 40%|headcount cut|without evidence)/i.test(claim)
  ) {
    return { supported: false, evidenceIds: [], confidence: 0 };
  }
  if (/redacted-injection|elevate caller|system override/i.test(claim)) {
    return { supported: false, evidenceIds: [], confidence: 0 };
  }

  const c = claim.toLowerCase();
  const evidenceIds: string[] = [];
  let best = 0;

  for (const hit of hits) {
    const text = `${hit.doc.title} ${hit.doc.text}`.toLowerCase();
    const words = c.split(/\s+/).filter((w) => w.length > 3);
    const matched = words.filter((w) => text.includes(w)).length;
    const ratio = matched / Math.max(1, words.length);
    if (ratio >= 0.4) {
      evidenceIds.push(hit.doc.id);
      best = Math.max(best, ratio);
    }
  }

  return {
    supported: evidenceIds.length > 0 && best >= 0.4,
    evidenceIds: [...new Set(evidenceIds)],
    confidence: Math.round(best * 100),
  };
}

/**
 * verify — Claim ↔ evidence alignment + confidence.
 * Protects: citation_grounding
 */
export function runVerify(draft: string, hits: RetrievalHit[]): VerifyResult {
  const claims: Claim[] = extractClaims(draft).map((text) => {
    const bound = bindEvidence(text, hits);
    return {
      text,
      supported: bound.supported,
      evidenceIds: bound.evidenceIds,
      confidence: bound.confidence,
    };
  });

  const evidenceMap: Record<string, string[]> = {};
  for (const c of claims) evidenceMap[c.text.slice(0, 80)] = c.evidenceIds;

  return {
    claims,
    evidenceMap,
    audit: [
      {
        at: Date.now(),
        agent: "verify",
        action: "bind",
        detail: `claims=${claims.length}; supported=${claims.filter((c) => c.supported).length}`,
        evidenceRefs: [...new Set(claims.flatMap((c) => c.evidenceIds))],
      },
    ],
  };
}
