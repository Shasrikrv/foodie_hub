"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

function DeleteAccountModal({ onConfirm, onClose, loading }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto">⚠️</div>
          <h3 className="font-black text-stone-800 text-xl mb-2 text-center">Delete Account</h3>
          <p className="text-sm text-stone-500 text-center mb-4">
            This permanently deletes your account, all your posts, recipes, and data. <span className="font-semibold text-stone-700">This cannot be undone.</span>
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-red-600 font-semibold mb-2">Type <span className="font-black">DELETE</span> to confirm:</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-red-400 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={typed !== "DELETE" || loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors">
              {loading ? "Deleting…" : "Delete Forever"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Support ticket
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportTab, setSupportTab] = useState(false);

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") loadProfile();
  }, [status]);

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to load profile. Please refresh.");
        return;
      }
      if (data.data) {
        setProfile(data.data);
        setFirstName(data.data.first_name || "");
        setLastName(data.data.last_name || "");
        setBio(data.data.bio || "");
      } else {
        setProfileError("Could not load profile data. Please refresh.");
      }
    } catch {
      setProfileError("Connection error. Please check your internet and refresh.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingPic(true);
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/user/profile", { method: "PUT", body: form });
    const data = await res.json();
    setSavingPic(false);
    if (res.ok) {
      setProfile((prev) => ({ ...prev, profile_pic: data.url }));
      setMsg("Profile picture updated!");
      await update("refresh"); // re-sync session so NavBar picks up new pic
    } else {
      setError(data.error || "Upload failed");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(""); setError("");
    const body = { firstName, lastName, bio };
    if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg("Profile saved!"); setCurrentPw(""); setNewPw("");
      await update("refresh"); // re-sync session so NavBar picks up new name
    } else {
      setError(data.error || "Failed to save");
    }
  };

  const handleSupport = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session?.user?.email, subject: supportSubject, message: supportMsg }),
    });
    if (res.ok) { setSupportSent(true); setSupportSubject(""); setSupportMsg(""); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const res = await fetch("/api/user/account", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete account");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (profileLoading || (!profile && !profileError)) return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <NavBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (profileError) return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <NavBar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-10 text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-stone-700 font-semibold mb-2">Could not load settings</p>
          <p className="text-stone-400 text-sm mb-5">{profileError}</p>
          <button
            onClick={loadProfile}
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />
      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="font-black text-stone-800 text-2xl">Settings</h1>

        {/* Profile Picture */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-bold text-stone-800 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.profile_pic ? (
                <img src={profile.profile_pic} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-md">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </div>
              )}
              {savingPic && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()}
                className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Change Photo
              </button>
              <p className="text-xs text-stone-400 mt-1.5">JPG, PNG or WebP. Max 5MB.</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-bold text-stone-800 mb-4">Profile Info</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 block mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Tell us about yourself…"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 transition-all resize-none" />
            </div>
            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 mb-2">Change Password <span className="text-stone-300 font-normal">(leave blank to keep current)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password"
                  className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password"
                  className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
              </div>
            </div>
            {msg && <p className="text-emerald-600 text-sm font-medium">{msg}</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
          <button onClick={() => setSupportTab((p) => !p)}
            className="w-full flex items-center justify-between font-bold text-stone-800">
            <span>Contact Support</span>
            <span className="text-stone-400 text-sm">{supportTab ? "▲" : "▼"}</span>
          </button>
          {supportTab && (
            supportSent ? (
              <div className="mt-4 text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-stone-700 font-semibold">Message sent!</p>
                <p className="text-stone-400 text-sm">The admin will get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSupport} className="mt-4 space-y-3">
                <input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="Subject (e.g. Forgot password)"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" required />
                <textarea value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} placeholder="Describe your issue…" rows={3}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all resize-none" required />
                <button type="submit" className="w-full bg-stone-800 hover:bg-stone-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  Send Message
                </button>
              </form>
            )
          )}
        </div>

        {/* Account section */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-bold text-stone-800 mb-3">Account</h2>
          <p className="text-sm text-stone-500 mb-4">Signed in as <span className="font-semibold text-stone-700">{session?.user?.email}</span></p>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold py-2.5 rounded-xl text-sm transition-colors mb-3">
            Sign Out
          </button>
          <div className="border-t border-stone-100 pt-4">
            <p className="text-xs text-stone-400 mb-3">Danger zone</p>
            <button onClick={() => setShowDeleteModal(true)}
              className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Delete My Account
            </button>
            <p className="text-xs text-stone-400 text-center mt-2">This permanently deletes your account and all data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
