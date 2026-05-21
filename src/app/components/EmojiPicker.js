"use client";
import { useState, useRef, useEffect } from "react";

const CATEGORIES = {
  "🍕 Food": ["🍕","🍔","🌮","🌯","🥗","🍜","🍝","🥘","🍲","🍛","🍣","🍱","🥡","🍖","🍗","🥩","🥚","🍳","🧀","🥓","🌭","🍟","🥙","🧆","🍞","🥐","🧇","🥞","🧈","🫕"],
  "🍎 Fruits & Veg": ["🍎","🍊","🍋","🍌","🍍","🥭","🍇","🍓","🫐","🍒","🍑","🥝","🍅","🥥","🥑","🍆","🥦","🥕","🌽","🫑","🥒","🧅","🧄","🌶️","🥜","🌰"],
  "☕ Drinks": ["☕","🍵","🫖","🧃","🥤","🧋","🧊","🍺","🍷","🥂","🍹","🍸","🫗","🥛"],
  "🍰 Sweets": ["🍰","🎂","🧁","🍩","🍪","🍫","🍬","🍭","🍮","🍯","🥧","🍦","🍧","🍨","🍡","🧆"],
  "😀 Smileys": ["😀","😂","🤣","😍","🥰","😋","🤤","😊","🥳","😎","🤩","😘","🤗","😅","🙃","🥹","😋","😏","😤","🤌"],
  "👍 Reactions": ["👍","❤️","🔥","💯","✨","⭐","🎉","🏆","👏","🙌","💪","🤙","✌️","🫶","🙏","😋","💚","💛","🧡","💜"],
};

export default function EmojiPicker({ onSelect, className = "" }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(Object.keys(CATEGORIES)[0]);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="text-xl leading-none text-stone-400 hover:text-orange-500 transition-colors select-none"
        title="Emoji"
      >
        😊
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-stone-100 w-72">
          {/* Category tabs */}
          <div className="flex overflow-x-auto border-b border-stone-100 px-2 pt-2 gap-1 scrollbar-hide">
            {Object.keys(CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`flex-shrink-0 text-base px-2 py-1 rounded-lg transition-colors ${activeTab === cat ? "bg-orange-100" : "hover:bg-stone-50"}`}
              >
                {cat.split(" ")[0]}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
            {CATEGORIES[activeTab].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); setOpen(false); }}
                className="text-xl p-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
