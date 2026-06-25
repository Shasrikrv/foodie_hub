"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmojiPicker from "@/app/components/EmojiPicker";

const UNITS = [
  "g", "kg", "oz", "lb",
  "ml", "l", "cup", "tbsp", "tsp", "teaspoons",
  "pcs", "piece", "slice", "scoop", "cubes",
  "pinch", "handful", "bunch", "can", "bottle",
];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "Smoothie"];

const MEAL_GRADIENTS = {
  breakfast: "from-amber-400 to-orange-400",
  lunch:     "from-emerald-400 to-teal-500",
  dinner:    "from-blue-500 to-indigo-600",
  Smoothie:  "from-violet-500 to-purple-600",
};

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <h2 className="font-bold text-stone-800">{title}</h2>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [fiber, setFiber] = useState("");
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "g" }]);
  const [instructions, setInstructions] = useState([{ step: 1, description: "" }]);
  const [visibility, setVisibility] = useState("everyone");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [availableProviders, setAvailableProviders] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((d) => {
          const providers = [
            d.data?.has_anthropic_key && "anthropic",
            d.data?.has_openai_key && "openai",
            d.data?.has_gemini_key && "gemini",
          ].filter(Boolean);
          setAvailableProviders(providers);
          if (providers.length > 0) setSelectedProvider(providers[0]);
        })
        .catch(() => setAvailableProviders([]));
    }
  }, [status]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateIngredient = (idx, field, value) =>
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));

  const updateInstruction = (idx, value) =>
    setInstructions((prev) => prev.map((ins, i) => (i === idx ? { ...ins, description: value } : ins)));

  const handleAISuggest = async () => {
    setAiLoading(true);
    setAiMsg("");
    setError("");
    try {
      let body;
      const headers = {};
      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        form.append("provider", selectedProvider);
        body = form;
        // no Content-Type header — browser sets it with boundary for FormData
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ provider: selectedProvider });
      }
      const res = await fetch("/api/ai/suggest", { method: "POST", headers, body });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) setError("Not enough AI credits. Contact admin for more.");
        else setError(data.error || "AI suggestion failed");
        return;
      }
      const s = data.suggestion;
      if (s.title) setTitle(s.title);
      if (s.mealName) setMealName(s.mealName);
      if (s.mealCategory && MEAL_TYPES.includes(s.mealCategory)) setMealType(s.mealCategory);
      // nutrition fields are at top level (normalized by API) or nested under s.nutrition
      const n = s.nutrition || s;
      if (n.calories != null) setCalories(String(n.calories));
      if (n.protein != null) setProtein(String(n.protein));
      if (n.carbs != null) setCarbs(String(n.carbs));
      if (n.fats != null) setFats(String(n.fats));
      if (n.fiber != null) setFiber(String(n.fiber));
      if (s.ingredients?.length) {
        setIngredients(s.ingredients.map((i) => ({ name: i.name || "", quantity: String(i.quantity || ""), unit: i.unit || "g" })));
      }
      if (s.instructions?.length) {
        setInstructions(s.instructions.map((i, idx) => ({ step: i.step ?? idx + 1, description: i.description || "" })));
      }
      setAiMsg("Fields filled!");
    } catch {
      setError("AI request failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePost = async () => {
    if (!session?.user?.id) return setError("You must be logged in.");
    if (!title.trim() || !mealName.trim()) return setError("Title and meal name are required.");
    setError("");
    setSubmitting(true);

    try {
      // Upload image first (if any)
      let imageUrl = null;
      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        const upRes = await fetch("/api/post/upload", { method: "POST", body: form });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Image upload failed");
        imageUrl = upData.url;
      }

      // Create content
      const contentRes = await fetch("/api/post/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealName }),
      });
      const contentData = await contentRes.json();
      const contentId = contentData.result?.content_id;
      if (!contentId) throw new Error("Failed to create content");

      // Create post
      await fetch("/api/post/userPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, userId: session.user.id, contentId, imageUrl, visibility }),
      });

      // Nutrition (optional)
      if (calories || protein || carbs || fats || fiber) {
        await fetch("/api/post/nutritions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, calories, protein, carbs, fats, fiber }),
        });
      }

      // Meal type + junction
      const mtRes = await fetch("/api/post/mealType", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealCategory: mealType, contentId }),
      });
      const mtData = await mtRes.json();
      if (mtData.result?.mealTypeId) {
        await fetch("/api/post/mealContentJunction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, mealTypeId: mtData.result.mealTypeId }),
        });
      }

      // Ingredients
      for (const ing of ingredients) {
        if (!ing.name.trim()) continue;
        await fetch("/api/post/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, ingredientName: ing.name, quantity: ing.quantity, unit: ing.unit }),
        });
      }

      // Instructions
      for (const inst of instructions) {
        if (!inst.description.trim()) continue;
        await fetch("/api/post/instructions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, step: inst.step, description: inst.description }),
        });
      }

      router.push("/auth/home");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const gradient = MEAL_GRADIENTS[mealType] ?? "from-orange-400 to-amber-500";

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} shadow-sm`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/auth/home" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
            &#8592; Back
          </Link>
          <h1 className="text-white font-black text-lg">Share a Recipe</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Photo upload */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <SectionHeader number="1" title="Food Photo" subtitle="A great photo makes your recipe stand out" />
          </div>

          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
              >
                &times;
              </button>
              <div className="absolute bottom-3 left-3 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
                Looking good!
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mx-5 mb-5 w-[calc(100%-2.5rem)] h-40 border-2 border-dashed border-stone-200 hover:border-orange-400 hover:bg-orange-50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-stone-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 10.5h18M12 3v4.5m0 0l-1.5-1.5M12 7.5l1.5-1.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-stone-500 group-hover:text-orange-600 transition-colors">
                Upload a photo
              </p>
              <p className="text-xs text-stone-400">JPG, PNG, WebP up to 5MB</p>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* AI Suggest */}
        <div className="space-y-2">
          {availableProviders?.length > 1 && (
            <div className="flex gap-2">
              {availableProviders.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedProvider(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedProvider === p
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-stone-500 border-stone-200 hover:border-violet-400"
                  }`}
                >
                  {p === "anthropic" ? "Claude" : p === "openai" ? "GPT-4o" : "Gemini"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={aiLoading || availableProviders?.length === 0}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm text-sm flex items-center justify-center gap-2"
          >
            {aiLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Thinking…
              </>
            ) : (
              <>✨ AI Suggest Recipe Details</>
            )}
          </button>
          {availableProviders?.length === 0 && (
            <p className="text-xs text-stone-400 text-center">
              Add an AI API key in{" "}
              <a href="/auth/settings" className="text-violet-500 font-semibold hover:underline">Settings</a>{" "}
              to use AI suggestions.
            </p>
          )}
          {aiMsg && <p className="text-violet-700 text-sm font-medium bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">{aiMsg}</p>}
        </div>

        {/* Post details */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <SectionHeader number="2" title="Recipe Details" />
          <div className="space-y-3">
            <div className="relative flex items-center gap-2">
              <EmojiPicker onSelect={(e) => setTitle((prev) => prev + e)} />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a catchy title"
                className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm"
              />
            </div>
            <input
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Meal name (e.g. Acai Smoothie Bowl)"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm"
            />
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-2">Meal Category</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMealType(t)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      mealType === t
                        ? `bg-gradient-to-r ${MEAL_GRADIENTS[t]} text-white shadow-sm`
                        : "bg-stone-50 border border-stone-200 text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <SectionHeader number="3" title="Who can see this?" subtitle="Control who sees your recipe" />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("everyone")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                visibility === "everyone"
                  ? "bg-stone-800 text-white shadow-sm"
                  : "bg-stone-50 border border-stone-200 text-stone-600 hover:border-stone-400"
              }`}
            >
              <span>🌍</span> Everyone
            </button>
            <button
              type="button"
              onClick={() => setVisibility("friends")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                visibility === "friends"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-stone-50 border border-stone-200 text-stone-600 hover:border-stone-400"
              }`}
            >
              <span>🔒</span> Friends Only
            </button>
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <SectionHeader number="4" title="Nutrition Info" subtitle="Optional — helps others track their macros" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ["calories", calories, setCalories, "Calories (kcal)", "text-red-600 bg-red-50 border-red-100"],
              ["protein", protein, setProtein, "Protein (g)", "text-blue-600 bg-blue-50 border-blue-100"],
              ["carbs", carbs, setCarbs, "Carbs (g)", "text-amber-700 bg-amber-50 border-amber-100"],
              ["fats", fats, setFats, "Fats (g)", "text-purple-600 bg-purple-50 border-purple-100"],
              ["fiber", fiber, setFiber, "Fiber (g)", "text-green-600 bg-green-50 border-green-100"],
            ].map(([key, val, setter, label, colorClass]) => (
              <div key={key}>
                <label className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${colorClass}`}>
                  {label}
                </label>
                <input
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="mt-1.5 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 bg-stone-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <SectionHeader number="5" title="Ingredients" />
          <div className="space-y-2.5">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-center">
                <div className="flex gap-2 items-center">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 bg-stone-50 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex gap-2 items-center ml-7 sm:ml-0">
                  <input
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="0"
                    className="w-16 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 bg-stone-50 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                    className="flex-1 sm:flex-none border border-stone-200 rounded-xl px-2 py-2 text-stone-700 bg-stone-50 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {ingredients.length > 1 && (
                    <button
                      onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none font-light flex-shrink-0 w-8 h-8 flex items-center justify-center"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setIngredients((prev) => [...prev, { name: "", quantity: "", unit: "g" }])}
            className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors"
          >
            + Add ingredient
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-5">
          <SectionHeader number="6" title="Instructions" subtitle="Walk readers through each step" />
          <div className="space-y-3">
            {instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2`}>
                  {idx + 1}
                </div>
                <textarea
                  value={inst.description}
                  onChange={(e) => updateInstruction(idx, e.target.value)}
                  placeholder={`What happens in step ${idx + 1}?`}
                  className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 bg-stone-50 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all resize-none"
                  rows={2}
                />
                {instructions.length > 1 && (
                  <button
                    onClick={() =>
                      setInstructions((prev) =>
                        prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
                      )
                    }
                    className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none mt-2 font-light"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setInstructions((prev) => [...prev, { step: prev.length + 1, description: "" }])
            }
            className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors"
          >
            + Add step
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pb-8">
          <Link
            href="/auth/home"
            className="flex-1 text-center border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold py-3.5 rounded-2xl transition-colors text-sm"
          >
            Cancel
          </Link>
          <button
            onClick={handlePost}
            disabled={submitting}
            className={`flex-1 bg-gradient-to-r ${gradient} hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm text-sm`}
          >
            {submitting ? "Publishing..." : "Publish Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
