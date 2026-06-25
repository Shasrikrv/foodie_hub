"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function SetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.recoveryComplete) {
      router.push("/auth/home");
    }
  }, [status, session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!recoveryEmail.trim() && !phoneNumber.trim()) {
      setError("Please provide a recovery email or phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/recovery-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryEmail, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      await update("refresh");
      router.push("/auth/home");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") return null;

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Image src="/images/pexe.jpg" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-orange-950/50" />

      <div className="relative z-10 w-full max-w-sm px-5 py-8">
        <div className="text-center mb-7">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-orange-400">Foodie</span>
              <span className="text-white">Hub</span>
            </h1>
          </Link>
          <p className="text-white/60 mt-1.5 text-sm">Complete your account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-1">Add a Recovery Method</h2>
          <p className="text-white/50 text-sm mb-5">
            To protect your account, please provide at least one recovery option before continuing.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">Recovery email</label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="backup@example.com"
                className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-white/40 text-xs">or</span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">Phone number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-300 text-sm bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/30"
            >
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
