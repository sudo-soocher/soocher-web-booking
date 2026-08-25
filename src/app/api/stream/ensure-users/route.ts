import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { ensureStreamUsers } from "@/lib/stream-admin";

interface EnsureUserInput {
  id?: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const { users } = (await request.json()) as { users?: EnsureUserInput[] };
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "users array is required" }, { status: 400 });
    }

    await ensureStreamUsers(
      users
        .filter((u): u is { id: string; name?: string } => typeof u.id === "string" && u.id.trim().length > 0)
        .map((u) => ({ id: u.id, name: u.name }))
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(">>> [STREAM ENSURE-USERS ERROR]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
