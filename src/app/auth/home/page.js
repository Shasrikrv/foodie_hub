"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../components/NavBar";
import EmojiPicker from "@/app/components/EmojiPicker";

const UNITS = [
  "g", "kg", "oz", "lb",
  "ml", "l", "cup", "tbsp", "tsp", "teaspoons",
  "pcs", "piece", "slice", "scoop", "cubes",
  "pinch", "handful", "bunch", "can", "bottle",
];

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-600",
  "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500",
];
const MEAL_GRADIENTS = {
  breakfast: "from-amber-400 to-orange-400",
  lunch:     "from-emerald-400 to-teal-500",
  dinner:    "from-blue-500 to-indigo-600",
  Smoothie:  "from-violet-500 to-purple-600",
};
const MEAL_BADGE = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch:     "bg-emerald-100 text-emerald-700",
  dinner:    "bg-indigo-100 text-indigo-700",
  Smoothie:  "bg-violet-100 text-violet-700",
};

function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]; }
function initials(first, last) { return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase(); }
function mealGradient(cat) { return MEAL_GRADIENTS[cat] ?? "from-orange-400 to-amber-500"; }
function mealBadge(cat) { return MEAL_BADGE[cat] ?? "bg-orange-100 text-orange-700"; }

// ─── Share menu ────────────────────────────────────────────────────────────────
function ShareMenu({ post, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const shareUrl = typeof window !== "undefined" ? window.location.origin + "/auth/home" : "";
  const shareText = `Check out this recipe: ${post.title} by ${post.first_name} ${post.last_name} on FoodieHub!`;

  const handleNativeShare = async () => {
    try { await navigator.share({ title: post.title, text: shareText, url: shareUrl }); } catch (_) {}
    onClose();
  };
  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  };

  return (
    <div ref={ref} className="absolute right-0 bottom-10 z-20 bg-white rounded-2xl shadow-xl border border-stone-100 py-1.5 w-48">
      {typeof navigator !== "undefined" && navigator.share && (
        <button onClick={handleNativeShare} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5">
          <span className="text-base">📤</span> Share…
        </button>
      )}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
        target="_blank" rel="noopener noreferrer" onClick={onClose}
        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5"
      >
        <span className="text-base">💬</span> WhatsApp
      </a>
      <button onClick={handleCopy} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5">
        <span className="text-base">{copied ? "✅" : "🔗"}</span>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

// ─── Delete confirmation dialog ────────────────────────────────────────────────
function DeleteDialog({ post, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-stone-800 font-bold text-lg text-center mb-1">Delete Recipe?</h3>
        <p className="text-stone-500 text-sm text-center mb-6">
          &ldquo;{post.title}&rdquo; will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ post, onSave, onClose }) {
  const [title, setTitle] = useState(post.title || "");
  const [mealName, setMealName] = useState(post.mealName || "");
  const [visibility, setVisibility] = useState(post.visibility || "everyone");
  const [calories, setCalories] = useState(post.calories ?? "");
  const [protein, setProtein] = useState(post.protein ?? "");
  const [carbs, setCarbs] = useState(post.carbs ?? "");
  const [fats, setFats] = useState(post.fats ?? "");
  const [fiber, setFiber] = useState(post.fiber ?? "");
  const [ingredients, setIngredients] = useState(
    post.ingredients?.length
      ? post.ingredients.map((i) => ({ name: i.name, quantity: i.quantity ?? "", unit: i.units || "g" }))
      : [{ name: "", quantity: "", unit: "g" }]
  );
  const [instructions, setInstructions] = useState(
    post.instructions?.length
      ? post.instructions.map((i, idx) => ({ step: i.steps ?? idx + 1, description: i.description }))
      : [{ step: 1, description: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateIng = (idx, field, val) =>
    setIngredients((prev) => prev.map((i, n) => (n === idx ? { ...i, [field]: val } : i)));

  const updateInst = (idx, val) =>
    setInstructions((prev) => prev.map((i, n) => (n === idx ? { ...i, description: val } : i)));

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/post/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post.post_id, title, visibility, mealName,
        calories, protein, carbs, fats, fiber, ingredients, instructions,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onSave({ title, visibility, mealName, calories, protein, carbs, fats, fiber, ingredients, instructions });
    } else {
      setError(data.error || "Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-stone-50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-200 bg-white rounded-t-3xl sm:rounded-t-3xl flex-shrink-0">
          <h2 className="font-black text-stone-800 text-lg">Edit Recipe</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title & meal name */}
          <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-stone-100">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Meal Name</label>
              <input value={mealName} onChange={(e) => setMealName(e.target.value)}
                className="mt-1 w-full border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {[["everyone", "🌍 Everyone"], ["friends", "🔒 Friends Only"]].map(([val, label]) => (
                <button key={val} onClick={() => setVisibility(val)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    visibility === val
                      ? val === "friends" ? "bg-emerald-600 text-white" : "bg-stone-800 text-white"
                      : "bg-stone-50 border border-stone-200 text-stone-600"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-3">Nutrition</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Calories (kcal)", calories, setCalories, "text-red-600 bg-red-50"],
                ["Protein (g)", protein, setProtein, "text-blue-600 bg-blue-50"],
                ["Carbs (g)", carbs, setCarbs, "text-amber-700 bg-amber-50"],
                ["Fats (g)", fats, setFats, "text-purple-600 bg-purple-50"],
                ["Fiber (g)", fiber, setFiber, "text-green-600 bg-green-50"],
              ].map(([label, val, setter, color]) => (
                <div key={label}>
                  <label className={`text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>{label}</label>
                  <input value={val} onChange={(e) => setter(e.target.value)} type="number" min="0" placeholder="0"
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-3">Ingredients</label>
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                  <input value={ing.name} onChange={(e) => updateIng(idx, "name", e.target.value)}
                    placeholder="Ingredient" className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
                  <input value={ing.quantity} onChange={(e) => updateIng(idx, "quantity", e.target.value)}
                    placeholder="Qty" type="number" min="0"
                    className="w-16 border border-stone-200 rounded-xl px-2 py-2 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all" />
                  <select value={ing.unit} onChange={(e) => updateIng(idx, "unit", e.target.value)}
                    className="border border-stone-200 rounded-xl px-2 py-2 text-stone-700 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {ingredients.length > 1 && (
                    <button onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-stone-300 hover:text-red-400 text-xl font-light transition-colors">×</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setIngredients((prev) => [...prev, { name: "", quantity: "", unit: "g" }])}
              className="mt-2 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              + Add ingredient
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-3">Instructions</label>
            <div className="space-y-2">
              {instructions.map((inst, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2">{idx + 1}</div>
                  <textarea value={inst.description} onChange={(e) => updateInst(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}…`} rows={2}
                    className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 transition-all resize-none" />
                  {instructions.length > 1 && (
                    <button
                      onClick={() => setInstructions((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })))}
                      className="text-stone-300 hover:text-red-400 text-xl font-light mt-2 transition-colors">×</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setInstructions((prev) => [...prev, { step: prev.length + 1, description: "" }])}
              className="mt-2 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              + Add step
            </button>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-stone-200 bg-white rounded-b-3xl flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold py-3 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-all">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main feed page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [shareOpen, setShareOpen] = useState({});
  const [feedFilter, setFeedFilter] = useState("all");
  const [editingPost, setEditingPost] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") fetchFeed();
  }, [status, router]);

  const fetchFeed = async () => {
    try {
      const res = await fetch("/api/post/feed");
      const data = await res.json();
      setPosts(Array.isArray(data.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (postId, section) =>
    setExpanded((prev) => ({ ...prev, [postId]: { ...prev[postId], [section]: !prev[postId]?.[section] } }));

  const handleLike = async (postId, liked) => {
    const res = await fetch("/api/post/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) });
    if (res.ok) {
      setPosts((prev) => prev.map((p) =>
        p.post_id === postId ? { ...p, user_liked: !liked, like_count: liked ? p.like_count - 1 : p.like_count + 1 } : p
      ));
    }
  };

  const loadComments = async (postId) => {
    const res = await fetch(`/api/post/comments?postId=${postId}`);
    const data = await res.json();
    setComments((prev) => ({ ...prev, [postId]: data.data || [] }));
  };

  const handleToggleComments = (postId) => {
    const opening = !expanded[postId]?.comments;
    toggle(postId, "comments");
    if (opening) loadComments(postId);
  };

  const handleCommentSubmit = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    const res = await fetch("/api/post/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, commentText: text }) });
    if (res.ok) {
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      setPosts((prev) => prev.map((p) => p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch("/api/post/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: deleteTarget.post_id }) });
    setDeleteLoading(false);
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.post_id !== deleteTarget.post_id));
      setDeleteTarget(null);
    } else {
      const d = await res.json();
      alert(d.error || "Failed to delete");
    }
  };

  const handleEditSave = (postId, updated) => {
    setPosts((prev) => prev.map((p) => {
      if (p.post_id !== postId) return p;
      return {
        ...p,
        title: updated.title,
        visibility: updated.visibility,
        mealName: updated.mealName,
        calories: updated.calories || null,
        protein: updated.protein || null,
        carbs: updated.carbs || null,
        fats: updated.fats || null,
        fiber: updated.fiber || null,
        ingredients: updated.ingredients.filter((i) => i.name?.trim()).map((i) => ({ name: i.name, quantity: i.quantity, units: i.unit })),
        instructions: updated.instructions.filter((i) => i.description?.trim()).map((i, idx) => ({ steps: i.step ?? idx + 1, description: i.description })),
      };
    }));
    setEditingPost(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="h-14 bg-white border-b border-stone-100" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="text-stone-400 text-sm">Loading your feed…</p>
          </div>
        </div>
      </div>
    );
  }

  const sessionInitials = session?.user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "";
  const visiblePosts = feedFilter === "friends" ? posts.filter((p) => p.is_priority) : posts;

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />

      {/* Modals */}
      {editingPost && (
        <EditModal
          post={editingPost}
          onSave={(updated) => handleEditSave(editingPost.post_id, updated)}
          onClose={() => setEditingPost(null)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          post={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Feed filter */}
        <div className="flex items-center gap-2 mb-5">
          {[["all", "All Posts"], ["friends", "Friends Only"]].map(([val, label]) => (
            <button key={val} onClick={() => setFeedFilter(val)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                feedFilter === val
                  ? val === "friends" ? "bg-emerald-600 text-white" : "bg-stone-800 text-white"
                  : "bg-white border border-stone-200 text-stone-500 hover:border-stone-400"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {visiblePosts.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">&#9786;</span>
            </div>
            <h3 className="text-stone-700 font-bold text-xl mb-2">
              {feedFilter === "friends" ? "No friends' posts yet" : "Nothing here yet"}
            </h3>
            <p className="text-stone-400 text-sm mb-6">
              {feedFilter === "friends" ? "Add friends to see their recipes here." : "Be the first to share a recipe!"}
            </p>
            <Link href={feedFilter === "friends" ? "/auth/dashboard" : "/auth/post"}
              className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-full font-semibold transition-colors shadow-sm shadow-orange-200">
              {feedFilter === "friends" ? "Find Friends" : "Share a Recipe"}
            </Link>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <article key={post.post_id} className="bg-white rounded-3xl shadow-sm border border-stone-100 mb-5 overflow-hidden">

              {/* Banner */}
              {post.image_url ? (
                <div className="relative w-full h-56">
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                    {post.mealCategory && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mealBadge(post.mealCategory)} bg-opacity-90`}>
                        {post.mealCategory}
                      </span>
                    )}
                    <h2 className="text-white text-xl font-bold mt-1 leading-tight drop-shadow">{post.title}</h2>
                  </div>
                </div>
              ) : (
                <div className={`bg-gradient-to-r ${mealGradient(post.mealCategory)} px-5 pt-5 pb-4`}>
                  {post.mealCategory && (
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{post.mealCategory}</span>
                  )}
                  <h2 className="text-white text-xl font-bold mt-0.5 leading-tight">{post.title}</h2>
                </div>
              )}

              {/* Author row */}
              <div className="px-5 pt-3.5 pb-2 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${avatarColor(post.first_name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ring-2 ring-white`}>
                  {initials(post.first_name, post.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 leading-tight">{post.first_name} {post.last_name}</p>
                  <p className="text-xs text-stone-400">{post.mealName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {post.visibility === "friends" && (
                    <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">🔒 Friends</span>
                  )}
                  {post.is_priority && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Friend</span>
                  )}
                  {/* Edit / Delete — own posts only */}
                  {post.author_id === session?.user?.id && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => setEditingPost(post)}
                        className="w-7 h-7 rounded-full bg-stone-100 hover:bg-orange-100 flex items-center justify-center text-stone-400 hover:text-orange-500 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(post)}
                        className="w-7 h-7 rounded-full bg-stone-100 hover:bg-red-100 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrition pills */}
              {(post.calories || post.protein || post.carbs || post.fats || post.fiber) && (
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                  {post.calories && <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full font-semibold">{post.calories} kcal</span>}
                  {post.protein && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">{post.protein}g protein</span>}
                  {post.carbs && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-semibold">{post.carbs}g carbs</span>}
                  {post.fats && <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full font-semibold">{post.fats}g fats</span>}
                  {post.fiber && <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full font-semibold">{post.fiber}g fiber</span>}
                </div>
              )}

              {/* Expandable toggle buttons */}
              {(post.ingredients?.length > 0 || post.instructions?.length > 0) && (
                <div className="px-5 pb-3 flex gap-2 flex-wrap">
                  {post.ingredients?.length > 0 && (
                    <button onClick={() => toggle(post.post_id, "ingredients")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${expanded[post.post_id]?.ingredients ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                      Ingredients ({post.ingredients.length}){expanded[post.post_id]?.ingredients ? " ▲" : " ▼"}
                    </button>
                  )}
                  {post.instructions?.length > 0 && (
                    <button onClick={() => toggle(post.post_id, "instructions")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${expanded[post.post_id]?.instructions ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                      {post.instructions.length} Steps{expanded[post.post_id]?.instructions ? " ▲" : " ▼"}
                    </button>
                  )}
                </div>
              )}

              {expanded[post.post_id]?.ingredients && (
                <div className="mx-5 mb-3 bg-stone-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Ingredients</p>
                  <ul className="space-y-1.5">
                    {post.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="font-medium">{ing.name}</span>
                        {ing.quantity && <span className="text-stone-400 ml-auto text-xs">{ing.quantity} {ing.units}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {expanded[post.post_id]?.instructions && (
                <div className="mx-5 mb-3 bg-stone-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Instructions</p>
                  <ol className="space-y-3">
                    {post.instructions.map((inst, i) => (
                      <li key={i} className="flex gap-3 text-sm text-stone-700">
                        <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${mealGradient(post.mealCategory)} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          {inst.steps}
                        </span>
                        <span className="leading-relaxed">{inst.description}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Action bar */}
              <div className="px-5 py-3 border-t border-stone-100 flex items-center gap-4">
                <button onClick={() => handleLike(post.post_id, post.user_liked)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-all ${post.user_liked ? "text-red-500 scale-110" : "text-stone-400 hover:text-red-400"}`}>
                  <span className="text-lg leading-none">{post.user_liked ? "♥" : "♡"}</span>
                  <span>{post.like_count || 0}</span>
                </button>
                <button onClick={() => handleToggleComments(post.post_id)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${expanded[post.post_id]?.comments ? "text-blue-500" : "text-stone-400 hover:text-blue-400"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post.comment_count || 0}</span>
                </button>
                <div className="relative ml-auto">
                  <button onClick={() => setShareOpen((prev) => ({ ...prev, [post.post_id]: !prev[post.post_id] }))}
                    className="flex items-center gap-1.5 text-sm font-semibold text-stone-400 hover:text-orange-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  {shareOpen[post.post_id] && (
                    <ShareMenu post={post} onClose={() => setShareOpen((prev) => ({ ...prev, [post.post_id]: false }))} />
                  )}
                </div>
              </div>

              {/* Comments */}
              {expanded[post.post_id]?.comments && (
                <div className="border-t border-stone-100 bg-stone-50/50">
                  <div className="px-5 py-3 flex gap-3 items-center">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(session?.user?.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {sessionInitials}
                    </div>
                    <div className="flex-1 flex gap-2 items-center">
                      <EmojiPicker onSelect={(e) => setCommentText((prev) => ({ ...prev, [post.post_id]: (prev[post.post_id] || "") + e }))} />
                      <input
                        value={commentText[post.post_id] || ""}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [post.post_id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit(post.post_id)}
                        placeholder="Write a comment…"
                        className="flex-1 bg-white border border-stone-200 rounded-full px-4 py-2 text-sm text-stone-800 focus:outline-none focus:border-orange-400 transition-colors"
                      />
                      <button onClick={() => handleCommentSubmit(post.post_id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                        Post
                      </button>
                    </div>
                  </div>
                  <div className="px-5 pb-4 space-y-2.5">
                    {(comments[post.post_id] || []).length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-3">No comments yet. Be the first!</p>
                    ) : (
                      (comments[post.post_id] || []).map((c) => (
                        <div key={c.comment_id} className="flex gap-2.5 items-start">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(c.first_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {initials(c.first_name, c.last_name)}
                          </div>
                          <div className="bg-white rounded-2xl px-4 py-2.5 text-sm flex-1 shadow-sm border border-stone-100">
                            <span className="font-semibold text-stone-800">{c.first_name} {c.last_name} </span>
                            <span className="text-stone-600">{c.comment_text}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
