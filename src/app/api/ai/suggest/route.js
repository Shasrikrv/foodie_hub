import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import Anthropic from "@anthropic-ai/sdk";
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

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await pool.query(
      "SELECT anthropic_api_key FROM users WHERE user_id = $1",
      [session.user.id]
    );
    const apiKey = rows[0]?.anthropic_api_key;
    if (!apiKey) {
      return Response.json(
        { error: "No Anthropic API key found. Add your key in Settings to use AI features." },
        { status: 402 }
      );
    }

    const client = new Anthropic({ apiKey });

    const contentType = req.headers.get("content-type") || "";
    let messageContent;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const b64 = Buffer.from(bytes).toString("base64");
        const mime = file.type || "image/jpeg";
        messageContent = [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: PROMPT },
        ];
      } else {
        messageContent = "Suggest a healthy recipe with title, ingredients, instructions, and nutrition info as JSON matching this schema: " + PROMPT;
      }
    } else {
      let body = {};
      try { body = await req.json(); } catch {}
      if (body.imageUrl) {
        try {
          const imgRes = await fetch(
            body.imageUrl.startsWith("/") ? `${process.env.NEXTAUTH_URL}${body.imageUrl}` : body.imageUrl
          );
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = imgRes.headers.get("content-type") || "image/jpeg";
          messageContent = [
            { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
            { type: "text", text: PROMPT },
          ];
        } catch {
          messageContent = body.prompt || "Suggest a healthy recipe as JSON.";
        }
      } else {
        messageContent = body.prompt || "Suggest a healthy recipe as JSON.";
      }
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = response.content[0]?.text || "{}";
    let suggestion;
    try {
      suggestion = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      suggestion = { raw: text };
    }

    if (suggestion.nutrition) {
      Object.assign(suggestion, suggestion.nutrition);
    }

    return Response.json({ suggestion });
  } catch (err) {
    console.error("AI suggest error:", err);
    const msg = err?.status === 401
      ? "Invalid Anthropic API key. Please update it in Settings."
      : err.message || "AI suggestion failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
