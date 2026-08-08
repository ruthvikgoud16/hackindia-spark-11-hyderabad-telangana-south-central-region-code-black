/**
 * Compass Program adapter — JUDGE-ONLY.
 * Never calls Helix apply/optimize/targets.
 *
 * When COMPASS_URL is unset, returns a skipped stub so the pipeline stays offline-capable.
 */
export interface CompassJudgeInput {
  query: string;
  answer: string;
  traceId: string;
}

export interface CompassJudgeResult {
  skipped: boolean;
  pass?: boolean;
  reason: string;
  verificationId?: string;
  confidence?: number;
}

export async function runCompassJudge(
  input: CompassJudgeInput,
): Promise<CompassJudgeResult> {
  const base = process.env.COMPASS_URL?.replace(/\/$/, "");
  if (!base) {
    return {
      skipped: true,
      reason: "COMPASS_URL not set — Compass judge skipped (judge-only optional)",
    };
  }

  try {
    const res = await fetch(`${base}/api/v1/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.COMPASS_TOKEN
          ? { authorization: `Bearer ${process.env.COMPASS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        query: input.query,
        // Compass expects an LLM generation path; we pass the PRAMANA draft as context
        custom_system_prompt: `Trace ${input.traceId}. Judge only; do not mutate agents.`,
        model: "PRAMANA-draft",
        chat_history: [
          { role: "user", content: input.query },
          { role: "assistant", content: input.answer },
        ],
      }),
    });

    if (!res.ok) {
      return {
        skipped: false,
        pass: false,
        reason: `Compass HTTP ${res.status} — judge failed closed`,
      };
    }

    const body = (await res.json()) as {
      verification_id?: string;
      overall_confidence_score?: number;
      hallucination_heatmap?: { status: string }[];
    };

    const contradicted =
      body.hallucination_heatmap?.some(
        (h) => h.status === "Contradicted" || h.status === "Unsupported",
      ) ?? false;
    const confidence = body.overall_confidence_score ?? 0;
    const pass = !contradicted && confidence >= 70;

    return {
      skipped: false,
      pass,
      reason: pass
        ? `Compass judge PASS confidence=${confidence}`
        : `Compass judge FAIL confidence=${confidence} contradicted=${contradicted}`,
      verificationId: body.verification_id,
      confidence,
    };
  } catch (err) {
    return {
      skipped: false,
      pass: false,
      reason: `Compass unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
