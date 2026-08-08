import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import "../pages/landing-sage.css";

/** Handles Google / GitHub OAuth return from Supabase. */
export function AuthCallbackPage() {
  const { user, loading, completeOAuthSession } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        await completeOAuthSession();
        setDone(true);
        nav("/app", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "OAuth callback failed");
      }
    })();
  }, [completeOAuthSession, nav]);

  if (!loading && user && !error) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="lp min-h-screen flex items-center justify-center p-4">
      <MotionNetworkBackground />
      <div className="lp-glow" aria-hidden />
      <div className="relative z-10 w-full max-w-sm rounded-[1.35rem] border border-[rgba(45,82,73,0.12)] bg-[rgba(255,255,255,0.85)] backdrop-blur-xl p-8 text-center shadow-[0_18px_50px_rgba(28,43,40,0.08)]">
        {error ? (
          <>
            <h1
              className="text-2xl font-semibold text-[#2d5249]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              Sign-in failed
            </h1>
            <p className="text-xs text-rose-600 mt-3 whitespace-pre-wrap">{error}</p>
            <Link
              to="/login"
              className="inline-flex mt-5 px-5 py-2.5 rounded-full bg-[#2d5249] text-white text-xs font-semibold"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1
              className="text-2xl font-semibold text-[#2d5249]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {done ? "Opening workspace…" : "Finishing sign-in…"}
            </h1>
            <p className="text-xs text-[#5c6b66] mt-2">
              Linking your Google / GitHub account to PRAMĀṆA.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
