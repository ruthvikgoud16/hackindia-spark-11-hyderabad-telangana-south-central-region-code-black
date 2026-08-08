/**
 * Optional lean LLM polish — only after authz allow + grounded evidence.
 * Never invents facts; only rephrases authorized draft text.
 */
export type LlmModelId =
  | "grounded-local"
  | "openai/gpt-4o-mini"
  | "claude-haiku-4-5-20251001";

export async function polishWithLlm(opts: {
  model: LlmModelId;
  query: string;
  groundedDraft: string;
  evidence: string[];
}): Promise<{ text: string; usedLlm: boolean; provider?: string; note?: string }> {
  if (opts.model === "grounded-local") {
    return { text: opts.groundedDraft, usedLlm: false, provider: "local" };
  }

  const evidenceBlock = opts.evidence.slice(0, 4).join("\n");
  const system =
    "You are PRAMANA draft polish. Rewrite ONLY using the evidence. No new facts. If evidence is insufficient, say so. Cite doc ids already present.";
  const user = `Query: ${opts.query}\n\nEvidence:\n${evidenceBlock}\n\nGrounded draft:\n${opts.groundedDraft}`;

  if (opts.model.startsWith("openai/") || opts.model.includes("gpt")) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return {
        text: opts.groundedDraft,
        usedLlm: false,
        provider: "openrouter",
        note: "OPENROUTER_API_KEY missing — used grounded-local",
      };
    }
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      return {
        text: opts.groundedDraft,
        usedLlm: false,
        provider: "openrouter",
        note: `OpenRouter HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return {
      text: text || opts.groundedDraft,
      usedLlm: Boolean(text),
      provider: "openrouter",
    };
  }

  // Anthropic Haiku
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      text: opts.groundedDraft,
      usedLlm: false,
      provider: "anthropic",
      note: "ANTHROPIC_API_KEY missing — used grounded-local",
    };
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    return {
      text: opts.groundedDraft,
      usedLlm: false,
      provider: "anthropic",
      note: `Anthropic HTTP ${res.status}`,
    };
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  return {
    text: text || opts.groundedDraft,
    usedLlm: Boolean(text),
    provider: "anthropic",
  };
}
