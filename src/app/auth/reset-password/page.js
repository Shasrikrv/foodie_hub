"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function ResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setValid(false); return; }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((d) => setValid(!!d.valid))
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/"), 2500);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  if (valid === null) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto" />
        <p className="text-white/60 text-sm mt-3">Validating link…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-white font-bold text-lg mb-2">Link Expired</h2>
        <p className="text-white/60 text-sm mb-5">This reset link is invalid or has already been used.</p>
        <Link href="/auth/forgot-password" className="block bg-orange-500 hover:bg-orange-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
          Request New Link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-white font-bold text-lg mb-2">Password Reset!</h2>
        <p className="text-white/60 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-white font-bold text-lg mb-1">Set New Password</h2>
      <p className="text-white/50 text-sm mb-5">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-1.5">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
            className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 transition-all"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-1.5">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
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
          {loading ? "Saving…" : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div className="text-white/60 text-center py-6 text-sm">Loading…</div>}>
            <ResetContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
