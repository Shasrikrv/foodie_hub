import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // Only admin can use the AI feature — protects API credits from public usage
    if (!session.user.isAdmin) {
      return Response.json({ error: "AI suggestions are only available to admins." }, { status: 403 });
    }

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
    return Response.json({ error: err.message || "AI suggestion failed" }, { status: 500 });
  }
}
