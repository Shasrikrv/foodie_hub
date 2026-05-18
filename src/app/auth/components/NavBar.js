"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-orange-50 text-orange-600"
          : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
      }`}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-stone-100 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/auth/home" className="text-xl font-black tracking-tight">
          <span className="text-orange-500">Foodie</span>
          <span className="text-stone-800">Hub</span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink href="/auth/home" active={pathname === "/auth/home"}>
            Home
          </NavLink>
          <NavLink href="/auth/dashboard" active={pathname === "/auth/dashboard"}>
            Friends
          </NavLink>
          <Link
            href="/auth/post"
            className="ml-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors shadow-sm"
          >
            + Post
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title={`${session?.user?.name ?? ""} — Sign out`}
            className="ml-2 w-8 h-8 rounded-full bg-stone-100 hover:bg-red-50 hover:text-red-500 text-stone-700 text-xs font-bold flex items-center justify-center transition-colors"
          >
            {initials}
          </button>
        </div>
      </div>
    </nav>
  );
}
