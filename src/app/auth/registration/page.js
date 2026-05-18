"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function RegistrationPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
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
              disabled={loading}
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
