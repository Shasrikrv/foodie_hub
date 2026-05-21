"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

function timeAgo(dt) {
  if (!dt) return "";
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(dt).toLocaleDateString();
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") {
      if (!session?.user?.isAdmin) { router.push("/auth/home"); return; }
      loadData();
    }
  }, [status, session]);

  const loadData = async () => {
    setLoading(true);
    const [uRes, tRes] = await Promise.all([
      fetch("/api/admin?view=users"),
      fetch("/api/admin?view=tickets"),
    ]);
    const [uData, tData] = await Promise.all([uRes.json(), tRes.json()]);
    setUsers(Array.isArray(uData.data) ? uData.data : []);
    setTickets(Array.isArray(tData.data) ? tData.data : []);
    setLoading(false);
  };

  const action = async (body) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setActionMsg("Done!"); loadData(); setTimeout(() => setActionMsg(""), 2000); }
    else setActionMsg(data.error || "Error");
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-black text-stone-800 text-2xl">Admin Panel</h1>
          {actionMsg && <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{actionMsg}</span>}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[["users", `Users (${users.length})`], ["tickets", `Tickets (${tickets.filter(t=>t.status==="open").length} open)`]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === val ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Posts</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Friends</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">AI Credits</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-stone-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {u.profile_pic ? (
                            <img src={u.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                              {u.first_name?.[0]}{u.last_name?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-stone-800">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-stone-400">{u.email}</p>
                          </div>
                        </div>
                        {u.is_admin ? <span className="ml-11 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Admin</span> : null}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{u.post_count}</td>
                      <td className="px-4 py-3 text-stone-600">{u.friend_count}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-stone-700">{u.ai_credits}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => action({ action: "addCredits", userId: u.user_id, credits: 5 })}
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold transition-colors">
                            +5 Credits
                          </button>
                          {u.user_id !== session?.user?.id && (
                            <button onClick={() => action({ action: "toggleAdmin", userId: u.user_id })}
                              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-full font-semibold transition-colors">
                              {u.is_admin ? "Remove Admin" : "Make Admin"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div className="space-y-3">
            {tickets.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-stone-400">No support tickets yet.</div>
            )}
            {tickets.map((t) => (
              <div key={t.ticket_id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${t.status === "open" ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-500"}`}>
                        {t.status}
                      </span>
                      <span className="text-xs text-stone-400">{timeAgo(t.created_at)}</span>
                    </div>
                    <p className="font-semibold text-stone-800">{t.subject}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{t.email} {t.first_name ? `· ${t.first_name} ${t.last_name}` : "· Guest"}</p>
                    <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{t.message}</p>
                  </div>
                  {t.status === "open" && (
                    <button onClick={() => action({ action: "resolveTicket", ticketId: t.ticket_id })}
                      className="flex-shrink-0 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full font-semibold transition-colors">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
