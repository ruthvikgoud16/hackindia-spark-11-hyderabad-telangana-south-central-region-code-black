import { Link } from "react-router-dom";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import { Lock, Search, FileText, Shield } from "lucide-react";
import "./landing-sage.css";

function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className="lp-mark"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 9 L29 26 H11 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="20" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function LandingPage() {
  const startTo = "/login";

  const metrics = [
    { val: "Gate-first", label: "Authz before retrieve", sub: "No retrieve-then-filter" },
    { val: "Every claim", label: "Citation grounding", sub: "Evidence IDs required" },
    { val: "6", label: "Named agents", sub: "Fixed trust pipeline" },
    { val: "5 criteria", label: "Binary eval", sub: "Refuse = success" },
  ];

  const phases = [
    {
      num: "01",
      title: "Privacy gate",
      desc: "Authorize the query before any corpus touch. Deny is first-class.",
      icon: Lock,
    },
    {
      num: "02",
      title: "Hybrid GraphRAG",
      desc: "Vector + knowledge graph retrieval on the authorized slice only.",
      icon: Search,
    },
    {
      num: "03",
      title: "Draft & verify",
      desc: "Every claim maps to evidence IDs. Soft hedges are not allowed.",
      icon: FileText,
    },
    {
      num: "04",
      title: "Factcheck & govern",
      desc: "Unsupported → refuse. Provenance and trust score close the loop.",
      icon: Shield,
    },
  ];

  const loop = ["*build", "*evaluate", "*diagnose", "*optimize"];

  return (
    <div className="lp">
      <MotionNetworkBackground />
      <div className="lp-glow" aria-hidden />

      <header className="lp-nav">
        <Link to="/" className="lp-brand">
          <Mark />
          <span>
            <strong>PRAMĀṆA</strong>
            <em>Evidence-gated enterprise knowledge</em>
          </span>
        </Link>
        <Link to="/login" className="lp-login">
          Login
        </Link>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <p className="lp-badge">
            <span /> Built with Mutagent · Evidence before every answer
          </p>

          <h1>PRAMĀṆA</h1>
          <p className="lp-tagline">Truth is not assumed. It is proven.</p>
          <p className="lp-lead">
            Every answer earned through evidence. Every claim traced to its source.
          </p>

          <Link to={startTo} className="lp-cta">
            Get Started
          </Link>

          <div className="lp-loop">
            <p className="lp-loop-label">
              <span /> Self-evolving loop
            </p>
            <div className="lp-loop-row">
              {loop.map((step, i) => (
                <span key={step} className="lp-loop-item">
                  <span className="lp-pill">{step}</span>
                  {i < loop.length - 1 ? <span className="lp-arrow">→</span> : null}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-metrics">
          {metrics.map((m) => (
            <article key={m.val} className="lp-metric">
              <h3>{m.val}</h3>
              <strong>{m.label}</strong>
              <span>{m.sub}</span>
            </article>
          ))}
        </section>

        <section className="lp-pipeline">
          <h2>The evidence-gated pipeline</h2>
          <p className="lp-pipe-sub">
            Privacy gate → GraphRAG → draft → verify → factcheck → govern
          </p>
          <div className="lp-phases">
            {phases.map((p) => {
              const Icon = p.icon;
              return (
                <article key={p.num} className="lp-phase">
                  <div className="lp-phase-top">
                    <span className="lp-num">{p.num}</span>
                    <Icon className="lp-phase-icon" strokeWidth={1.5} />
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
