import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

export async function sendWhatsAppReminder(input: { to: string; name: string; title: string; scheduledAt: Date; timetableUrl: string }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION;
  const template = process.env.WHATSAPP_CLASS_REMINDER_TEMPLATE;
  if (!token || !phoneNumberId || !version || !template) return;
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: input.to.replace(/\D/g, ""), type: "template", template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" }, components: [{ type: "body", parameters: [{ type: "text", text: input.name }, { type: "text", text: input.title }, { type: "text", text: input.scheduledAt.toLocaleString("en-UG", { timeZone: "Africa/Kampala" }) }, { type: "text", text: input.timetableUrl }] }] } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`WhatsApp reminder failed (${response.status}).`);
}

export async function deliverClassReminder(input: { channel: string; email: string | null; phone: string | null; name: string; title: string; scheduledAt: Date }) {
  const timetableUrl = `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.musawo.ug"}/dashboard/timetable`;
  const time = input.scheduledAt.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" });
  const date = input.scheduledAt.toLocaleDateString("en-UG", { timeZone: "Africa/Kampala" });
  const timeUntil = input.scheduledAt.getTime() - Date.now() > 3_600_000 ? "24 hours" : "30 minutes";
  if (input.channel === "EMAIL" && input.email) {
    await sendEmail({ to: input.email, subject: `Class reminder: ${input.title}`, template: "class-reminder", variables: { name: input.name, className: input.title, time, date, timeUntil, joinUrl: timetableUrl } });
  } else if (input.channel === "SMS" && input.phone && process.env.AT_API_KEY) {
    await sendSms({ to: input.phone, message: `Musawo class reminder: ${input.title} starts ${date} at ${time}. Open your timetable: ${timetableUrl}` });
  } else if (input.channel === "WHATSAPP" && input.phone) {
    await sendWhatsAppReminder({ to: input.phone, name: input.name, title: input.title, scheduledAt: input.scheduledAt, timetableUrl });
  }
}

export async function remindInstructorToAddReplay(input: { email: string | null; name: string; title: string }) {
  if (!input.email) return;
  await sendEmail({ to: input.email, subject: `Recording pending: ${input.title}`, template: "class-recording-pending", variables: { name: input.name, className: input.title, tutorUrl: `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.musawo.ug"}/tutor/classes` } });
}
