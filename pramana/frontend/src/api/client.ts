export type Role = "employee" | "manager" | "analyst" | "compliance";
export type Clearance = "L1" | "L2" | "L3" | "L4";
export type LlmModelId =
  | "grounded-local"
  | "openai/gpt-4o-mini"
  | "claude-haiku-4-5-20251001";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  dept: string;
  clearance: Clearance;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  trustScore: number;
  confidence: number;
  kind: "answer" | "refusal";
  authzAllow: boolean;
  sensitivity: string;
  risk: number;
  citations: { docId: string; title: string }[];
  hops: { agent: string; status: string; detail: string }[];
  provenance: {
    ticket?: string;
    sensitivity?: string;
    docIds: string[];
    entities: string[];
  };
  llm: {
    usedLlm: boolean;
    provider?: string;
    note?: string;
    model: string;
  };
  explanation: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: LlmModelId;
  at: string;
  inspection?: Inspection;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
}

const TOKEN_KEY = "pramana_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : Array.isArray(data.error?.formErrors) && data.error.formErrors[0]
          ? data.error.formErrors[0]
          : res.status === 404
            ? "PRAMĀṆA backend route missing — restart `npm run dev` in submissions/pramana"
            : res.statusText;
    throw new Error(msg || "request failed");
  }
  return data as T;
}

export const client = {
  signup: (body: {
    username: string;
    password: string;
    displayName: string;
    role: Role;
    dept: string;
  }) => api<{ token: string; user: User }>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { username: string; password: string; role: Role }) =>
    api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  supabaseBridge: (body: {
    accessToken: string;
    role: Role;
    displayName?: string;
    dept?: string;
    username?: string;
    mode?: "login" | "signup";
  }) =>
    api<{ token: string; user: User }>("/auth/supabase", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => api<{ user: User }>("/auth/me"),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  updateMe: (body: {
    displayName?: string;
    username?: string;
    password?: string;
    dept?: string;
  }) =>
    api<{ user: User }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  models: () =>
    api<{
      models: { id: LlmModelId; label: string; note: string; available?: boolean }[];
    }>("/auth/models"),
  chats: () => api<{ chats: ChatSummary[] }>("/auth/chats"),
  chat: (id: string) => api<{ chat: ChatThread }>(`/auth/chats/${id}`),
  newChat: (title?: string) =>
    api<{ chat: ChatThread }>("/auth/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  send: (body: { chatId?: string; query: string; model: LlmModelId }) =>
    api<{
      chatId: string;
      response: string;
      inspection: Inspection;
      chat: { id: string; title: string; updatedAt: string };
    }>("/auth/chats/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  sendFeedback: (body: {
    feedback: string;
    category?: string;
    title?: string;
  }) =>
    api<{
      ok: boolean;
      feedbackId?: string;
      message?: string;
      raw?: unknown;
    }>("/auth/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
