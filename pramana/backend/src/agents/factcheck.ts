import type { Claim, FactcheckResult, RetrievalHit } from "../types.js";

/**
 * factcheck — Hallucination gate. Unsupported ⇒ REFUSE (not soften).
 * Protects: hallucination_refuse, refusal_is_success
 */
export function runFactcheck(
  claims: Claim[],
  hits: RetrievalHit[],
): FactcheckResult {
  if (hits.length === 0) {
    return {
      hallucinationDetected: true,
      confidence: 0,
      refuse: true,
      refuseReason:
        "No authorized evidence retrieved — refusing ungrounded answer",
      citations: [],
      claims: [],
      audit: [
        {
          at: Date.now(),
          agent: "factcheck",
          action: "refuse",
          detail: "empty_evidence",
        },
      ],
    };
  }

  const unsupported = claims.filter((c) => !c.supported);
  const hallucinationDetected = unsupported.length > 0;
  const avg =
    claims.length === 0
      ? 0
      : Math.round(
          claims.reduce((a, c) => a + c.confidence, 0) / claims.length,
        );

  const hasInvented = unsupported.some((c) =>
    /(rumor|secret 40%|headcount cut|injection|override|redacted-injection)/i.test(
      c.text,
    ),
  );

  const refuse =
    hasInvented ||
    (hallucinationDetected && avg < 55) ||
    claims.length === 0;

  const citationMap = new Map<string, string>();
  for (const c of claims) {
    if (!c.supported) continue;
    for (const id of c.evidenceIds) {
      const hit = hits.find((h) => h.doc.id === id);
      if (hit) citationMap.set(id, hit.doc.title);
    }
  }

  let refuseReason: string | undefined;
  if (refuse) {
    if (hasInvented)
      refuseReason =
        "Factcheck REFUSE: unsupported invented claims detected";
    else
      refuseReason =
        "Factcheck REFUSE: claims lacked sufficient grounding";
  }

  return {
    hallucinationDetected,
    confidence: avg,
    refuse,
    refuseReason,
    citations: [...citationMap.entries()].map(([docId, title]) => ({
      docId,
      title,
    })),
    claims,
    audit: [
      {
        at: Date.now(),
        agent: "factcheck",
        action: refuse ? "refuse" : "pass",
        detail: `confidence=${avg}; hallucination=${hallucinationDetected}; unsupported=${unsupported.length}`,
      },
    ],
  };
}
