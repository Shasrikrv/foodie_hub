import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "@/app/lib/db";

const PROMPT = `Analyze this food image and provide recipe details as JSON with these exact fields:
{
  "title": "catchy post title",
  "mealName": "dish name",
  "mealCategory": "breakfast|lunch|dinner|Smoothie",
  "nutrition": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number},
  "ingredients": [{"name": "...", "quantity": number, "unit": "g|ml|cup|tbsp|tsp|pcs|piece|scoop|pinch"}],
  "instructions": [{"step": 1, "description": "..."}]
}
Respond ONLY with valid JSON, no markdown, no extra text.`;

const TEXT_PROMPT = "Suggest a healthy recipe. Respond ONLY with valid JSON: " + PROMPT;

function parseJson(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestion = JSON.parse(cleaned);
    if (suggestion.nutrition) Object.assign(suggestion, suggestion.nutrition);
    return suggestion;
  } catch {
    return { raw: text };
  }
}

async function runAnthropic(apiKey, imageBase64, imageMime) {
  const client = new Anthropic({ apiKey });
  const content = imageBase64
    ? [{ type: "image", source: { type: "base64", media_type: imageMime, data: imageBase64 } }, { type: "text", text: PROMPT }]
    : TEXT_PROMPT;
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content }],
  });
  return parseJson(response.content[0]?.text || "{}");
}

async function runOpenAI(apiKey, imageBase64, imageMime) {
  const client = new OpenAI({ apiKey });
  const content = imageBase64
    ? [
        { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: "text", text: PROMPT },
      ]
    : TEXT_PROMPT;
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    messages: [{ role: "user", content }],
  });
  return parseJson(response.choices[0]?.message?.content || "{}");
}

async function runGemini(apiKey, imageBase64, imageMime) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const parts = imageBase64
    ? [{ inlineData: { data: imageBase64, mimeType: imageMime } }, { text: PROMPT }]
    : [{ text: TEXT_PROMPT }];
  const response = await model.generateContent(parts);
  return parseJson(response.response.text() || "{}");
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await pool.query(
      "SELECT anthropic_api_key, openai_api_key, gemini_api_key FROM users WHERE user_id = $1",
      [session.user.id]
    );
    const keys = rows[0] || {};

    const contentType = req.headers.get("content-type") || "";
    let imageBase64 = null;
    let imageMime = "image/jpeg";
    let provider = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      provider = form.get("provider");
      if (file && file.size > 0) {
        imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        imageMime = file.type || "image/jpeg";
      }
    } else {
      let body = {};
      try { body = await req.json(); } catch {}
      provider = body.provider;
      if (body.imageUrl) {
        try {
          const imgRes = await fetch(
            body.imageUrl.startsWith("/") ? `${process.env.NEXTAUTH_URL}${body.imageUrl}` : body.imageUrl
          );
          imageBase64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
          imageMime = imgRes.headers.get("content-type") || "image/jpeg";
        } catch {}
      }
    }

    // Pick provider: use requested one if key exists, otherwise first available
    const available = [
      keys.anthropic_api_key && "anthropic",
      keys.openai_api_key && "openai",
      keys.gemini_api_key && "gemini",
    ].filter(Boolean);

    if (available.length === 0) {
      return Response.json(
        { error: "No AI API key found. Add a key in Settings to use AI features." },
        { status: 402 }
      );
    }

    const selected = available.includes(provider) ? provider : available[0];

    let suggestion;
    if (selected === "anthropic") {
      suggestion = await runAnthropic(keys.anthropic_api_key, imageBase64, imageMime);
    } else if (selected === "openai") {
      suggestion = await runOpenAI(keys.openai_api_key, imageBase64, imageMime);
    } else {
      suggestion = await runGemini(keys.gemini_api_key, imageBase64, imageMime);
    }

    return Response.json({ suggestion, provider: selected });
  } catch (err) {
    console.error("AI suggest error:", err);
    const msg = err?.status === 401 || err?.status === 403
      ? "Invalid API key. Please update it in Settings."
      : err.message || "AI suggestion failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
