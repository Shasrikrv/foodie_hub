"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.19 29.5 1 24 1 14.82 1 7.07 6.48 3.58 14.19l7.08 5.5C12.43 13.68 17.75 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.52 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.67c-.55 2.95-2.22 5.45-4.73 7.13l7.27 5.65C43.19 37.3 46.52 31.35 46.52 24.5z"/>
      <path fill="#FBBC05" d="M10.66 28.31A14.56 14.56 0 0 1 9.5 24c0-1.49.26-2.93.71-4.31L3.13 14.2A23.93 23.93 0 0 0 1 24c0 3.87.92 7.53 2.58 10.76l7.08-6.45z"/>
      <path fill="#34A853" d="M24 47c5.36 0 9.86-1.77 13.14-4.81l-7.27-5.65c-1.8 1.21-4.1 1.93-5.87 1.93-6.25 0-11.57-4.18-13.34-9.87l-7.08 6.45C7.07 41.52 14.82 47 24 47z"/>
      <path fill="none" d="M1 1h46v46H1z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.ok) {
      router.push("/auth/home");
    } else {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/auth/home" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
        />
      </div>
      <div>
        <label className="block text-white/80 text-sm font-medium mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
        />
      </div>
      {error && (
        <p className="text-red-300 text-sm bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
      <div className="text-right -mt-1">
        <a href="/auth/forgot-password" className="text-white/40 hover:text-orange-400 text-xs transition-colors">
          Forgot password?
        </a>
      </div>
      <button
        type="submit"
        disabled={loading || googleLoading}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/30"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/15" />
        <span className="text-white/40 text-xs">or</span>
        <div className="flex-1 h-px bg-white/15" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 disabled:opacity-60 text-stone-800 font-semibold py-3 rounded-xl transition-all"
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>
    </form>
  );
}
