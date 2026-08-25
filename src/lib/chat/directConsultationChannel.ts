import type { Channel, StreamChat } from "stream-chat";

const sanitizeStreamId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

function conversationHash(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export interface DirectConsultationChannelData {
  consultationId: string;
  doctorName: string;
  patientName: string;
}

/**
 * Stream rejects GetOrCreateChannel with "users ... don't exist" for any
 * member who has never connected to Stream from any client — connecting
 * only upserts your own user record, not the other party's. This is a
 * best-effort call: if it fails (network hiccup, the other party already
 * exists so there's nothing to do, etc.) channel creation still proceeds
 * and surfaces its own error normally.
 *
 * Takes the caller's own idToken rather than reading it from a Firebase
 * auth module directly — this file is shared between the patient and
 * doctor apps, which use different auth setups, so the caller (which
 * already has its own auth context) is what resolves it.
 */
async function ensureMembersExist(
  idToken: string | undefined,
  members: { id: string; name?: string }[]
): Promise<void> {
  if (!idToken) return;
  try {
    await fetch("/api/stream/ensure-users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ users: members }),
    });
  } catch {
    // Best-effort — see comment above.
  }
}

/**
 * Returns one persistent Stream channel for an exact doctor/patient pair.
 *
 * Older builds created `consultation_<booking id>` channels. We discover and
 * reuse the most recently active legacy channel first so opening a newer
 * booking does not hide the existing conversation. New pairs receive a short,
 * deterministic channel ID that both apps calculate identically.
 */
export async function getDirectConsultationChannel(
  client: StreamChat,
  rawMembers: string[],
  data: DirectConsultationChannelData,
  idToken?: string
): Promise<Channel> {
  const members = Array.from(
    new Set(rawMembers.filter(Boolean).map((member) => sanitizeStreamId(member)))
  ).sort();

  if (members.length < 2) {
    throw new Error("A doctor and patient are required to start a consultation chat");
  }

  const existingChannels = await client.queryChannels(
    { type: "messaging", members: { $eq: members } },
    [{ last_message_at: -1 }, { created_at: 1 }],
    { watch: true, state: true, limit: 30, message_limit: 100 }
  );

  const consultationChannels = existingChannels.filter(
    (candidate) =>
      candidate.id?.startsWith("doctor_patient_") ||
      candidate.id?.startsWith("consultation_")
  );
  const persistent = consultationChannels.find((candidate) =>
    candidate.id?.startsWith("doctor_patient_")
  );
  const channelWithHistory = consultationChannels.find(
    (candidate) => candidate.state.messages.length > 0
  );
  const existing = persistent || channelWithHistory || consultationChannels[0];

  if (existing) return existing;

  // No existing channel — about to create one, so make sure every member
  // Stream is being asked to add actually exists as a Stream user first.
  // Names aren't known per-member here (members is a flat uid list); the
  // ensure-users endpoint falls back to the id itself when name is omitted,
  // and each user's own connectUser() call later corrects it to their real
  // display name.
  await ensureMembersExist(
    idToken,
    members.map((id) => ({ id }))
  );

  const conversationKey = members.join("|");
  const channel = client.channel(
    "messaging",
    `doctor_patient_${conversationHash(conversationKey)}`,
    {
      members,
      name: `${data.patientName} · ${data.doctorName}`,
      doctor_name: data.doctorName,
      patient_name: data.patientName,
      consultation_id: data.consultationId,
      conversation_key: conversationKey,
      // Stream custom channel fields are configured server-side and are not
      // represented in the SDK's default ChannelData type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  );
  await channel.watch();
  return channel;
}
