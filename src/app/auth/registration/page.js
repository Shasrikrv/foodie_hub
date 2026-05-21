"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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

export default function RegistrationPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleRegistration = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const res = await fetch("/api/user/login/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push("/");
    } else if (data.errors) {
      setErrors(data.errors.map((e) => e.message));
    } else {
      setErrors([data.error || data.message || "Registration failed"]);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/auth/home" });
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Image src="/images/pexe.jpg" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-orange-950/50" />

      <div className="relative z-10 w-full max-w-sm px-5 py-8">
        {/* Brand */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-orange-400">Foodie</span>
              <span className="text-white">Hub</span>
            </h1>
          </Link>
          <p className="text-white/60 mt-1.5 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 disabled:opacity-60 text-stone-800 font-semibold py-3 rounded-xl transition-all mb-4"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting..." : "Sign up with Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-white/40 text-xs">or fill in details</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          <form onSubmit={handleRegistration} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/80 text-xs font-medium mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
                />
              </div>
              <div>
                <label className="block text-white/80 text-xs font-medium mb-1.5">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
                />
              </div>
            </div>
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
                placeholder="Min 8 chars, uppercase, number, symbol"
                required
                className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/35 text-sm focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
              />
            </div>

            {errors.length > 0 && (
              <ul className="bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-3 space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-red-300 text-xs">{err}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/30"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/10 text-center">
            <p className="text-white/50 text-xs mb-2">Already have an account?</p>
            <Link
              href="/"
              className="block bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2.5 rounded-xl transition-all text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
