"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

const AVATAR_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-600","bg-orange-500","bg-pink-500","bg-teal-500","bg-indigo-500"];
function avatarColor(n) { return AVATAR_COLORS[(n?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]; }
function initials(f, l) { return `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase(); }

function Avatar({ first, last, pic }) {
  if (pic) return <img src={pic} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />;
  return (
    <div className={`w-11 h-11 rounded-full ${avatarColor(first)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials(first, last)}
    </div>
  );
}

function typeLabel(type, postTitle) {
  switch (type) {
    case "comment": return <>commented on your post{postTitle ? <> &ldquo;<span className="font-semibold text-stone-700">{postTitle}</span>&rdquo;</> : ""}</>;
    case "like":    return <>liked your post{postTitle ? <> &ldquo;<span className="font-semibold text-stone-700">{postTitle}</span>&rdquo;</> : ""}</>;
    case "friend_request": return "sent you a friend request";
    case "friend_accepted": return "accepted your friend request";
    default: return "interacted with you";
  }
}

function typeIcon(type) {
  return { comment: "💬", like: "❤️", friend_request: "👋", friend_accepted: "🤝" }[type] ?? "🔔";
}

function typeCta(type) {
  if (type === "like" || type === "comment") return "View post →";
  if (type === "friend_request") return "See requests →";
  if (type === "friend_accepted") return "View friends →";
  return null;
}

function timeAgo(dt) {
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getHref(n) {
  if ((n.type === "like" || n.type === "comment") && n.post_id) {
    return `/auth/home?post=${n.post_id}`;
  }
  if (n.type === "friend_request" || n.type === "friend_accepted") {
    return "/auth/dashboard";
  }
  return null;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") load();
  }, [status]);

  const load = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(Array.isArray(data.data) ? data.data : []);
    setLoading(false);
    fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAllRead" }) });
  };

  const handleClick = (n) => {
    const href = getHref(n);
    if (href) router.push(href);
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <NavBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-black text-stone-800 text-2xl mb-5">Notifications</h1>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-12 text-center">
            <p className="text-5xl mb-4">🔔</p>
            <p className="text-stone-600 font-semibold">You&apos;re all caught up!</p>
            <p className="text-stone-400 text-sm mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden divide-y divide-stone-100">
            {notifications.map((n) => {
              const href = getHref(n);
              const cta = typeCta(n.type);
              return (
                <div
                  key={n.notification_id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    !n.is_read ? "bg-orange-50/60" : ""
                  } ${href ? "cursor-pointer hover:bg-orange-50 active:bg-orange-100" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar first={n.first_name} last={n.last_name} pic={n.profile_pic} />
                    <span className="absolute -bottom-1 -right-1 text-sm leading-none bg-white rounded-full p-0.5">
                      {typeIcon(n.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 leading-snug">
                      <span className="font-semibold text-stone-900">{n.first_name} {n.last_name}</span>{" "}
                      {typeLabel(n.type, n.post_title)}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{timeAgo(n.created_at)}</p>
                    {cta && href && (
                      <p className="text-xs text-orange-500 font-semibold mt-1.5">{cta}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                    {href && (
                      <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
