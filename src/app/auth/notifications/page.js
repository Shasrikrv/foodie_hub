"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

const AVATAR_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-600","bg-orange-500","bg-pink-500","bg-teal-500","bg-indigo-500"];
function avatarColor(n) { return AVATAR_COLORS[(n?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]; }
function initials(f, l) { return `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase(); }

function Avatar({ first, last, pic }) {
  if (pic) return <img src={pic} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  return (
    <div className={`w-10 h-10 rounded-full ${avatarColor(first)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials(first, last)}
    </div>
  );
}

function typeLabel(type, postTitle) {
  switch (type) {
    case "comment": return `commented on your post${postTitle ? ` "${postTitle}"` : ""}`;
    case "like": return `liked your post${postTitle ? ` "${postTitle}"` : ""}`;
    case "friend_request": return "sent you a friend request";
    case "friend_accepted": return "accepted your friend request";
    default: return "interacted with you";
  }
}
function typeIcon(type) {
  return { comment: "💬", like: "❤️", friend_request: "👋", friend_accepted: "🤝" }[type] ?? "🔔";
}
function timeAgo(dt) {
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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
    // Mark all as read
    fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAllRead" }) });
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
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            {notifications.map((n, i) => (
              <div key={n.notification_id}
                className={`flex items-start gap-4 px-5 py-4 ${!n.is_read ? "bg-orange-50/60" : ""} ${i < notifications.length - 1 ? "border-b border-stone-100" : ""}`}>
                <div className="relative flex-shrink-0">
                  <Avatar first={n.first_name} last={n.last_name} pic={n.profile_pic} />
                  <span className="absolute -bottom-1 -right-1 text-sm">{typeIcon(n.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800">
                    <span className="font-semibold">{n.first_name} {n.last_name}</span>{" "}
                    {typeLabel(n.type, n.post_title)}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
