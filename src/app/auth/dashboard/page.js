"use client";
import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-600",
  "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500",
];
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function Avatar({ first, last, size = "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full ${avatarColor(first)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials(first, last)}
    </div>
  );
}

// Returns the right button for a given relationship state
function RelationshipButton({ relationship, onAdd, onAccept, loading }) {
  if (relationship === "friends") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Following
      </span>
    );
  }
  if (relationship === "pending_sent") {
    return (
      <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-4 py-2 rounded-full border border-stone-200 cursor-default">
        Requested
      </span>
    );
  }
  if (relationship === "pending_received") {
    return (
      <button
        onClick={onAccept}
        disabled={loading}
        className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-full transition-colors shadow-sm"
      >
        Accept Request
      </button>
    );
  }
  return (
    <button
      onClick={onAdd}
      disabled={loading}
      className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded-full transition-colors shadow-sm"
    >
      {loading ? "..." : "Add Friend"}
    </button>
  );
}

export default function Dashboard() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchDone, setSearchDone] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadData();
  }, []);

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

  const setLoading = (userId, val) =>
    setActionLoading((prev) => ({ ...prev, [userId]: val }));

  const updateRelationship = (userId, rel) =>
    setSearchResults((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, relationship: rel } : u))
    );

  const sendRequest = async (user) => {
    setLoading(user.user_id, true);
    const res = await fetch("/api/connections/friendrequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user.user_id }),
    });
    const data = await res.json();
    setLoading(user.user_id, false);
    if (res.ok) {
      updateRelationship(user.user_id, "pending_sent");
    } else {
      alert(data.error || "Could not send request");
    }
  };

  // Accept a request that showed up in search results (pending_received)
  const acceptFromSearch = async (user) => {
    // find the request_id from incomingRequests
    const req = incomingRequests.find((r) => r.user_id === user.user_id);
    if (!req) {
      // re-fetch incoming to find it
      const res = await fetch("/api/connections/authorize").then((r) => r.json());
      const requests = Array.isArray(res.data) ? res.data : [];
      setIncomingRequests(requests);
      const found = requests.find((r) => r.user_id === user.user_id);
      if (found) return handleAuthorization(found.request_id, 2, user.user_id);
      return;
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
        // accepted — refresh friends list
        fetch("/api/connections/friendsData")
          .then((r) => r.json())
          .then((d) => setFriends(Array.isArray(d.data) ? d.data : []));
        // update search result button if this came from search
        if (fromSearchUserId) updateRelationship(fromSearchUserId, "friends");
      }
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Pending requests banner */}
        {incomingRequests.length > 0 && (
          <div className="bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm shadow-orange-200">
            <div>
              <p className="font-bold">
                {incomingRequests.length} pending friend request{incomingRequests.length > 1 ? "s" : ""}
              </p>
              <p className="text-orange-100 text-sm">Accept or decline below</p>
            </div>
            <div className="flex -space-x-2">
              {incomingRequests.slice(0, 3).map((r) => (
                <Avatar key={r.request_id} first={r.first_name} last={r.last_name} size="sm" />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 mb-3">Find People</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-stone-50"
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchDone(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-100"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>

          {searchDone && searchResults.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No users found for &ldquo;{query}&rdquo;
            </p>
          )}

          {searchResults.length > 0 && (
            <ul className="mt-4 divide-y divide-stone-100">
              {searchResults.map((user) => (
                <li key={user.user_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar first={user.first_name} last={user.last_name} />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-stone-400">{user.email}</p>
                    </div>
                  </div>
                  <RelationshipButton
                    relationship={user.relationship}
                    loading={actionLoading[user.user_id]}
                    onAdd={() => sendRequest(user)}
                    onAccept={() => acceptFromSearch(user)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Incoming Requests */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
            Incoming Requests
            {incomingRequests.length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {incomingRequests.length}
              </span>
            )}
          </h2>
          {incomingRequests.length === 0 ? (
            <p className="text-sm text-stone-400 py-2">No pending requests</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {incomingRequests.map((req) => (
                <li key={req.request_id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar first={req.first_name} last={req.last_name} />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {req.first_name} {req.last_name}
                      </p>
                      <p className="text-xs text-stone-400">{req.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAuthorization(req.request_id, 2)}
                      className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full transition-colors shadow-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAuthorization(req.request_id, 3)}
                      className="text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-full transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Friends List */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 mb-3">
            Friends{" "}
            <span className="text-stone-400 font-normal text-sm">({friends.length})</span>
          </h2>
          {friends.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-stone-400">No friends yet.</p>
              <p className="text-xs text-stone-300 mt-1">Search for people above to get started!</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {friends.map((friend) => (
                <li key={friend.user_id} className="flex items-center gap-3 py-3">
                  <Avatar first={friend.first_name} last={friend.last_name} />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {friend.first_name} {friend.last_name}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">Following</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
