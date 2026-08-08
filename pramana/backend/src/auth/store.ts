import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Clearance, UserRole } from "../types.js";

const DATA_DIR = join(process.cwd(), ".mutagent", "pramana-data");
const USERS_FILE = join(DATA_DIR, "users.json");
const CHATS_FILE = join(DATA_DIR, "chats.json");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");

export type LlmModelId =
  | "grounded-local"
  | "openai/gpt-4o-mini"
  | "claude-haiku-4-5-20251001";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  role: UserRole;
  dept: string;
  clearance: Clearance;
  createdAt: string;
  updatedAt: string;
  /** Supabase Auth user id when enrolled via Supabase */
  supabaseId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: LlmModelId;
  at: string;
  inspection?: Record<string, unknown>;
}

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(USERS_FILE)) writeFileSync(USERS_FILE, "[]");
  if (!existsSync(CHATS_FILE)) writeFileSync(CHATS_FILE, "[]");
  if (!existsSync(SESSIONS_FILE)) writeFileSync(SESSIONS_FILE, "[]");
}

function readJson<T>(path: string, fallback: T): T {
  ensureStore();
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown) {
  ensureStore();
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { salt: s, passwordHash: hash };
}

export function verifyPassword(password: string, user: StoredUser) {
  const { passwordHash } = hashPassword(password, user.salt);
  const a = Buffer.from(passwordHash, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function defaultClearance(role: UserRole): Clearance {
  if (role === "compliance") return "L4";
  if (role === "manager" || role === "analyst") return "L3";
  if (role === "bot") return "L1";
  return "L2";
}

export function listUsers() {
  return readJson<StoredUser[]>(USERS_FILE, []);
}

export function saveUsers(users: StoredUser[]) {
  writeJson(USERS_FILE, users);
}

export function findUserByUsername(username: string) {
  return listUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
}

export function findUserBySupabaseId(supabaseId: string) {
  return listUsers().find((u) => u.supabaseId === supabaseId);
}

export function findUserById(id: string) {
  return listUsers().find((u) => u.id === id);
}

export function createSession(userId: string) {
  const sessions = readJson<Session[]>(SESSIONS_FILE, []);
  const token = createHash("sha256")
    .update(randomBytes(32))
    .digest("hex");
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  writeJson(SESSIONS_FILE, sessions);
  return token;
}

export function userFromToken(token: string | undefined) {
  if (!token) return undefined;
  const sessions = readJson<Session[]>(SESSIONS_FILE, []);
  const session = sessions.find((s) => s.token === token);
  if (!session) return undefined;
  return findUserById(session.userId);
}

export function destroySession(token: string) {
  const sessions = readJson<Session[]>(SESSIONS_FILE, []).filter(
    (s) => s.token !== token,
  );
  writeJson(SESSIONS_FILE, sessions);
}

export function publicUser(u: StoredUser) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    dept: u.dept,
    clearance: u.clearance,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function listChats(userId: string) {
  return readJson<ChatThread[]>(CHATS_FILE, [])
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getChat(userId: string, chatId: string) {
  return listChats(userId).find((c) => c.id === chatId);
}

export function upsertChat(thread: ChatThread) {
  const all = readJson<ChatThread[]>(CHATS_FILE, []);
  const i = all.findIndex((c) => c.id === thread.id);
  if (i >= 0) all[i] = thread;
  else all.push(thread);
  writeJson(CHATS_FILE, all);
  return thread;
}

export function createChat(userId: string, title: string) {
  const thread: ChatThread = {
    id: `chat_${randomBytes(8).toString("hex")}`,
    userId,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  return upsertChat(thread);
}
