import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { runTrustPipeline } from "../orchestrator.js";
import { persistTrace } from "../traces.js";
import type { Principal, UserRole } from "../types.js";
import { polishWithLlm } from "./llmPolish.js";
import {
  createChat,
  createSession,
  defaultClearance,
  destroySession,
  findUserBySupabaseId,
  findUserByUsername,
  getChat,
  hashPassword,
  listChats,
  listUsers,
  publicUser,
  saveUsers,
  upsertChat,
  userFromToken,
  verifyPassword,
  type LlmModelId,
  type StoredUser,
} from "./store.js";

const execFileAsync = promisify(execFile);

const RoleSchema = z.enum([
  "employee",
  "manager",
  "analyst",
  "compliance",
]);

const SignupSchema = z.object({
  username: z.string().min(3).max(40),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(80),
  role: RoleSchema,
  dept: z.string().min(1).max(60),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: RoleSchema,
});

const SupabaseBridgeSchema = z.object({
  accessToken: z.string().min(10),
  role: RoleSchema,
  displayName: z.string().min(1).max(80).optional(),
  dept: z.string().min(1).max(60).optional(),
  username: z.string().min(3).max(80).optional(),
  mode: z.enum(["login", "signup"]).default("login"),
});

const ProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  username: z.string().min(3).max(40).optional(),
  password: z.string().min(6).max(128).optional(),
  dept: z.string().min(1).max(60).optional(),
});

const ChatSendSchema = z.object({
  chatId: z.string().optional(),
  query: z.string().min(1).max(4000),
  model: z
    .enum([
      "grounded-local",
      "openai/gpt-4o-mini",
      "claude-haiku-4-5-20251001",
    ])
    .default("grounded-local"),
});

const FeedbackSchema = z.object({
  feedback: z.string().min(3).max(4000),
  category: z
    .enum([
      "cli",
      "helix",
      "stage:spec",
      "stage:build",
      "stage:evaluate",
      "stage:diagnose",
      "stage:optimize",
    ])
    .default("cli"),
  title: z.string().min(1).max(80).optional(),
});

function bearer(req: Request) {
  const h = req.header("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? (req.header("x-pramana-token") || undefined);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = userFromToken(bearer(req));
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as Request & { user: StoredUser }).user = user;
  next();
}

function toPrincipal(user: StoredUser): Principal {
  return {
    id: user.id,
    name: user.displayName,
    role: user.role as UserRole,
    dept: user.dept,
    clearance: user.clearance,
    channel: "web",
  };
}

async function fetchSupabaseUser(accessToken: string) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not configured");
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: key,
      },
      signal: ac.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `invalid supabase session (${res.status})`);
    }
    return (await res.json()) as {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Supabase user lookup timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function buildInspection(
  result: ReturnType<typeof runTrustPipeline>,
  llmMeta: { usedLlm: boolean; provider?: string; note?: string; model: string },
) {
  const hops = result.hops.map((h) => ({
    agent: h.agent,
    status: h.status,
    detail: h.detail,
  }));
  return {
    trustScore: result.output.trustScore,
    confidence: result.output.confidence,
    kind: result.output.kind,
    authzAllow: result.authz.allow,
    sensitivity: result.authz.sensitivity,
    risk: result.authz.risk,
    citations: result.output.citations,
    hops,
    provenance: result.govern.provenance,
    llm: llmMeta,
    explanation: result.output.explanation,
  };
}

export function mountAuthRoutes(app: Express) {
  app.get("/auth/models", (_req, res) => {
    res.json({
      models: [
        {
          id: "grounded-local",
          label: "Grounded Local",
          note: "Deterministic GraphRAG draft — no API spend",
        },
        {
          id: "openai/gpt-4o-mini",
          label: "GPT-4o mini",
          note: "OpenRouter BYOK polish after gate",
          available: Boolean(process.env.OPENROUTER_API_KEY),
        },
        {
          id: "claude-haiku-4-5-20251001",
          label: "Claude Haiku",
          note: "Anthropic BYOK polish after gate",
          available: Boolean(process.env.ANTHROPIC_API_KEY),
        },
      ],
    });
  });

  app.post("/auth/signup", (req, res) => {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    if (findUserByUsername(body.username)) {
      res.status(409).json({ error: "username taken" });
      return;
    }
    const { salt, passwordHash } = hashPassword(body.password);
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: `u_${randomBytes(6).toString("hex")}`,
      username: body.username,
      passwordHash,
      salt,
      displayName: body.displayName,
      role: body.role,
      dept: body.dept,
      clearance: defaultClearance(body.role),
      createdAt: now,
      updatedAt: now,
    };
    const users = listUsers();
    users.push(user);
    saveUsers(users);
    const token = createSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  });

  app.post("/auth/login", (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const user = findUserByUsername(parsed.data.username);
    if (!user || !verifyPassword(parsed.data.password, user)) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    if (user.role !== parsed.data.role) {
      res.status(403).json({
        error: `role mismatch — this account is ${user.role}, not ${parsed.data.role}`,
      });
      return;
    }
    const token = createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  /** Exchange a verified Supabase access token for a PRAMĀṆA session + RBAC stamp. */
  app.post("/auth/supabase", async (req, res) => {
    const parsed = SupabaseBridgeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    try {
      const sbUser = await fetchSupabaseUser(body.accessToken);
      const email = (sbUser.email || "").toLowerCase();
      const fallbackId = sbUser.id;
      if (!email && !fallbackId) {
        res.status(400).json({ error: "supabase user missing email" });
        return;
      }

      const meta = sbUser.user_metadata ?? {};
      const metaRole = typeof meta.role === "string" ? meta.role : undefined;
      const displayName =
        body.displayName ||
        (typeof meta.displayName === "string" ? meta.displayName : "") ||
        (typeof meta.full_name === "string" ? meta.full_name : "") ||
        (typeof meta.name === "string" ? meta.name : "") ||
        (email ? email.split("@")[0] : `user_${fallbackId.slice(0, 8)}`);
      const dept =
        body.dept ||
        (typeof meta.dept === "string" ? meta.dept : "engineering");
      const username =
        body.username ||
        (typeof meta.username === "string" ? meta.username : "") ||
        email ||
        `sb_${fallbackId.slice(0, 12)}`;

      let user =
        findUserBySupabaseId(sbUser.id) ||
        findUserByUsername(username) ||
        (email ? findUserByUsername(email) : undefined);

      if (!user) {
        if (body.mode === "login") {
          // First login after Supabase signup elsewhere — create local RBAC profile
          const now = new Date().toISOString();
          const stub = hashPassword(randomBytes(24).toString("hex"));
          user = {
            id: `u_${randomBytes(6).toString("hex")}`,
            username: username.slice(0, 80),
            passwordHash: stub.passwordHash,
            salt: stub.salt,
            displayName: displayName.slice(0, 80),
            role: body.role,
            dept: dept.slice(0, 60),
            clearance: defaultClearance(body.role),
            createdAt: now,
            updatedAt: now,
            supabaseId: sbUser.id,
          };
          const users = listUsers();
          users.push(user);
          saveUsers(users);
        } else {
          const now = new Date().toISOString();
          const stub = hashPassword(randomBytes(24).toString("hex"));
          user = {
            id: `u_${randomBytes(6).toString("hex")}`,
            username: username.slice(0, 80),
            passwordHash: stub.passwordHash,
            salt: stub.salt,
            displayName: displayName.slice(0, 80),
            role: body.role,
            dept: dept.slice(0, 60),
            clearance: defaultClearance(body.role),
            createdAt: now,
            updatedAt: now,
            supabaseId: sbUser.id,
          };
          const users = listUsers();
          if (findUserByUsername(user.username)) {
            res.status(409).json({ error: "username taken" });
            return;
          }
          users.push(user);
          saveUsers(users);
        }
      } else {
        if (user.role !== body.role) {
          res.status(403).json({
            error: `role mismatch — this account is ${user.role}, not ${body.role}`,
          });
          return;
        }
        if (metaRole && metaRole !== body.role && metaRole !== user.role) {
          res.status(403).json({
            error: `role mismatch — supabase metadata is ${metaRole}`,
          });
          return;
        }
        if (!user.supabaseId) {
          const users = listUsers();
          const idx = users.findIndex((u) => u.id === user!.id);
          if (idx >= 0) {
            users[idx].supabaseId = sbUser.id;
            users[idx].updatedAt = new Date().toISOString();
            saveUsers(users);
            user = users[idx];
          }
        }
      }

      const token = createSession(user.id);
      res.json({ token, user: publicUser(user) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "supabase bridge failed";
      res.status(401).json({ error: msg });
    }
  });

  app.post("/auth/logout", requireAuth, (req, res) => {
    const token = bearer(req);
    if (token) destroySession(token);
    res.json({ ok: true });
  });

  /** Dashboard → Mutagent CLI feedback send (API callback). */
  app.post("/auth/feedback", requireAuth, async (req, res) => {
    const parsed = FeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { feedback, category, title } = parsed.data;
    const args = [
      "feedback",
      "send",
      feedback,
      "--category",
      category,
      "--json",
      "--non-interactive",
    ];
    if (title) args.push("--title", title);

    const env = { ...process.env };
    const isWin = process.platform === "win32";
    try {
      const { stdout, stderr } = await execFileAsync(
        isWin ? "cmd.exe" : "mutagent",
        isWin ? ["/d", "/s", "/c", "mutagent", ...args] : args,
        {
          env,
          timeout: 90_000,
          maxBuffer: 2_000_000,
          windowsHide: true,
        },
      );
      const text = `${stdout || ""}\n${stderr || ""}`.trim();
      let raw: unknown = text;
      let feedbackId: string | undefined;
      try {
        raw = JSON.parse(stdout || text);
        const obj = raw as Record<string, unknown>;
        feedbackId =
          (typeof obj.id === "string" && obj.id) ||
          (typeof obj.feedbackId === "string" && obj.feedbackId) ||
          (typeof (obj.data as { id?: string } | undefined)?.id === "string"
            ? (obj.data as { id: string }).id
            : undefined);
      } catch {
        const m = text.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        );
        feedbackId = m?.[0];
      }

      const logPath = join(process.cwd(), "FEEDBACK_LOG.md");
      const day = new Date().toISOString().slice(0, 10);
      const line = `| ${day} | ${category} | ${title || feedback.slice(0, 40).replace(/\|/g, "/")} | \`${feedbackId || "pending"}\` |\n`;
      try {
        appendFileSync(logPath, line);
      } catch {
        /* ignore log write */
      }

      res.json({
        ok: true,
        feedbackId,
        message: feedbackId
          ? `Filed via mutagent CLI · ${feedbackId}`
          : "Mutagent CLI completed",
        raw,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "mutagent feedback send failed — is the CLI installed and logged in?";
      res.status(502).json({ error: msg });
    }
  });

  app.get("/auth/me", requireAuth, (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    res.json({ user: publicUser(user) });
  });

  app.patch("/auth/me", requireAuth, (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    const parsed = ProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const users = listUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx < 0) {
      res.status(404).json({ error: "not found" });
      return;
    }
    if (body.username && body.username !== user.username) {
      if (findUserByUsername(body.username)) {
        res.status(409).json({ error: "username taken" });
        return;
      }
      users[idx].username = body.username;
    }
    if (body.displayName) users[idx].displayName = body.displayName;
    if (body.dept) users[idx].dept = body.dept;
    if (body.password) {
      const { salt, passwordHash } = hashPassword(body.password);
      users[idx].salt = salt;
      users[idx].passwordHash = passwordHash;
    }
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ user: publicUser(users[idx]) });
  });

  app.get("/auth/chats", requireAuth, (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    res.json({
      chats: listChats(user.id).map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
        messageCount: c.messages.length,
      })),
    });
  });

  app.get("/auth/chats/:id", requireAuth, (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    const chatId = String(req.params.id);
    const chat = getChat(user.id, chatId);
    if (!chat) {
      res.status(404).json({ error: "chat not found" });
      return;
    }
    res.json({ chat });
  });

  app.post("/auth/chats", requireAuth, (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    const title =
      typeof req.body?.title === "string" && req.body.title.trim()
        ? req.body.title.trim().slice(0, 80)
        : "New inquiry";
    const chat = createChat(user.id, title);
    res.status(201).json({ chat });
  });

  app.post("/auth/chats/send", requireAuth, async (req, res) => {
    const user = (req as Request & { user: StoredUser }).user;
    const parsed = ChatSendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { query, model } = parsed.data;
    let chat = parsed.data.chatId
      ? getChat(user.id, parsed.data.chatId)
      : undefined;
    if (!chat) {
      chat = createChat(user.id, query.slice(0, 48));
    }

    const principal = toPrincipal(user);
    const result = runTrustPipeline(principal, query);
    persistTrace(principal, query, result);

    let responseText = result.output.response;
    let llmMeta = {
      usedLlm: false,
      provider: "local" as string | undefined,
      note: undefined as string | undefined,
      model: model as string,
    };

    if (
      result.output.kind === "answer" &&
      result.authz.allow &&
      model !== "grounded-local"
    ) {
      const evidence =
        result.retrieval?.hits.map(
          (h) => `[${h.doc.id}] ${h.doc.title}: ${h.snippet}`,
        ) ?? [];
      const polished = await polishWithLlm({
        model: model as LlmModelId,
        query,
        groundedDraft: result.output.response,
        evidence,
      });
      responseText = polished.text;
      llmMeta = {
        usedLlm: polished.usedLlm,
        provider: polished.provider,
        note: polished.note,
        model,
      };
    }

    const inspection = buildInspection(result, llmMeta);
    const now = new Date().toISOString();
    chat.messages.push({
      id: `m_${randomBytes(5).toString("hex")}`,
      role: "user",
      content: query,
      at: now,
    });
    chat.messages.push({
      id: `m_${randomBytes(5).toString("hex")}`,
      role: "assistant",
      content: responseText,
      model: model as LlmModelId,
      at: now,
      inspection,
    });
    chat.updatedAt = now;
    if (chat.title === "New inquiry") chat.title = query.slice(0, 48);
    upsertChat(chat);

    res.json({
      chatId: chat.id,
      response: responseText,
      inspection,
      result,
      chat: {
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
      },
    });
  });
}
