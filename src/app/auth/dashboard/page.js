"use client";
import { useEffect, useState, useRef } from "react";
import NavBar from "../components/NavBar";

const GRADIENT_PAIRS = [
  ["from-violet-400", "to-purple-600"],
  ["from-blue-400", "to-cyan-600"],
  ["from-emerald-400", "to-teal-600"],
  ["from-orange-400", "to-red-500"],
  ["from-pink-400", "to-rose-600"],
  ["from-amber-400", "to-orange-500"],
  ["from-indigo-400", "to-blue-600"],
];

function gradientFor(name) {
  const [a, b] = GRADIENT_PAIRS[(name?.charCodeAt(0) ?? 0) % GRADIENT_PAIRS.length];
  return `bg-gradient-to-br ${a} ${b}`;
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function Avatar({ first, last, src, size = "md" }) {
  const sz = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-2xl",
  }[size];

  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow`} />;
  return (
    <div className={`${sz} rounded-full ${gradientFor(first)} flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white shadow`}>
      {initials(first, last)}
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
    </span>
  );
}

export default function Dashboard() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchDone, setSearchDone] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("requests");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    Promise.all([
      fetch("/api/connections/authorize").then((r) => r.json()),
      fetch("/api/connections/friendsData").then((r) => r.json()),
    ]).then(([authData, friendData]) => {
      setIncomingRequests(Array.isArray(authData.data) ? authData.data : []);
      setFriends(Array.isArray(friendData.data) ? friendData.data : []);
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    const res = await fetch(`/api/connections/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data.data) ? data.data : []);
    setSearchDone(true);
  };

  const setLoading = (userId, val) => setActionLoading((p) => ({ ...p, [userId]: val }));

  const updateRelationship = (userId, rel) =>
    setSearchResults((prev) => prev.map((u) => (u.user_id === userId ? { ...u, relationship: rel } : u)));

  const handleUnfollow = async (targetUserId) => {
    setLoading(targetUserId, true);
    const res = await fetch("/api/connections/unfollow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    setLoading(targetUserId, false);
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.user_id !== targetUserId));
      updateRelationship(targetUserId, null);
    }
  };

  const sendRequest = async (user) => {
    setLoading(user.user_id, true);
    const res = await fetch("/api/connections/friendrequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user.user_id }),
    });
    setLoading(user.user_id, false);
    if (res.ok) updateRelationship(user.user_id, "pending_sent");
  };

  const acceptFromSearch = async (user) => {
    let req = incomingRequests.find((r) => r.user_id === user.user_id);
    if (!req) {
      const res = await fetch("/api/connections/authorize").then((r) => r.json());
      const requests = Array.isArray(res.data) ? res.data : [];
      setIncomingRequests(requests);
      req = requests.find((r) => r.user_id === user.user_id);
      if (!req) return;
    }
    handleAuthorization(req.request_id, 2, user.user_id);
  };

  const handleAuthorization = async (requestId, status, fromSearchUserId = null) => {
    const res = await fetch("/api/connections/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    const data = await res.json();
    if (!data.error) {
      setIncomingRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      if (status === 2) {
        fetch("/api/connections/friendsData").then((r) => r.json()).then((d) => setFriends(Array.isArray(d.data) ? d.data : []));
        if (fromSearchUserId) updateRelationship(fromSearchUserId, "friends");
      }
    }
  };

  const tabs = [
    { id: "requests", label: "Requests", count: incomingRequests.length },
    { id: "friends", label: "Friends", count: friends.length },
    { id: "discover", label: "Discover" },
  ];

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />

      {/* Hero header */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 px-4 pt-6 pb-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-white font-black text-2xl mb-1">People</h1>
          <p className="text-orange-100 text-sm">Connect with fellow food lovers</p>

          {/* Search bar */}
          <div className={`mt-5 flex gap-2 transition-all duration-200 ${searchFocused ? "scale-100" : ""}`}>
            <div className="flex-1 relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchDone(false); if (e.target.value) setActiveTab("discover"); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => { setSearchFocused(true); setActiveTab("discover"); }}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-white/95 backdrop-blur rounded-2xl pl-10 pr-4 py-3 text-stone-800 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              />
            </div>
            <button onClick={handleSearch}
              className="bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white font-semibold px-5 py-3 rounded-2xl text-sm transition-all shadow-lg">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Tab strip — overlaps hero */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 mb-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-1.5 flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? "bg-orange-500 text-white shadow-sm" : "text-stone-500 hover:bg-stone-50"}`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? "bg-white/30 text-white" : "bg-orange-100 text-orange-600"}`}>
                  {t.count}
                </span>
              )}
              {t.id === "requests" && incomingRequests.length > 0 && activeTab !== "requests" && <PulsingDot />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">

        {/* ── Friend Requests Tab ── */}
        {activeTab === "requests" && (
          <div>
            {incomingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">👋</div>
                <p className="font-bold text-stone-700 text-lg">No pending requests</p>
                <p className="text-stone-400 text-sm mt-2">When someone sends you a friend request, it&apos;ll appear here.</p>
                <button onClick={() => setActiveTab("discover")}
                  className="mt-6 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-orange-100">
                  Discover People
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div key={req.request_id}
                    className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <Avatar first={req.first_name} last={req.last_name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-800 text-base">{req.first_name} {req.last_name}</p>
                      <p className="text-xs text-stone-400 truncate">{req.email}</p>
                      <p className="text-xs text-orange-500 font-medium mt-0.5">Wants to connect with you</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleAuthorization(req.request_id, 2)}
                        className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all shadow-sm shadow-orange-100 whitespace-nowrap">
                        Accept
                      </button>
                      <button onClick={() => handleAuthorization(req.request_id, 3)}
                        className="bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-500 text-sm font-semibold px-5 py-2 rounded-xl transition-all whitespace-nowrap">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Friends Tab ── */}
        {activeTab === "friends" && (
          <div>
            {friends.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🍜</div>
                <p className="font-bold text-stone-700 text-lg">No friends yet</p>
                <p className="text-stone-400 text-sm mt-2">Search for food lovers and send them a friend request!</p>
                <button onClick={() => setActiveTab("discover")}
                  className="mt-6 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-orange-100">
                  Find People
                </button>
              </div>
            ) : (
              <div>
                <p className="text-stone-400 text-sm mb-3 px-1">{friends.length} friend{friends.length !== 1 ? "s" : ""}</p>
                <div className="grid grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div key={friend.user_id}
                      className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
                      <div className="relative mb-3">
                        <Avatar first={friend.first_name} last={friend.last_name} size="xl" />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-400 border-2 border-white rounded-full w-4 h-4" />
                      </div>
                      <p className="font-bold text-stone-800 text-sm leading-tight">{friend.first_name} {friend.last_name}</p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">Friends</p>
                      <button
                        onClick={() => handleUnfollow(friend.user_id)}
                        disabled={actionLoading[friend.user_id]}
                        className="mt-3 w-full text-xs font-semibold text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 border border-stone-200 hover:border-red-200 disabled:opacity-60 py-1.5 rounded-xl transition-all">
                        {actionLoading[friend.user_id] ? "…" : "Unfollow"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Discover / Search Tab ── */}
        {activeTab === "discover" && (
          <div>
            {!searchDone ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-10 text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔍</div>
                <p className="font-bold text-stone-700 text-lg">Find people</p>
                <p className="text-stone-400 text-sm mt-2">Search by name or email address above to discover food lovers near you.</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-10 text-center">
                <div className="text-4xl mb-3">🤷</div>
                <p className="font-semibold text-stone-600">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-stone-400 text-sm mt-1">Try a different name or email address.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-stone-400 text-sm px-1">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;</p>
                {searchResults.map((user) => {
                  const rel = user.relationship;
                  return (
                    <div key={user.user_id}
                      className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <Avatar first={user.first_name} last={user.last_name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-800">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-stone-400 truncate">{user.email}</p>
                        {rel === "friends" && <p className="text-xs text-emerald-600 font-medium mt-0.5">Already friends</p>}
                        {rel === "pending_sent" && <p className="text-xs text-blue-500 font-medium mt-0.5">Request sent</p>}
                        {rel === "pending_received" && <p className="text-xs text-orange-500 font-medium mt-0.5">Sent you a request</p>}
                      </div>

                      {/* Action button */}
                      {!rel && (
                        <button onClick={() => sendRequest(user)} disabled={actionLoading[user.user_id]}
                          className="bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-orange-100 whitespace-nowrap flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          {actionLoading[user.user_id] ? "…" : "Add"}
                        </button>
                      )}
                      {rel === "pending_sent" && (
                        <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-4 py-2 rounded-xl border border-stone-200 whitespace-nowrap">Requested</span>
                      )}
                      {rel === "pending_received" && (
                        <button onClick={() => acceptFromSearch(user)} disabled={actionLoading[user.user_id]}
                          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm whitespace-nowrap">
                          Accept
                        </button>
                      )}
                      {rel === "friends" && (
                        <button onClick={() => handleUnfollow(user.user_id)} disabled={actionLoading[user.user_id]}
                          className="text-xs font-semibold text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 border border-stone-200 hover:border-red-200 disabled:opacity-60 px-4 py-2 rounded-xl transition-all whitespace-nowrap">
                          {actionLoading[user.user_id] ? "…" : "Unfollow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
