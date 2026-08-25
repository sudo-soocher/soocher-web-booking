import { StreamChat } from "stream-chat";

let adminClient: StreamChat | null = null;

/**
 * Server-only Stream Chat client, authenticated with the API secret. Never
 * import this from a client component — unlike NEXT_PUBLIC_STREAM_API_KEY,
 * the secret must stay server-side.
 */
function getStreamAdminClient(): StreamChat {
  if (adminClient) return adminClient;
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_STREAM_KEY_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("Stream API key/secret not configured.");
  }
  adminClient = StreamChat.getInstance(apiKey, apiSecret);
  return adminClient;
}

/**
 * Registers user records with Stream so they can be referenced as channel
 * members. Connecting to Stream client-side (connectUser) only upserts the
 * connecting user's own record — the *other* party in a chat is never
 * guaranteed to exist yet (e.g. a doctor messaging a patient who has never
 * opened chat themselves), and Stream's GetOrCreateChannel rejects any
 * member id it doesn't already have a user object for. This closes that gap
 * from the server side, where an API-secret client is allowed to upsert
 * users it isn't currently connected as.
 */
export async function ensureStreamUsers(users: { id: string; name?: string }[]): Promise<void> {
  const valid = users.filter((u) => u.id && u.id.trim().length > 0);
  if (valid.length === 0) return;
  const client = getStreamAdminClient();
  await client.upsertUsers(
    valid.map((u) => ({ id: u.id, name: u.name?.trim() || u.id }))
  );
}
