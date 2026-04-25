import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const externalApiUrl = "https://stream.soocher.in/token";

        console.log(`>>> [STREAM PROXY] Fetching token for ${userId} from ${externalApiUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let response: Response;
        try {
            response = await fetch(externalApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId }),
                signal: controller.signal,
            });
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === "AbortError") {
                console.error(">>> [STREAM PROXY] Request timed out after 8s");
                return NextResponse.json(
                    { error: "Stream token service timed out" },
                    { status: 504 }
                );
            }
            throw err;
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`>>> [STREAM PROXY ERROR] Status: ${response.status}, Body: ${errorText}`);
            return NextResponse.json(
                { error: "Failed to fetch token from external server", details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err: unknown) {
        const error = err as { message?: string };
        console.error(">>> [STREAM PROXY CRITICAL ERROR]:", error?.message || error);
        return NextResponse.json(
            { error: "Internal server error in token proxy", details: error?.message },
            { status: 500 }
        );
    }
}
