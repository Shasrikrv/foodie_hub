"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../components/NavBar";

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

function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
function mealGradient(cat) {
  return MEAL_GRADIENTS[cat] ?? "from-orange-400 to-amber-500";
}
function mealBadge(cat) {
  return MEAL_BADGE[cat] ?? "bg-orange-100 text-orange-700";
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});

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
    setExpanded((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [section]: !prev[postId]?.[section] },
    }));

  const handleLike = async (postId, liked) => {
    const res = await fetch("/api/post/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, user_liked: !liked, like_count: liked ? p.like_count - 1 : p.like_count + 1 }
            : p
        )
      );
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
    const res = await fetch("/api/post/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, commentText: text }),
    });
    if (res.ok) {
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="h-14 bg-white border-b border-stone-100" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="text-stone-400 text-sm">Loading your feed...</p>
          </div>
        </div>
      </div>
    );
  }

  const sessionInitials =
    session?.user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "";

  return (
    <div className="bg-stone-50 min-h-screen">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {posts.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">&#9786;</span>
            </div>
            <h3 className="text-stone-700 font-bold text-xl mb-2">Nothing here yet</h3>
            <p className="text-stone-400 text-sm mb-6">Be the first to share a recipe with the community!</p>
            <Link
              href="/auth/post"
              className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-full font-semibold transition-colors shadow-sm shadow-orange-200"
            >
              Share a Recipe
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.post_id}
              className="bg-white rounded-3xl shadow-sm border border-stone-100 mb-5 overflow-hidden"
            >
              {/* Card banner — food image OR gradient with title */}
              {post.image_url ? (
                <div className="relative w-full h-56">
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                    {post.mealCategory && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mealBadge(post.mealCategory)} bg-opacity-90`}>
                        {post.mealCategory}
                      </span>
                    )}
                    <h2 className="text-white text-xl font-bold mt-1 leading-tight drop-shadow">
                      {post.title}
                    </h2>
                  </div>
                </div>
              ) : (
                <div className={`bg-gradient-to-r ${mealGradient(post.mealCategory)} px-5 pt-5 pb-4`}>
                  {post.mealCategory && (
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                      {post.mealCategory}
                    </span>
                  )}
                  <h2 className="text-white text-xl font-bold mt-0.5 leading-tight">{post.title}</h2>
                </div>
              )}

              {/* Author row */}
              <div className="px-5 pt-3.5 pb-2 flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${avatarColor(post.first_name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ring-2 ring-white`}
                >
                  {initials(post.first_name, post.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 leading-tight">
                    {post.first_name} {post.last_name}
                  </p>
                  <p className="text-xs text-stone-400">{post.mealName}</p>
                </div>
                {post.is_priority && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Friend
                  </span>
                )}
              </div>

              {/* Nutrition pills */}
              {(post.calories || post.protein || post.carbs || post.fats || post.fiber) && (
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                  {post.calories && (
                    <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full font-semibold">
                      {post.calories} kcal
                    </span>
                  )}
                  {post.protein && (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
                      {post.protein}g protein
                    </span>
                  )}
                  {post.carbs && (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-semibold">
                      {post.carbs}g carbs
                    </span>
                  )}
                  {post.fats && (
                    <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full font-semibold">
                      {post.fats}g fats
                    </span>
                  )}
                  {post.fiber && (
                    <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full font-semibold">
                      {post.fiber}g fiber
                    </span>
                  )}
                </div>
              )}

              {/* Expandable sections */}
              {(post.ingredients?.length > 0 || post.instructions?.length > 0) && (
                <div className="px-5 pb-3 flex gap-2 flex-wrap">
                  {post.ingredients?.length > 0 && (
                    <button
                      onClick={() => toggle(post.post_id, "ingredients")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        expanded[post.post_id]?.ingredients
                          ? "bg-stone-800 text-white border-stone-800"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      Ingredients ({post.ingredients.length})
                      {expanded[post.post_id]?.ingredients ? " ▲" : " ▼"}
                    </button>
                  )}
                  {post.instructions?.length > 0 && (
                    <button
                      onClick={() => toggle(post.post_id, "instructions")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        expanded[post.post_id]?.instructions
                          ? "bg-stone-800 text-white border-stone-800"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {post.instructions.length} Steps
                      {expanded[post.post_id]?.instructions ? " ▲" : " ▼"}
                    </button>
                  )}
                </div>
              )}

              {expanded[post.post_id]?.ingredients && (
                <div className="mx-5 mb-3 bg-stone-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Ingredients
                  </p>
                  <ul className="space-y-1.5">
                    {post.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="font-medium">{ing.name}</span>
                        {ing.quantity && (
                          <span className="text-stone-400 ml-auto text-xs">
                            {ing.quantity} {ing.units}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {expanded[post.post_id]?.instructions && (
                <div className="mx-5 mb-3 bg-stone-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Instructions
                  </p>
                  <ol className="space-y-3">
                    {post.instructions.map((inst, i) => (
                      <li key={i} className="flex gap-3 text-sm text-stone-700">
                        <span
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${mealGradient(post.mealCategory)} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}
                        >
                          {inst.steps}
                        </span>
                        <span className="leading-relaxed">{inst.description}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Like & Comment bar */}
              <div className="px-5 py-3 border-t border-stone-100 flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.post_id, post.user_liked)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-all ${
                    post.user_liked
                      ? "text-red-500 scale-110"
                      : "text-stone-400 hover:text-red-400"
                  }`}
                >
                  <span className="text-lg leading-none">{post.user_liked ? "♥" : "♡"}</span>
                  <span>{post.like_count || 0}</span>
                </button>
                <button
                  onClick={() => handleToggleComments(post.post_id)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                    expanded[post.post_id]?.comments
                      ? "text-blue-500"
                      : "text-stone-400 hover:text-blue-400"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post.comment_count || 0}</span>
                </button>
              </div>

              {/* Comments section */}
              {expanded[post.post_id]?.comments && (
                <div className="border-t border-stone-100 bg-stone-50/50">
                  <div className="px-5 py-3 flex gap-3 items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${avatarColor(session?.user?.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                    >
                      {sessionInitials}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        value={commentText[post.post_id] || ""}
                        onChange={(e) =>
                          setCommentText((prev) => ({ ...prev, [post.post_id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit(post.post_id)}
                        placeholder="Write a comment..."
                        className="flex-1 bg-white border border-stone-200 rounded-full px-4 py-2 text-sm text-stone-800 focus:outline-none focus:border-orange-400 transition-colors"
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.post_id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  </div>

                  <div className="px-5 pb-4 space-y-2.5">
                    {(comments[post.post_id] || []).length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-3">
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      (comments[post.post_id] || []).map((c) => (
                        <div key={c.comment_id} className="flex gap-2.5 items-start">
                          <div
                            className={`w-8 h-8 rounded-full ${avatarColor(c.first_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                          >
                            {initials(c.first_name, c.last_name)}
                          </div>
                          <div className="bg-white rounded-2xl px-4 py-2.5 text-sm flex-1 shadow-sm border border-stone-100">
                            <span className="font-semibold text-stone-800">
                              {c.first_name} {c.last_name}{" "}
                            </span>
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
