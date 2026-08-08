import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import { ArrowRight } from "lucide-react";
import "./landing-sage.css";

export function AccountPage() {
  const nav = useNavigate();
  const { user, loading, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setDept(user.dept);
  }, [user]);

  if (loading) return <div className="boot">Opening Pramana…</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await updateProfile({
        displayName,
        username,
        dept,
        ...(password ? { password } : {}),
      });
      setPassword("");
      setMsg("Account updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp min-h-screen flex items-center justify-center p-4">
      <MotionNetworkBackground />
      <div className="lp-glow" aria-hidden />
      <div className="relative z-10 w-full max-w-xl rounded-[1.35rem] border border-[rgba(45,82,73,0.12)] bg-[rgba(255,255,255,0.82)] backdrop-blur-xl shadow-[0_18px_50px_rgba(28,43,40,0.08)] p-6 sm:p-8">
        <Link to="/app" className="text-xs font-semibold text-[#5c6b66] hover:text-[#2d5249]">
          ← Back to workspace
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f6b5f] mt-4 mb-1">
          {user.role} · {user.clearance} · {user.dept}
        </p>
        <h1
          className="text-3xl font-semibold text-[#2d5249]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          Account
        </h1>
        <p className="text-xs text-[#5c6b66] mt-1 mb-6">
          Update profile details for this workspace.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <input
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Department"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              required
            />
            <input
              type="password"
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="New password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          {error ? <p className="text-rose-600 text-xs">{error}</p> : null}
          {msg ? <p className="text-[#2d5249] text-xs font-semibold">{msg}</p> : null}
          <div className="flex gap-2 pt-1">
            <button className="flex-1 py-3.5 rounded-full btn-sage text-sm flex items-center justify-center gap-2" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="px-4 py-3 rounded-full border border-[rgba(45,82,73,0.18)] text-xs font-bold text-[#2d5249]"
              onClick={() => {
                void logout().then(() => nav("/login"));
              }}
            >
              Log out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
