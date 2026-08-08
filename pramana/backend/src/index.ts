import cors from "cors";
import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { EVAL_CASES } from "../../eval/dataset.js";
import { mountAuthRoutes } from "./auth/routes.js";
import { runCompassJudge } from "./integrations/compass.js";
import { runTrustPipeline } from "./orchestrator.js";
import { persistTrace, toHelixTraceLine } from "./traces.js";
import { normalizeTrigger } from "./triggers/index.js";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = join(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnvFiles();

const PrincipalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["employee", "manager", "analyst", "compliance", "bot"]),
  dept: z.string().min(1),
  clearance: z.enum(["L1", "L2", "L3", "L4"]),
  channel: z.enum(["web", "portal", "slack", "api"]),
});

const QuerySchema = z.object({
  principal: PrincipalSchema,
  query: z.string().min(1),
  persist: z.boolean().optional().default(true),
  compassJudge: z.boolean().optional().default(false),
});

const TriggerSchema = z.object({
  kind: z
    .enum(["interactive", "webhook", "slack_mention", "api_job", "schedule"])
    .optional(),
  source: z.string().optional(),
  query: z.string().min(1),
  ticketRef: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  principal: PrincipalSchema,
  persist: z.boolean().optional().default(true),
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
mountAuthRoutes(app);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pramana-backend",
    agents: [
      "privacy_gate",
      "retriever",
      "draft",
      "verify",
      "factcheck",
      "govern",
    ],
    tools: [
      "policy.check",
      "corpus.search",
      "graph.expand",
      "claims.extract",
      "evidence.bind",
      "hallucination.scan",
      "audit.seal",
      "notify.compliance",
      "compass.verify",
    ],
    triggers: [
      "interactive",
      "webhook",
      "slack_mention",
      "api_job",
      "schedule",
    ],
  });
});

app.get("/v1/cases", (_req, res) => {
  res.json({
    count: EVAL_CASES.length,
    cases: EVAL_CASES.map((c) => ({
      id: c.id,
      title: c.title,
      expected_outcome: c.expected_outcome,
      criteria: c.criteria,
    })),
  });
});

app.post("/v1/query", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { principal, query, persist, compassJudge } = parsed.data;
  const result = runTrustPipeline(principal, query);
  let compass;
  if (compassJudge && result.output.kind === "answer") {
    const traceId = `pramana-live-${Date.now()}`;
    compass = await runCompassJudge({
      query,
      answer: result.output.response,
      traceId,
    });
  }
  const traceFile = persist
    ? persistTrace(principal, query, result)
    : undefined;
  res.json({
    result,
    compass,
    traceFile,
    helixLine: toHelixTraceLine(principal, query, result),
  });
});

/** Real-job ingress: webhook / slack / api_job / schedule */
app.post("/v1/trigger", (req, res) => {
  const parsed = TriggerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const trigger = normalizeTrigger({
    kind: body.kind,
    source: body.source,
    query: body.query,
    principalId: body.principal.id,
    channel: body.principal.channel,
    ticketRef: body.ticketRef,
    metadata: body.metadata,
  });
  const result = runTrustPipeline(body.principal, body.query, { trigger });
  const traceFile = body.persist
    ? persistTrace(body.principal, body.query, result)
    : undefined;
  res.json({ trigger, result, traceFile });
});

app.post("/v1/cases/:id/run", (req, res) => {
  const c = EVAL_CASES.find((x) => x.id === req.params.id);
  if (!c) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  const result = runTrustPipeline(c.principal, c.query);
  const traceFile = persistTrace(c.principal, c.query, result);
  res.json({ case: c, result, traceFile });
});

const PORT = Number(process.env.PORT ?? 8787);
app.listen(PORT, () => {
  console.log(`PRAMĀṆA backend listening on http://localhost:${PORT}`);
});
