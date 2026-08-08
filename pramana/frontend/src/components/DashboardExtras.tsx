import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Sparkles } from "lucide-react";

const TIPS = [
  "Denial before retrieve is a pass — not a failure.",
  "Every claim needs ≥1 authorized evidence id.",
  "Unsupported answers should REFUSE, not hedge.",
  "Govern always runs last and seals the audit trail.",
  "Role stamp at login binds clearance for the session.",
];

const PIPE = ["privacy_gate", "retriever", "draft", "verify", "factcheck", "govern"];

/** Compact dashboard extras — keeps the workspace feeling alive. */
export function DashboardExtras({
  role,
  clearance,
  messageCount = 0,
}: {
  role: string;
  clearance: string;
  messageCount?: number;
}) {
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const [now, setNow] = useState(() => new Date());
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % PIPE.length), 1600);
    return () => clearInterval(t);
  }, []);

  const trustWarmth =
    clearance === "L4" ? 92 : clearance === "L3" ? 78 : clearance === "L2" ? 64 : 48;

  return (
    <div className="px-4 py-2.5 border-b border-[rgba(45,82,73,0.08)] bg-white/40 space-y-2.5 shrink-0">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-[11px] text-[#5c6b66] flex items-start gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[#3f6b5f] shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-[#2d5249]">Tip · </span>
            {tip}
          </span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums text-[#8a9a94]">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f6f7f5] border border-[rgba(45,82,73,0.12)] text-[#3f6b5f]">
            {role} · {clearance}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 min-w-[7.5rem]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3f6b5f]" />
          <div className="flex-1 h-1.5 rounded-full bg-[#e8eee9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2d5249] transition-all duration-700"
              style={{ width: `${trustWarmth}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-[#5c6b66]">{trustWarmth}</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {PIPE.map((step, i) => (
            <span
              key={step}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-colors ${
                i === pulse
                  ? "bg-[#2d5249] text-white border-[#2d5249]"
                  : "bg-white/80 text-[#8a9a94] border-[rgba(45,82,73,0.1)]"
              }`}
            >
              {step}
            </span>
          ))}
        </div>

        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#5c6b66]">
          <Activity className="w-3 h-3 text-[#3f6b5f]" />
          {messageCount} msgs · live
        </span>
      </div>
    </div>
  );
}
