"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "../components/NavBar";
import EmojiPicker from "@/app/components/EmojiPicker";
import { Suspense } from "react";

const AVATAR_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-600","bg-orange-500","bg-pink-500","bg-teal-500","bg-indigo-500"];
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]; }
function initials(first, last) { return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase(); }

function Avatar({ first, last, pic, size = "md" }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-sm";
  if (pic) return <img src={pic} alt="" className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full ${avatarColor(first)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials(first, last)}
    </div>
  );
}

function formatTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFriendId = searchParams.get("friend");

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const activeFriendRef = useRef(null);   // which friendId is currently open
  const handledFriendIdRef = useRef(null); // prevents loop: tracks URL friend we already selected

  // Start/stop message polling based on tab visibility
  useEffect(() => {
    const startPoll = () => {
      if (!activeFriendRef.current) return;
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (document.visibilityState === "visible" && activeFriendRef.current) {
          loadMessages(activeFriendRef.current);
        }
      }, 4000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && activeFriendRef.current) {
        loadMessages(activeFriendRef.current); // immediate refresh on tab focus
        startPoll();
      } else {
        clearInterval(pollRef.current); // pause while tab is hidden
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") loadFriends();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select friend from URL param — only fires when the friend ID actually changes
  useEffect(() => {
    if (selectedFriendId && friends.length && handledFriendIdRef.current !== selectedFriendId) {
      const f = friends.find((fr) => fr.user_id === selectedFriendId);
      if (f) {
        handledFriendIdRef.current = selectedFriendId;
        selectFriend(f);
      }
    }
  }, [selectedFriendId, friends]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadFriends = async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setFriends(Array.isArray(data.data) ? data.data : []);
  };

  const selectFriend = (friend) => {
    setSelectedFriend(friend);
    router.replace(`/auth/chat?friend=${friend.user_id}`, { scroll: false });
    activeFriendRef.current = friend.user_id;
    clearInterval(pollRef.current);
    loadMessages(friend.user_id);
    // Only start polling if the tab is visible
    if (document.visibilityState === "visible") {
      pollRef.current = setInterval(() => loadMessages(friend.user_id), 4000);
    }
  };

  const loadMessages = async (friendId) => {
    const res = await fetch(`/api/chat?friendId=${friendId}`);
    const data = await res.json();
    setMessages(Array.isArray(data.data) ? data.data : []);
    setFriends((prev) => prev.map((f) => f.user_id === friendId ? { ...f, unread: 0 } : f));
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !selectedFriend || sending) return;
    setSending(true);
    setSendError("");
    const msgText = text;
    setText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedFriend.user_id, text: msgText }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error || "Failed to send message");
        setText(msgText); // restore text so user doesn't lose their message
      } else {
        await loadMessages(selectedFriend.user_id);
        await loadFriends();
      }
    } catch {
      setSendError("Network error. Please try again.");
      setText(msgText);
    }
    setSending(false);
  };

  const me = session?.user?.id;

  return (
    <div className="bg-stone-50 min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 max-w-4xl mx-auto w-full flex overflow-hidden h-[calc(100dvh-56px)]">

        {/* Friends sidebar */}
        <div className={`${selectedFriend ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 bg-white border-r border-stone-100`}>
          <div className="px-4 py-4 border-b border-stone-100">
            <h2 className="font-black text-stone-800 text-lg">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-sm">
                <p className="text-3xl mb-2">💬</p>
                <p>No friends yet.</p>
                <a href="/auth/dashboard" className="text-orange-500 font-semibold hover:underline">Find Friends</a>
              </div>
            ) : friends.map((f) => (
              <button key={f.user_id} onClick={() => selectFriend(f)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors text-left ${selectedFriend?.user_id === f.user_id ? "bg-orange-50 border-r-2 border-orange-500" : ""}`}>
                <div className="relative flex-shrink-0">
                  <Avatar first={f.first_name} last={f.last_name} pic={f.profile_pic} size="sm" />
                  {f.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {f.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{f.first_name} {f.last_name}</p>
                  <p className="text-xs text-stone-400 truncate">{f.last_message || "Say hello 👋"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message area */}
        <div className={`${selectedFriend ? "flex" : "hidden sm:flex"} flex-1 flex-col bg-stone-50`}>
          {!selectedFriend ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-stone-400">
                <p className="text-5xl mb-4">💬</p>
                <p className="font-semibold">Select a friend to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
                <button onClick={() => { setSelectedFriend(null); router.replace("/auth/chat"); }} className="sm:hidden text-stone-400 hover:text-stone-600 mr-1">
                  ←
                </button>
                <Avatar first={selectedFriend.first_name} last={selectedFriend.last_name} pic={selectedFriend.profile_pic} size="sm" />
                <div>
                  <p className="font-semibold text-stone-800">{selectedFriend.first_name} {selectedFriend.last_name}</p>
                  <p className="text-xs text-stone-400">Friend</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-stone-400 text-sm py-8">No messages yet. Say hi! 👋</p>
                )}
                {messages.map((msg) => {
                  const isMine = msg.sender_id === me;
                  return (
                    <div key={msg.message_id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && <Avatar first={msg.first_name} last={msg.last_name} pic={msg.profile_pic} size="sm" />}
                      <div className={`max-w-xs lg:max-w-md ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine ? "bg-orange-500 text-white rounded-br-sm" : "bg-white text-stone-800 rounded-bl-sm shadow-sm border border-stone-100"}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                        </div>
                        <span className="text-xs text-stone-400 mt-1 px-1">{formatTime(msg.created_at)}</span>
                      </div>
                      {isMine && <Avatar first={session?.user?.name?.split(" ")[0]} last={session?.user?.name?.split(" ")[1]} pic={session?.user?.profilePic} size="sm" />}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-stone-100 px-4 py-3">
                {sendError && (
                  <p className="text-red-500 text-xs mb-2 px-1">{sendError}</p>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <EmojiPicker onSelect={(e) => setText((prev) => prev + e)} />
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message…"
                    className="flex-1 bg-stone-100 rounded-full px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button type="submit" disabled={!text.trim() || sending}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <ChatContent />
    </Suspense>
  );
}
