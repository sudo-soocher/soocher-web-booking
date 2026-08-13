import { NextResponse } from "next/server";

/**
 * Stream Chat token proxy. The browser POSTs { userId } and we exchange it
 * with the central token server for a signed Stream user token. The server
 * URL is configurable so staging/prod can swap endpoints without a redeploy.
 *
 * Mirrors the patient app's `/api/stream-token` route exactly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const tokenUrl = process.env.STREAM_TOKEN_URL || "https://stream.soocher.in/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[STREAM CHAT TOKEN ERROR] Status: ${response.status}, Body: ${errorText}`
      );
      return NextResponse.json(
        { error: "Failed to fetch token from external server", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[STREAM CHAT TOKEN CRITICAL]:", error?.message || error);
    return NextResponse.json(
      { error: "Internal server error in token proxy", details: error?.message },
      { status: 500 }
    );
  }
}
