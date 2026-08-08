import { useState, type FormEvent } from "react";
import { client } from "../api/client";
import { MessageSquareHeart, Send, X } from "lucide-react";

const CATEGORIES = [
  { id: "cli", label: "CLI" },
  { id: "helix", label: "Helix" },
  { id: "stage:evaluate", label: "Evaluate" },
  { id: "stage:build", label: "Build" },
  { id: "stage:diagnose", label: "Diagnose" },
] as const;

/** Bottom dock: sends Mutagent product feedback via backend → `mutagent feedback send`. */
export function FeedbackDock() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]["id"]>("cli");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await client.sendFeedback({
        feedback: body.trim(),
        category,
        title: title.trim() || undefined,
      });
      setMsg(
        res.feedbackId
          ? `Filed · ${res.feedbackId}`
          : res.message || "Feedback sent via Mutagent CLI",
      );
      setBody("");
      setTitle("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {open ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] glass-panel-glow rounded-[1.25rem] p-4 shadow-sage"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f]">
                Mutagent feedback
              </p>
              <p className="text-[11px] text-[#5c6b66]">
                Runs <code className="text-[#2d5249]">mutagent feedback send</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full text-[#5c6b66] hover:bg-[#f6f7f5]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                  category === c.id
                    ? "bg-[#2d5249] text-white border-[#2d5249]"
                    : "bg-white/80 text-[#5c6b66] border-[rgba(45,82,73,0.12)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <input
            className="w-full mb-2 px-3 py-2 rounded-xl glass-input text-xs"
            placeholder="Optional short title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
          <textarea
            className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
            rows={3}
            placeholder="What should Mutagent improve?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={4000}
          />
          {err ? <p className="text-rose-600 text-[11px] mt-1">{err}</p> : null}
          {msg ? <p className="text-[#2d5249] text-[11px] mt-1 font-semibold">{msg}</p> : null}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="mt-2 w-full py-2.5 rounded-full btn-sage text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Sending via CLI…" : "Send feedback"}
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full btn-sage text-xs shadow-sage"
      >
        <MessageSquareHeart className="w-4 h-4" />
        Feedback CLI
      </button>
    </div>
  );
}
