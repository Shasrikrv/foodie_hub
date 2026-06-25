"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

function timeAgo(dt) {
  if (!dt) return "";
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dt).toLocaleDateString();
}

function Avatar({ src, name, size = "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const letter = name?.[0]?.toUpperCase() || "?";
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {letter}
    </div>
  );
}

function Badge({ label, color }) {
  const colors = {
    open: "bg-orange-100 text-orange-700 border-orange-200",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${colors[color] || colors.open}`}>
      {label}
    </span>
  );
}

function detectTicketType(subject = "", message = "") {
  const text = `${subject} ${message}`.toLowerCase();
  if (text.includes("password") || text.includes("reset") || text.includes("forgot") || text.includes("login") || text.includes("sign in")) return "password";
  if (text.includes("delete") || text.includes("remove") || text.includes("account")) return "account";
  if (text.includes("bug") || text.includes("error") || text.includes("broken") || text.includes("crash")) return "bug";
  return "general";
}

const TICKET_TYPE_META = {
  password: { icon: "🔑", label: "Password Issue", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  account: { icon: "👤", label: "Account Issue", color: "text-blue-600 bg-blue-50 border-blue-200" },
  bug: { icon: "🐛", label: "Bug Report", color: "text-red-600 bg-red-50 border-red-200" },
  general: { icon: "💬", label: "General", color: "text-stone-600 bg-stone-50 border-stone-200" },
};

// ─── Reply Modal ───────────────────────────────────────────────────────────────
function ReplyModal({ ticket, onClose, onSent }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendReply",
        ticketId: ticket.ticket_id,
        ticketEmail: ticket.email,
        ticketSubject: ticket.subject,
        replyMessage: message,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) { onSent(); onClose(); }
    else setError(data.error || "Failed to send");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-800 text-lg">Reply to User</h3>
              <p className="text-sm text-stone-400 mt-0.5">To: {ticket.email}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">✕</button>
          </div>
          <div className="mt-3 bg-stone-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Re: {ticket.subject}</p>
            <p className="text-sm text-stone-500 line-clamp-2">{ticket.message}</p>
          </div>
        </div>
        <div className="p-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your reply here… Be clear and helpful."
            rows={5}
            className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 resize-none transition-all"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={send} disabled={sending || !message.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm">
              {sending ? "Sending…" : "Send Reply & Resolve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Link Modal ──────────────────────────────────────────────────────────
function ResetLinkModal({ url, emailSent, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl mb-4">🔑</div>
          <h3 className="font-bold text-stone-800 text-lg mb-1">Password Reset Link</h3>
          <p className="text-sm text-stone-500 mb-4">
            {emailSent
              ? "The reset link was emailed to the user. You can also share it manually:"
              : "Email could not be sent (no SMTP configured). Share this link with the user manually:"}
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-stone-400 font-mono break-all">{url}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">Close</button>
            <button onClick={copy}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${copied ? "bg-emerald-500 text-white" : "bg-orange-500 hover:bg-orange-400 text-white"}`}>
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="text-xs text-stone-400 text-center mt-3">This link expires in 1 hour.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({ user, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto">⚠️</div>
          <h3 className="font-bold text-stone-800 text-lg mb-2">Delete Account?</h3>
          <p className="text-sm text-stone-500 mb-6">
            This will permanently delete <span className="font-semibold text-stone-700">{user?.first_name} {user?.last_name}</span>&apos;s account and all their data. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card ───────────────────────────────────────────────────────────────
function TicketCard({ ticket, sessionUserId, onAction, onReply }) {
  const [expanded, setExpanded] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const type = detectTicketType(ticket.subject, ticket.message);
  const meta = TICKET_TYPE_META[type];
  const canResetPassword = ticket.linked_user_id && ticket.is_credential_user;

  const generateResetLink = async () => {
    setGeneratingLink(true);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateResetLink", userId: ticket.linked_user_id }),
    });
    const data = await res.json();
    setGeneratingLink(false);
    if (res.ok) onAction("showResetLink", { url: data.resetUrl, emailSent: data.emailSent });
    else onAction("error", data.error || "Failed to generate link");
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all ${ticket.status === "open" ? "border-orange-100 shadow-sm shadow-orange-50" : "border-stone-100"}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* User avatar / guest icon */}
          <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">
            {ticket.first_name ? ticket.first_name[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge label={ticket.status} color={ticket.status} />
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.color}`}>{meta.icon} {meta.label}</span>
              <span className="text-xs text-stone-400">{timeAgo(ticket.created_at)}</span>
            </div>
            <p className="font-semibold text-stone-800 text-sm truncate">{ticket.subject}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {ticket.email}
              {ticket.first_name && <span className="text-stone-300"> · {ticket.first_name} {ticket.last_name}</span>}
              {!ticket.first_name && <span className="text-stone-300"> · Guest</span>}
            </p>
          </div>
          <button onClick={() => setExpanded((p) => !p)} className="text-stone-300 hover:text-stone-500 transition-colors text-lg ml-1">
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Message preview / full */}
        <div className={`mt-3 text-sm text-stone-600 bg-stone-50 rounded-xl px-4 py-3 ${!expanded && "line-clamp-2"}`}>
          {ticket.message}
        </div>
      </div>

      {/* Action bar */}
      {ticket.status === "open" && (
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          {/* Reply */}
          <button onClick={() => onReply(ticket)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-full transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply & Resolve
          </button>

          {/* Generate reset link — shown when type is password OR user is linked */}
          {(type === "password" || canResetPassword) && canResetPassword && (
            <button onClick={generateResetLink} disabled={generatingLink}
              className="flex items-center gap-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white px-4 py-2 rounded-full transition-colors shadow-sm">
              {generatingLink ? "Generating…" : "🔑 Send Reset Link"}
            </button>
          )}

          {/* Mark resolved without reply */}
          <button onClick={() => onAction("resolveTicket", { ticketId: ticket.ticket_id })}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-full transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("tickets");
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [replyTicket, setReplyTicket] = useState(null);
  const [resetLinkData, setResetLinkData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState("all");
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [emailTesting, setEmailTesting] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);

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

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAction = async (actionType, payload = {}) => {
    if (actionType === "showResetLink") { setResetLinkData(payload); return; }
    if (actionType === "error") { showToast(payload); return; }

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionType, ...payload }),
    });
    const data = await res.json();
    if (res.ok) { showToast("Done!"); loadData(); }
    else showToast(data.error || "Error");
  };

  const testEmail = async () => {
    setEmailTesting(true);
    setEmailTestResult(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "testEmail", to: session?.user?.email }),
    });
    const data = await res.json();
    setEmailTesting(false);
    setEmailTestResult(data);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    await handleAction("deleteUser", { userId: deleteTarget.user_id });
    setDeleteTarget(null);
  };

  const openTickets = tickets.filter((t) => t.status === "open");
  const filteredTickets = filter === "all" ? tickets : filter === "open" ? openTickets : tickets.filter((t) => t.status === "resolved");

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

      {/* Modals */}
      {replyTicket && (
        <ReplyModal ticket={replyTicket} onClose={() => setReplyTicket(null)} onSent={() => { showToast("Reply sent!"); loadData(); }} />
      )}
      {resetLinkData && (
        <ResetLinkModal url={resetLinkData.url} emailSent={resetLinkData.emailSent} onClose={() => setResetLinkData(null)} />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal user={deleteTarget} onConfirm={handleDeleteUser} onClose={() => setDeleteTarget(null)} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-black text-stone-800 text-2xl">Admin Panel</h1>
            <p className="text-stone-400 text-sm mt-0.5">{users.length} users · {openTickets.length} open tickets</p>
          </div>
          <div className="flex items-center gap-2">
            {toast && (
              <div className={`text-sm font-semibold px-4 py-2 rounded-full ${toast === "Done!" || toast === "Reply sent!" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {toast}
              </div>
            )}
            <button onClick={() => setShowEmailPanel((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-xl transition-colors">
              📧 Email Config
            </button>
          </div>
        </div>

        {/* Email Config Panel */}
        {showEmailPanel && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 shadow-sm">
            <h3 className="font-bold text-stone-800 mb-1">Email / SMTP Setup</h3>
            <p className="text-sm text-stone-500 mb-4">
              FoodieHub sends password reset emails via SMTP. The free option is <strong>Gmail with an App Password</strong>.
            </p>

            {/* Setup steps */}
            <div className="bg-stone-50 rounded-xl p-4 mb-4 space-y-2 text-sm text-stone-700">
              <p className="font-semibold text-stone-800 mb-2">How to set up Gmail SMTP (free):</p>
              <p>1. Go to <span className="font-mono text-orange-600">myaccount.google.com</span> → Security → 2-Step Verification and enable it.</p>
              <p>2. Search for <strong>&ldquo;App passwords&rdquo;</strong> in Google account settings.</p>
              <p>3. Create a new App Password for &ldquo;Mail&rdquo; / &ldquo;Other&rdquo; — copy the 16-char code.</p>
              <p>4. Add to <span className="font-mono text-orange-600">.env.local</span>:</p>
              <pre className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 mt-1 overflow-x-auto">{`EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop`}</pre>
              <p>5. Restart the dev server and click <strong>Send Test Email</strong> below.</p>
              <p className="text-stone-400 text-xs mt-2">If SMTP is not configured, a free Ethereal test account is used in development — check the server console for a preview link.</p>
            </div>

            <button onClick={testEmail} disabled={emailTesting}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {emailTesting ? "Sending…" : "Send Test Email to " + (session?.user?.email || "you")}
            </button>

            {emailTestResult && (
              <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${emailTestResult.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                {emailTestResult.success ? (
                  <>
                    <p className="font-semibold text-emerald-700">Email sent successfully!</p>
                    <p className="text-emerald-600 text-xs mt-0.5">Sent to: {emailTestResult.sentTo}</p>
                    {emailTestResult.etherealUrl && (
                      <p className="text-xs mt-2 text-stone-500">
                        Ethereal preview (dev only):{" "}
                        <a href={emailTestResult.etherealUrl} target="_blank" rel="noreferrer" className="text-orange-500 underline break-all">
                          {emailTestResult.etherealUrl}
                        </a>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-red-700">Failed to send</p>
                    <p className="text-red-600 text-xs mt-0.5">{emailTestResult.error}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}


        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            ["tickets", `Support (${openTickets.length} open)`],
            ["users", `Users (${users.length})`],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === val ? "bg-stone-800 text-white shadow-sm" : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Support Tickets ── */}
        {tab === "tickets" && (
          <div>
            {/* Filter pills */}
            <div className="flex gap-2 mb-4">
              {[["all", "All"], ["open", "Open"], ["resolved", "Resolved"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === val ? "bg-orange-500 text-white" : "bg-white border border-stone-200 text-stone-400 hover:bg-stone-50"}`}>
                  {label}
                </button>
              ))}
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold text-stone-600">All clear!</p>
                <p className="text-stone-400 text-sm mt-1">No {filter !== "all" ? filter : ""} support tickets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((t) => (
                  <TicketCard
                    key={t.ticket_id}
                    ticket={t}
                    sessionUserId={session?.user?.id}
                    onAction={handleAction}
                    onReply={setReplyTicket}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden sm:table-cell">Posts</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden sm:table-cell">Friends</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden md:table-cell">AI Credits</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.profile_pic} name={u.first_name} />
                          <div>
                            <p className="font-semibold text-stone-800">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-stone-400">{u.email}</p>
                            {u.is_admin && <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-stone-600 font-medium hidden sm:table-cell">{u.post_count}</td>
                      <td className="px-4 py-4 text-stone-600 font-medium hidden sm:table-cell">{u.friend_count}</td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="font-semibold text-stone-700">{u.ai_credits}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleAction("addCredits", { userId: u.user_id, credits: 5 })}
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold transition-colors">
                            +5 Credits
                          </button>
                          {u.user_id !== session?.user?.id && (
                            <>
                              <button onClick={() => handleAction("toggleAdmin", { userId: u.user_id })}
                                className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-full font-semibold transition-colors">
                                {u.is_admin ? "Remove Admin" : "Make Admin"}
                              </button>
                              <button onClick={() => setDeleteTarget(u)}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 px-3 py-1.5 rounded-full font-semibold transition-colors">
                                Delete
                              </button>
                            </>
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
      </div>
    </div>
  );
}
