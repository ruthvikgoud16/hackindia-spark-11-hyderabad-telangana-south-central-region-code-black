import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MotionNetworkBackground } from "../components/MotionNetworkBackground";
import { ArrowRight } from "lucide-react";
import "./landing-sage.css";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="lp min-h-screen flex items-center justify-center p-4">
      <MotionNetworkBackground />
      <div className="lp-glow" aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-[1.35rem] border border-[rgba(45,82,73,0.12)] bg-[rgba(255,255,255,0.82)] backdrop-blur-xl shadow-[0_18px_50px_rgba(28,43,40,0.08)] p-6 sm:p-8">
        <Link to="/" className="text-xs font-semibold text-[#5c6b66] hover:text-[#2d5249]">
          ← Back to PRAMĀṆA
        </Link>
        <h1
          className="mt-4 text-3xl font-semibold text-[#2d5249]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          Speak with us
        </h1>
        <p className="text-xs text-[#5c6b66] mt-1 mb-6">
          Demos, partnerships, and enterprise questions.
        </p>
        {sent ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#2d5249] font-semibold mb-4">
              Thank you — message received.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-sage text-xs">
              Back home <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              className="w-full px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <textarea
              className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-none"
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
            />
            <button type="submit" className="w-full py-3.5 rounded-full btn-sage text-sm">
              Send message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
