"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const METHOD_LABELS = {
  email:          { icon: "✉️", label: "Account email" },
  recovery_email: { icon: "📧", label: "Recovery email" },
  sms:            { icon: "📱", label: "Text message (SMS)" },
};

const VIA_MESSAGES = {
  email:          "We sent a reset link to your account email.",
  recovery_email: "We sent a reset link to your recovery email.",
  sms:            "We sent a reset link to your phone via SMS.",
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 result
  const [methods, setMethods] = useState(null);   // array of { type, masked }
  const [lookupToken, setLookupToken] = useState("");

  // Step 2 result
  const [sent, setSent] = useState(false);
  const [via, setVia] = useState("");
  const [devUrl, setDevUrl] = useState("");

  const [googleUser, setGoogleUser] = useState(false);

  // Step 1 — submit email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.googleUser) {
        setGoogleUser(true);
      } else if (data.methods) {
        // Multiple recovery options — show choice screen
        setMethods(data.methods);
        setLookupToken(data.lookupToken);
      } else if (data.devResetUrl) {
        setDevUrl(data.devResetUrl);
        setSent(true);
      } else if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  // Step 2 — pick delivery method
  const handleMethodPick = async (method) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookupToken, method }),
      });
      const data = await res.json();
      if (data.devResetUrl) {
        setDevUrl(data.devResetUrl);
        setVia(method); setSent(true);
      } else if (res.ok) {
        setVia(data.via || method); setSent(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Image src="/images/pexe.jpg" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-orange-950/50" />

      <div className="relative z-10 w-full max-w-sm px-5 py-8">
        <div className="text-center mb-7">
          <Link href="/">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-orange-400">Foodie</span><span className="text-white">Hub</span>
            </h1>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">

          {/* ── Success ── */}
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Reset link sent!</h2>
              <p className="text-white/60 text-sm mb-5">{VIA_MESSAGES[via] || "If that account exists, we've sent a reset link."}</p>
              {devUrl && (
                <div className="mb-4 bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3">
                  <p className="text-yellow-300 text-xs font-semibold mb-1">Dev mode — link (no SMTP/SMS):</p>
                  <Link href={devUrl} className="text-orange-300 text-xs break-all underline">{devUrl}</Link>
                </div>
              )}
              <Link href="/" className="block bg-orange-500 hover:bg-orange-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Back to Sign In
              </Link>
            </div>

          /* ── Google account ── */
          ) : googleUser ? (
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-white font-bold text-lg mb-2">Google Account</h2>
              <p className="text-white/60 text-sm mb-5">
                This email is linked to a Google account. Sign in with Google — no password needed.
              </p>
              <Link href="/" className="block bg-orange-500 hover:bg-orange-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Back to Sign In
              </Link>
            </div>

          /* ── Step 2: choose delivery method ── */
          ) : methods ? (
            <>
              <h2 className="text-white font-bold text-lg mb-1">How should we send it?</h2>
              <p className="text-white/50 text-sm mb-5">Choose where to receive your password reset link.</p>
              <div className="space-y-3">
                {methods.map((m) => {
                  const meta = METHOD_LABELS[m.type] || { icon: "📩", label: m.type };
                  return (
                    <button
                      key={m.type}
                      onClick={() => handleMethodPick(m.type)}
                      disabled={loading}
                      className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 disabled:opacity-60 border border-white/20 rounded-2xl px-4 py-3.5 text-left transition-all"
                    >
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{meta.label}</p>
                        <p className="text-white/50 text-xs">{m.masked}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-red-300 text-sm bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
              <button
                onClick={() => { setMethods(null); setLookupToken(""); setError(""); }}
                className="mt-4 w-full text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                ← Use a different email
              </button>
            </>

          /* ── Step 1: enter account email ── */
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Forgot Password?</h2>
              <p className="text-white/50 text-sm mb-5">Enter your account email to get started.</p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 transition-all"
                  />
                </div>
                {error && (
                  <p className="text-red-300 text-sm bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-2.5">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  {loading ? "Checking…" : "Continue"}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">← Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
