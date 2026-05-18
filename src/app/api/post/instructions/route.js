import { instructions } from "../postDetalis";

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await instructions(request);
    return Response.json({ result: result });
  } catch (error) {
    console.error("Connection error", error);
    return Response.json(
      {
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
