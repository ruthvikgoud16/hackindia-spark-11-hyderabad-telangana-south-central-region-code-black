import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  client,
  type ChatMessage,
  type ChatSummary,
  type LlmModelId,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import { SpideyFromQuery } from "../components/WanderingPets";
import { FeedbackDock } from "../components/FeedbackDock";
import { DashboardExtras } from "../components/DashboardExtras";
import {
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Settings,
} from "lucide-react";

export function ChatPage() {
  const { user, loading, logout } = useAuth();
  const { chatId } = useParams();
  const nav = useNavigate();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState<LlmModelId>("grounded-local");
  const [models, setModels] = useState<
    { id: LlmModelId; label: string; note: string; available?: boolean }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeTitle = useMemo(() => {
    const c = chats.find((x) => x.id === chatId);
    return c?.title ?? "New inquiry";
  }, [chats, chatId]);

  async function refreshChats() {
    const { chats } = await client.chats();
    setChats(chats);
  }

  useEffect(() => {
    if (!user) return;
    void client.models().then((r) => setModels(r.models));
    void refreshChats().catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user || !chatId) {
      setMessages([]);
      return;
    }
    void client
      .chat(chatId)
      .then(({ chat }) => setMessages(chat.messages))
      .catch(() => setMessages([]));
  }, [user, chatId]);

  if (loading) return <div className="boot">Opening Pramana…</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function onNew() {
    const { chat } = await client.newChat();
    await refreshChats();
    nav(`/app/${chat.id}`);
  }

  async function onSend(e?: FormEvent, text?: string) {
    if (e) e.preventDefault();
    const q = (text ?? query).trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    if (!text) setQuery("");
    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      role: "user",
      content: q,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await client.send({ chatId, query: q, model });
      if (!chatId) nav(`/app/${res.chatId}`, { replace: true });
      const { chat } = await client.chat(res.chatId);
      setMessages(chat.messages);
      await refreshChats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      if (!text) setQuery(q);
    } finally {
      setBusy(false);
    }
  }

  const samplePrompts = [
    {
      title: "Policy clearance",
      prompt: roleHints(user.role)[0] ?? "What is the company PTO policy?",
    },
    {
      title: "Remote access",
      prompt: "What is the VPN MFA requirement for remote access?",
    },
  ];

  function openInspect(msg: ChatMessage) {
    if (!msg.inspection || !chatId) return;
    sessionStorage.setItem(
      `pramana_inspect_${chatId}_${msg.id}`,
      JSON.stringify(msg.inspection),
    );
    nav(`/app/${chatId}/inspect/${msg.id}`);
  }

  const modelLabel = models.find((m) => m.id === model)?.label ?? model;

  return (
    <div className="relative min-h-screen flex flex-col">
      <MotionNetworkBackground />
      <FeedbackDock />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[rgba(45,82,73,0.1)] bg-white/70 backdrop-blur-xl shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border border-[rgba(45,82,73,0.16)] flex items-center justify-center text-[#3f6b5f]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div
                className="text-sm font-semibold tracking-tight text-[#2d5249]"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                PRAMĀṆA
              </div>
              <div className="text-[10px] text-[#5c6b66]">
                {user.role} · {user.clearance}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <label className="hidden md:flex items-center gap-2 text-xs text-[#5c6b66]">
              <Cpu className="w-3.5 h-3.5 text-[#3f6b5f]" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as LlmModelId)}
                className="glass-input rounded-full px-3 py-1.5 text-xs"
              >
                {(models.length
                  ? models
                  : [{ id: "grounded-local" as const, label: "Grounded Local", note: "" }]
                ).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.available === false ? " (key missing)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-[rgba(45,82,73,0.12)] bg-white/80 text-xs"
              >
                <span className="w-7 h-7 rounded-full bg-[#2d5249] text-white flex items-center justify-center font-bold text-[11px]">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:block text-[#1c2b28] font-semibold">
                  {user.displayName}
                </span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 glass-panel-glow rounded-2xl overflow-hidden z-50">
                  <Link
                    to="/app/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#1c2b28] hover:bg-[#f6f7f5]"
                  >
                    <Settings className="w-3.5 h-3.5" /> Account
                  </Link>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-700 hover:bg-[#f6f7f5]"
                    onClick={() => {
                      void logout().then(() => nav("/login"));
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 h-[calc(100vh-3.5rem)] w-full px-3 gap-3 py-2 overflow-hidden">
          <aside
            className={`transition-all duration-300 flex flex-col glass-panel rounded-[1.35rem] overflow-visible shrink-0 ${
              sidebarOpen ? "w-64 sm:w-72" : "w-14"
            }`}
          >
            <div className="p-3 border-b border-[rgba(45,82,73,0.1)] flex items-center justify-between gap-2 relative z-20 bg-white/50">
              {sidebarOpen ? (
                <div className="flex-1 relative min-w-0">
                  <button
                    type="button"
                    onClick={() => void onNew()}
                    className="w-full py-2.5 px-3 rounded-full btn-sage text-xs flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New inquiry
                  </button>
                  <SpideyFromQuery visible />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void onNew()}
                  className="p-2.5 rounded-full bg-[#2d5249] text-white mx-auto"
                  title="New inquiry"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-2 rounded-full text-[#5c6b66] hover:bg-[#f6f7f5] shrink-0"
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {sidebarOpen ? (
              <div className="flex-1 overflow-y-auto p-2 pt-[8.5rem] space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-[#5c6b66] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#3f6b5f]" />
                  Recent ({chats.length})
                </div>
                {chats.map((c) => {
                  const isActive = c.id === chatId;
                  return (
                    <Link
                      key={c.id}
                      to={`/app/${c.id}`}
                      className={`p-2.5 rounded-2xl text-xs transition-all flex items-center gap-2.5 truncate ${
                        isActive
                          ? "bg-[#2d5249] text-white font-semibold shadow-sage"
                          : "text-[#5c6b66] hover:text-[#1c2b28] hover:bg-white/80"
                      }`}
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white/80" : "text-[#9aada4]"}`}
                      />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  );
                })}
                {!chats.length ? (
                  <p className="px-2 py-4 text-[11px] text-[#8a9a94]">No inquiries yet.</p>
                ) : null}
              </div>
            ) : null}
          </aside>

          <section className="flex-1 flex flex-col h-full overflow-hidden glass-panel rounded-[1.35rem]">
            <div className="py-3 px-4 flex items-center justify-between border-b border-[rgba(45,82,73,0.1)] bg-white/40 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#5c6b66]">
                <Cpu className="w-4 h-4 text-[#3f6b5f]" />
                <span>
                  Engine: <strong className="text-[#2d5249]">{modelLabel}</strong>
                </span>
                <span className="text-[#c5d0cb]">|</span>
                <span className="hidden sm:inline">
                  Thread: <strong className="text-[#1c2b28]">{activeTitle}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f]">
                Gate → Retrieve → Govern
              </span>
            </div>

            <DashboardExtras
              role={user.role}
              clearance={user.clearance}
              messageCount={messages.length}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {!messages.length ? (
                <div className="max-w-2xl mx-auto text-center pt-10">
                  <div className="inline-flex p-3 rounded-full border border-[rgba(45,82,73,0.14)] bg-white text-[#3f6b5f] mb-4">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h2
                    className="text-2xl font-semibold text-[#2d5249]"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    Ask as {user.role}
                  </h2>
                  <p className="text-xs text-[#5c6b66] mt-2 leading-relaxed">
                    Gate runs on {user.clearance} clearance first. Missing evidence
                    becomes a refusal — that is success.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 sm:gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" ? (
                      <div className="w-9 h-9 rounded-full bg-[#2d5249] flex items-center justify-center text-white shrink-0 shadow-sage">
                        <Bot className="w-5 h-5" />
                      </div>
                    ) : null}

                    <div className={`max-w-3xl space-y-3`}>
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-[#2d5249] text-white font-medium rounded-br-sm shadow-sage"
                            : "glass-panel text-[#1c2b28] rounded-bl-sm"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(45,82,73,0.1)] text-[10px] text-[#5c6b66]">
                            <span className="font-semibold text-[#3f6b5f] flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              PRAMĀṆA
                            </span>
                            <span>
                              {new Date(m.at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>

                      {m.inspection ? (
                        <div className="p-4 rounded-2xl glass-panel-glow card-hover-effect flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-full flex items-center justify-center ${
                                m.inspection.kind === "answer" && m.inspection.trustScore >= 70
                                  ? "bg-[#e8f5ef] text-[#2d5249] border border-[rgba(45,82,73,0.15)]"
                                  : "bg-[#f7f1e6] text-[#8a6a2f] border border-[rgba(138,106,47,0.2)]"
                              }`}
                            >
                              {m.inspection.kind === "answer" && m.inspection.trustScore >= 70 ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <AlertTriangle className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1c2b28]">Trust score:</span>
                                <span className="text-sm font-black text-[#2d5249]">
                                  {Math.round(m.inspection.trustScore)}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-[#8a9a94]">
                                  {m.inspection.kind}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5c6b66] mt-0.5">
                                {m.inspection.hops?.length ?? 0} hops · authz{" "}
                                {m.inspection.authzAllow ? "allow" : "deny"} ·{" "}
                                {m.inspection.citations?.length ?? 0} citations
                              </p>
                            </div>
                          </div>
                          {chatId ? (
                            <button
                              type="button"
                              onClick={() => openInspect(m)}
                              className="w-full sm:w-auto px-4 py-2.5 rounded-full btn-sage text-xs flex items-center justify-center gap-2 shrink-0"
                            >
                              <BarChart3 className="w-4 h-4" />
                              Open inspection
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {m.role === "user" ? (
                      <div className="w-9 h-9 rounded-full bg-white border border-[rgba(45,82,73,0.14)] flex items-center justify-center text-[#3f6b5f] shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    ) : null}
                  </div>
                ))
              )}

              {busy ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border border-[rgba(45,82,73,0.14)] bg-white flex items-center justify-center text-[#3f6b5f]">
                    <Bot className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="glass-panel px-4 py-3 rounded-2xl text-xs text-[#2d5249] font-semibold flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#3f6b5f] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[#3f6b5f] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-[#3f6b5f] animate-bounce [animation-delay:0.4s]" />
                    </div>
                    Validating through privacy gate → govern…
                  </div>
                </div>
              ) : null}
            </div>

            {!messages.length ? (
              <div className="px-4 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((sp) => (
                  <button
                    key={sp.title}
                    type="button"
                    onClick={() => void onSend(undefined, sp.prompt)}
                    className="p-3 rounded-2xl glass-panel text-left card-hover-effect group"
                  >
                    <div className="text-xs font-bold text-[#1c2b28] group-hover:text-[#2d5249] flex items-center justify-between">
                      <span>{sp.title}</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#3f6b5f] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-[#5c6b66] line-clamp-1 mt-0.5">{sp.prompt}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="p-3 border-t border-[rgba(45,82,73,0.1)] bg-white/40 shrink-0">
              {error ? <p className="text-rose-600 text-xs mb-2 px-1">{error}</p> : null}
              <form
                onSubmit={(e) => void onSend(e)}
                className="glass-panel p-2 rounded-2xl focus-within:ring-2 focus-within:ring-[rgba(63,107,95,0.2)] flex items-center gap-2"
              >
                <textarea
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={`Ask with ${user.role} clearance…`}
                  disabled={busy}
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-[#1c2b28] placeholder-[#8a9a94] focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || busy}
                  className="p-3 rounded-full btn-sage disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function roleHints(role: string): string[] {
  const map: Record<string, string[]> = {
    employee: ["What is the company PTO policy?"],
    analyst: ["What is the Q3 board forecast ARR?"],
    manager: ["Summarize restricted board materials I can access"],
    compliance: ["List confidential incident handling steps"],
  };
  return map[role] ?? [];
}
