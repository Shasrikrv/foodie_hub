"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, active, children }) {
  return (
    <Link href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden sm:block ${
        active ? "bg-orange-50 text-orange-600" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
      }`}>
      {children}
    </Link>
  );
}

function IconBtn({ href, active, badge, title, children }) {
  return (
    <Link href={href} title={title}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
        active ? "bg-orange-100 text-orange-600" : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
      }`}>
      {children}
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const poll = () => {
      fetch("/api/notifications").then(r => r.json()).then(d => setUnreadNotif(d.unread ?? 0)).catch(() => {});
      fetch("/api/chat").then(r => r.json()).then(d => {
        const total = (d.data || []).reduce((sum, f) => sum + (f.unread || 0), 0);
        setUnreadChat(total);
      }).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = session?.user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
  const pic = session?.user?.profilePic;

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-stone-100 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/auth/home" className="text-xl font-black tracking-tight">
          <span className="text-orange-500">Foodie</span><span className="text-stone-800">Hub</span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink href="/auth/home" active={pathname === "/auth/home"}>Home</NavLink>
          <NavLink href="/auth/dashboard" active={pathname === "/auth/dashboard"}>Friends</NavLink>

          {/* Chat */}
          <IconBtn href="/auth/chat" active={pathname.startsWith("/auth/chat")} badge={unreadChat} title="Messages">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </IconBtn>

          {/* Notifications */}
          <IconBtn href="/auth/notifications" active={pathname === "/auth/notifications"} badge={unreadNotif} title="Notifications">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </IconBtn>

          {/* Post button */}
          <Link href="/auth/post"
            className="ml-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-colors shadow-sm hidden sm:block">
            + Post
          </Link>

          {/* Profile dropdown */}
          <div className="relative ml-1" ref={profileRef}>
            <button onClick={() => setProfileOpen(p => !p)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-orange-300 transition-all flex-shrink-0 focus:outline-none">
              {pic ? (
                <img src={pic} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 text-xs font-bold transition-colors">
                  {initials}
                </div>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-stone-100 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-stone-100">
                  <p className="text-sm font-semibold text-stone-800 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-stone-400 truncate">{session?.user?.email}</p>
                </div>
                {[
                  ["/auth/settings", "⚙️ Settings"],
                  ["/auth/dashboard", "👥 Friends"],
                  ["/auth/chat", "💬 Messages"],
                  ["/auth/notifications", "🔔 Notifications"],
                  ...(session?.user?.isAdmin ? [["/auth/admin", "🛡️ Admin Panel"]] : []),
                ].map(([href, label]) => (
                  <Link key={href} href={href} onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                    {label}
                  </Link>
                ))}
                <div className="border-t border-stone-100 mt-1">
                  <button onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
