import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Try dedicated video token endpoint first; fall back to the chat token endpoint
        const videoTokenUrl = process.env.STREAM_VIDEO_TOKEN_URL || "https://stream.soocher.in/video-token";
        const fallbackUrl = "https://stream.soocher.in/token";

        const tryFetch = async (url: string) => {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            return res.json();
        };

        let data: { token?: string };
        try {
            data = await tryFetch(videoTokenUrl);
        } catch {
            data = await tryFetch(fallbackUrl);
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        const error = err as { message?: string };
        console.error(">>> [STREAM VIDEO TOKEN ERROR]:", error?.message);
        return NextResponse.json(
            { error: "Failed to get video token", details: error?.message },
            { status: 500 }
        );
    }
}
