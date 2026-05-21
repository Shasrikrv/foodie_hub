"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleUser, setGoogleUser] = useState(false);
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDevUrl("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.googleUser) {
        setGoogleUser(true);
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
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Check your email</h2>
              <p className="text-white/60 text-sm mb-5">
                If an account with <span className="text-white font-medium">{email}</span> exists, we&apos;ve sent a reset link.
              </p>
              {devUrl && (
                <div className="mb-4 bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3">
                  <p className="text-yellow-300 text-xs font-semibold mb-1">Dev mode — no SMTP configured:</p>
                  <Link href={devUrl} className="text-orange-300 text-xs break-all underline">{devUrl}</Link>
                </div>
              )}
              <Link href="/" className="block bg-orange-500 hover:bg-orange-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Back to Sign In
              </Link>
            </div>
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
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Forgot Password?</h2>
              <p className="text-white/50 text-sm mb-5">Enter your email and we&apos;ll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {loading ? "Sending…" : "Send Reset Link"}
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
