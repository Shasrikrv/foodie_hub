import { requesteStatus } from "./requestedStatus";

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await requesteStatus(request);
    return Response.json({
      result: result,
    });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json(
      {
        message: "Data Base connsection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
