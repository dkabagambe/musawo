import { createHash } from "crypto";

export type LiveProvider = "link" | "bbb" | "jitsi";

export function configuredProvider(): LiveProvider {
  const value = process.env.LIVE_CLASS_PROVIDER?.toLowerCase();
  if (value === "bbb" && process.env.BBB_URL && process.env.BBB_SECRET) return "bbb";
  if (value === "jitsi" && process.env.JITSI_ENABLED === "true") return "jitsi";
  return "link";
}

function bbbBase() {
  const base = process.env.BBB_URL!.replace(/\/$/, "").replace(/\/api$/, "");
  return base.endsWith("/bigbluebutton") ? base : `${base}/bigbluebutton`;
}

async function bbbRequest(action: string, params: URLSearchParams) {
  const query = params.toString();
  const checksum = createHash("sha1").update(`${action}${query}${process.env.BBB_SECRET}`).digest("hex");
  const response = await fetch(`${bbbBase()}/api/${action}?${query}&checksum=${checksum}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`BigBlueButton ${action} request failed (${response.status}).`);
  const xml = await response.text();
  const returnCode = xml.match(/<returncode>([^<]+)<\/returncode>/)?.[1];
  const message = xml.match(/<message>([^<]+)<\/message>/)?.[1] ?? "BigBlueButton request failed.";
  if (returnCode !== "SUCCESS" && !message.includes("already exists")) throw new Error(message);
  return xml;
}

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[char]!);
}

export async function startProviderMeeting(input: { classId: string; title: string; moderatorName: string; recording: boolean; provider?: LiveProvider }) {
  const provider = input.provider ?? configuredProvider();
  if (provider === "bbb") {
    const params = new URLSearchParams({
      meetingID: input.classId,
      name: input.title,
      guestPolicy: "ASK_MODERATOR",
      attendeePW: process.env.BBB_ATTENDEE_PASSWORD ?? "student-entry",
      moderatorPW: process.env.BBB_MODERATOR_PASSWORD ?? "instructor-control",
      muteOnStart: "true",
      "lockSettingsDisableCam": "true",
      "lockSettingsDisableMic": "false",
      record: String(input.recording),
      allowStartStopRecording: "true",
      autoStartRecording: String(input.recording),
    });
    await bbbRequest("create", params);
    const moderator = await getProviderJoinUrl({ classId: input.classId, userId: "moderator", name: input.moderatorName, role: "MODERATOR" });
    return { provider, moderatorUrl: moderator, meetingId: input.classId };
  }
  return { provider, moderatorUrl: null, meetingId: null };
}

export async function endProviderMeeting(input: { classId: string; provider: LiveProvider }) {
  if (input.provider !== "bbb") return;
  await bbbRequest("end", new URLSearchParams({ meetingID: input.classId, password: process.env.BBB_MODERATOR_PASSWORD ?? "instructor-control" }));
}

export async function getProviderJoinUrl(input: { classId: string; userId: string; name: string; role: "MODERATOR" | "VIEWER"; provider?: LiveProvider }) {
  const provider = input.provider ?? configuredProvider();
  if (provider !== "bbb") return null;
  const params = new URLSearchParams({
    fullName: input.name.slice(0, 120),
    meetingID: input.classId,
    userID: input.userId,
    role: input.role,
    redirect: "true",
  });
  const query = params.toString();
  const checksum = createHash("sha1").update(`join${query}${process.env.BBB_SECRET}`).digest("hex");
  return `${bbbBase()}/api/join?${query}&checksum=${checksum}`;
}

export async function fetchProviderRecordings(classId: string) {
  if (!process.env.BBB_URL || !process.env.BBB_SECRET) return [];
  const params = new URLSearchParams({ meetingID: classId });
  const xml = await bbbRequest("getRecordings", params);
  const urls = Array.from(xml.matchAll(/<url>([^<]+)<\/url>/g)).map((match) => match[1]);
  return urls;
}

export function recordingSourceNote(provider: string) {
  return provider === "bbb"
    ? "BigBlueButton recording is being synchronized."
    : "Start recording in the meeting provider, then paste its replay link after class.";
}

export function escapeProviderText(value: string) { return xmlEscape(value); }
