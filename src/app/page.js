import Image from "next/image";
import Link from "next/link";
import LoginPage from "./auth/login/page";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background food image */}
      <Image
        src="/images/pexe.jpg"
        alt=""
        fill
        className="object-cover"
        priority
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-orange-950/50" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-5 py-8">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-orange-400">Foodie</span>
            <span className="text-white">Hub</span>
          </h1>
          <p className="text-white/60 mt-2 text-base font-light">
            Share recipes &middot; Inspire meals
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-5">Welcome back</h2>
          <LoginPage />
          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-white/50 text-xs text-center mb-3">New to FoodieHub?</p>
            <Link
              href="/auth/registration"
              className="block text-center bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2.5 rounded-xl transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          Join thousands sharing their food journey
        </p>
      </div>
    </main>
  );
}
