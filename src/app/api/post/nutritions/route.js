import { nutritionDeteils } from "../postDetalis";

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await nutritionDeteils(request);
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
