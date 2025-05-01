import { authorizeStaus } from "../friendrequest/requestedStatus";

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await authorizeStaus(request);
    return Response.json(result);
  } catch (error) {
    console.error("Connection Error", error);
    return Response.json(
      {
        message: "Database connestion is failed",
      },
      { status: 500 }
    );
  }
}
