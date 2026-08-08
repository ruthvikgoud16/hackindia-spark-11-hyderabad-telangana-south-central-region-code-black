import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { Role } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ROLES } from "../auth/roles";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import "../pages/landing-sage.css";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 14 24 14c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.6l.1.1 6.2 5.2C36.8 41.2 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.8 1.6 2.8 1.1.1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.8 3.8 18.8 4.1 18.8 4.1c.6 1.6.2 2.8.1 3.1.8.9 1.2 2 1.2 3.3 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

export function LoginPage() {
  const { user, loginWithOAuth } = useAuth();
  const [role, setRole] = useState<Role>("employee");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"google" | "github" | null>(null);

  if (user) return <Navigate to="/app" replace />;

  async function start(provider: "google" | "github") {
    setBusy(provider);
    setError("");
    try {
      await loginWithOAuth(provider, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
      setBusy(null);
    }
  }

  return (
    <div className="lp min-h-screen flex items-center justify-center p-4">
      <MotionNetworkBackground />
      <div className="lp-glow" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-[1.35rem] border border-[rgba(45,82,73,0.12)] bg-[rgba(255,255,255,0.82)] backdrop-blur-xl shadow-[0_18px_50px_rgba(28,43,40,0.08)] p-6 sm:p-8">
        <Link to="/" className="text-xs font-semibold text-[#5c6b66] hover:text-[#2d5249]">
          ← Back to PRAMĀṆA
        </Link>
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight text-[#2d5249]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          Sign in
        </h1>
        <p className="text-xs text-[#5c6b66] mt-1 mb-5">
          Continue with Google or GitHub · pick your clearance role first.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`text-left p-3 rounded-xl border text-xs transition-all ${
                role === r.id
                  ? "bg-[#2d5249] border-[#2d5249] text-white"
                  : "bg-white/70 border-[rgba(45,82,73,0.12)] text-[#5c6b66] hover:border-[#3f6b5f]"
              }`}
            >
              <div className="font-bold">{r.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{r.blurb}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void start("google")}
            className="w-full py-3 px-4 rounded-full border border-[rgba(45,82,73,0.14)] bg-white text-sm font-semibold text-[#1c2b28] hover:bg-[#f6f7f5] disabled:opacity-60 flex items-center justify-center gap-3 shadow-sm"
          >
            <GoogleIcon />
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void start("github")}
            className="w-full py-3 px-4 rounded-full bg-[#24292f] text-sm font-semibold text-white hover:bg-[#1b1f23] disabled:opacity-60 flex items-center justify-center gap-3 shadow-sm"
          >
            <GitHubIcon />
            {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>
        </div>

        {error ? <p className="text-rose-600 text-xs mt-4">{error}</p> : null}

        <p className="text-[10px] text-[#8a9a94] mt-5 text-center leading-relaxed">
          Powered by Supabase Auth. Enable Google & GitHub providers in your
          Supabase project and add redirect URL{" "}
          <code className="text-[#2d5249]">/oauth/callback</code>.
        </p>
      </div>
    </div>
  );
}
