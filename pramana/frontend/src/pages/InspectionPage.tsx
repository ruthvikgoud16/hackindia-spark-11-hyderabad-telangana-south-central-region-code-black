import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { client, type Inspection } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  ShieldCheck,
  BarChart3,
  Layers,
  FileText,
  GitBranch,
  Info,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type TabId = "overview" | "hops" | "evidence" | "model" | "raw";

export function InspectionPage() {
  const { user, loading } = useAuth();
  const { chatId, messageId } = useParams();
  const nav = useNavigate();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [queryPreview, setQueryPreview] = useState("");
  const [answerPreview, setAnswerPreview] = useState("");
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!chatId || !messageId) return;

    const cached = sessionStorage.getItem(`pramana_inspect_${chatId}_${messageId}`);
    if (cached) {
      try {
        setInspection(JSON.parse(cached) as Inspection);
      } catch {
        /* fall through */
      }
    }

    void client
      .chat(chatId)
      .then(({ chat }) => {
        const msg = chat.messages.find((m) => m.id === messageId);
        if (!msg?.inspection) {
          setMissing(true);
          return;
        }
        setInspection(msg.inspection);
        setAnswerPreview(msg.content);
        const idx = chat.messages.findIndex((m) => m.id === messageId);
        for (let i = idx - 1; i >= 0; i--) {
          if (chat.messages[i].role === "user") {
            setQueryPreview(chat.messages[i].content);
            break;
          }
        }
        sessionStorage.setItem(
          `pramana_inspect_${chatId}_${messageId}`,
          JSON.stringify(msg.inspection),
        );
      })
      .catch(() => setMissing(true));
  }, [chatId, messageId]);

  if (loading) return <div className="boot">Opening inspection…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const backTo = chatId ? `/app/${chatId}` : "/app";

  if (missing && !inspection) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c2b28]/35 backdrop-blur-md">
        <div className="glass-panel-glow w-full max-w-md rounded-[1.35rem] p-8 text-center">
          <h1
            className="text-2xl font-semibold text-[#2d5249]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            No inspection found
          </h1>
          <p className="text-xs text-[#5c6b66] mt-2 mb-6">
            Open an assistant reply and choose Open inspection.
          </p>
          <Link to={backTo} className="inline-flex px-5 py-2.5 rounded-full btn-sage text-xs">
            Return to chat
          </Link>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return <div className="boot">Loading inspection…</div>;
  }

  const trust = Math.round(inspection.trustScore);
  const conf = Math.round(
    inspection.confidence * (inspection.confidence <= 1 ? 100 : 1),
  );

  const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Trust overview", icon: BarChart3 },
    { id: "hops", label: "Pipeline hops", icon: GitBranch },
    { id: "evidence", label: "Evidence & audit", icon: Layers },
    { id: "model", label: "Model & why", icon: Info },
    { id: "raw", label: "Raw JSON", icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1c2b28]/40 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow w-full max-w-7xl max-h-[92vh] rounded-[1.5rem] flex flex-col my-auto overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[rgba(45,82,73,0.1)] flex items-center justify-between bg-white/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-full bg-[#f6f7f5] text-[#3f6b5f] border border-[rgba(45,82,73,0.14)] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-lg sm:text-xl font-semibold text-[#2d5249] truncate"
                  style={{ fontFamily: '"Cormorant Garamond", serif' }}
                >
                  PRAMĀṆA Inspection
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f6f7f5] text-[#3f6b5f] border border-[rgba(45,82,73,0.14)]">
                  {inspection.kind}
                </span>
              </div>
              <p className="text-xs text-[#5c6b66] mt-0.5 truncate">
                {queryPreview
                  ? `Query: "${queryPreview.slice(0, 120)}${queryPreview.length > 120 ? "…" : ""}"`
                  : "Evidence-gated trust path"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav(backTo)}
            className="p-2.5 rounded-full text-[#5c6b66] hover:bg-[#f6f7f5] shrink-0"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-2 border-b border-[rgba(45,82,73,0.1)] bg-white/50 flex items-center gap-2 overflow-x-auto text-xs font-semibold shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  tab === t.id
                    ? "bg-[#2d5249] text-white shadow-sage"
                    : "text-[#5c6b66] hover:text-[#1c2b28] hover:bg-[#f6f7f5]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#f6f7f5]/40">
          {(tab === "overview" || tab === "model") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center">
                <div
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#2d5249 ${trust}%, #e8eee9 0)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-white flex flex-col items-center justify-center">
                    <strong className="text-3xl font-black text-[#1c2b28]">{trust}</strong>
                    <span className="text-[10px] uppercase text-[#3f6b5f] font-bold">trust</span>
                  </div>
                </div>
                <div className="mt-4 w-full h-2 rounded-full bg-[#e8eee9] overflow-hidden">
                  <div
                    className="h-full bg-[#2d5249]"
                    style={{ width: `${Math.min(100, trust)}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 grid grid-cols-2 gap-3 content-start">
                <Meta label="Authz" value={inspection.authzAllow ? "allow" : "deny"} ok={inspection.authzAllow} />
                <Meta label="Confidence" value={`${conf}%`} />
                <Meta label="Risk" value={String(inspection.risk)} />
                <Meta label="Sensitivity" value={inspection.sensitivity || "—"} />
              </div>

              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f]">Exchange</p>
                {queryPreview ? (
                  <div>
                    <span className="text-[10px] text-[#8a9a94]">User</span>
                    <p className="text-xs text-[#1c2b28] mt-0.5 line-clamp-4">{queryPreview}</p>
                  </div>
                ) : null}
                <div>
                  <span className="text-[10px] text-[#8a9a94]">PRAMĀṆA</span>
                  <p className="text-xs text-[#1c2b28] mt-0.5 line-clamp-5">{answerPreview || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {(tab === "overview" || tab === "hops") && (
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mb-3">
                Agent hops
              </p>
              <ol className="space-y-2">
                {inspection.hops.map((h, i) => (
                  <li
                    key={`${h.agent}-${i}`}
                    className="flex gap-3 p-3 rounded-xl bg-white/80 border border-[rgba(45,82,73,0.1)]"
                  >
                    <span className="text-[10px] font-black text-[#3f6b5f] w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm text-[#1c2b28]">{h.agent}</strong>
                        <code className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f6f7f5] text-[#2d5249]">
                          {h.status}
                        </code>
                      </div>
                      <p className="text-xs text-[#5c6b66] mt-1">{h.detail}</p>
                    </div>
                    {h.status === "ok" || h.status === "allow" || h.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2d5249] shrink-0" />
                    ) : h.status === "deny" || h.status === "refuse" || h.status === "fail" ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(tab === "overview" || tab === "evidence") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mb-3">
                  Citations
                </p>
                {inspection.citations?.length ? (
                  <ul className="space-y-2">
                    {inspection.citations.map((c) => (
                      <li
                        key={c.docId}
                        className="p-3 rounded-xl bg-white/80 border border-[rgba(45,82,73,0.1)]"
                      >
                        <code className="text-[10px] text-[#3f6b5f]">{c.docId}</code>
                        <p className="text-xs text-[#1c2b28] mt-1">{c.title}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#8a9a94]">No citations on this path.</p>
                )}
              </div>
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mb-3">
                  Provenance
                </p>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-[#8a9a94]">Ticket</dt>
                    <dd className="text-[#1c2b28] mt-0.5">{inspection.provenance?.ticket || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8a9a94]">Doc IDs</dt>
                    <dd className="text-[#1c2b28] mt-0.5 break-all">
                      {inspection.provenance?.docIds?.length
                        ? inspection.provenance.docIds.join(", ")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#8a9a94]">Entities</dt>
                    <dd className="text-[#1c2b28] mt-0.5">
                      {inspection.provenance?.entities?.length
                        ? inspection.provenance.entities.join(", ")
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {(tab === "overview" || tab === "model") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mb-3">
                  Generator
                </p>
                <strong className="text-[#1c2b28] text-sm">{inspection.llm.model}</strong>
                <p className="text-xs text-[#5c6b66] mt-1">
                  {inspection.llm.usedLlm
                    ? `Provider · ${inspection.llm.provider ?? "llm"}`
                    : "Local grounded path"}
                </p>
                {inspection.llm.note ? (
                  <p className="text-xs text-[#1c2b28] mt-2">{inspection.llm.note}</p>
                ) : null}
                <pre className="mt-3 text-[10px] text-[#5c6b66] bg-white/90 p-3 rounded-xl overflow-auto max-h-40 border border-[rgba(45,82,73,0.1)]">
                  {JSON.stringify(inspection.llm, null, 2)}
                </pre>
              </div>
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mb-3">
                  Explanation
                </p>
                <ul className="space-y-2">
                  {(inspection.explanation?.length
                    ? inspection.explanation
                    : ["Trust path sealed by govern."]
                  ).map((line, i) => (
                    <li key={i} className="text-xs text-[#1c2b28] pl-3 border-l-2 border-[#3f6b5f]">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === "raw" && (
            <div className="glass-panel rounded-2xl p-5">
              <pre className="text-[10px] text-[#1c2b28] overflow-auto max-h-[60vh]">
                {JSON.stringify(inspection, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/80 border border-[rgba(45,82,73,0.1)]">
      <span className="text-[10px] text-[#8a9a94] uppercase tracking-wider">{label}</span>
      <div
        className={`text-sm font-bold mt-0.5 ${
          ok === true ? "text-[#2d5249]" : ok === false ? "text-rose-600" : "text-[#1c2b28]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
