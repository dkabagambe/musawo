import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";

const CACHE_KEY = "site:settings";
const CACHE_TTL = 60; // 1 minute

export type Settings = Record<string, string>;

export async function getAllSettings(): Promise<Settings> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached) as Settings;

  const rows = await db.siteSetting.findMany();
  const settings: Settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  await redis.set(CACHE_KEY, JSON.stringify(settings), "EX", CACHE_TTL);
  return settings;
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getAllSettings();
  return settings[key] ?? fallback;
}

export async function setSetting(
  key: string,
  value: string,
  updatedById?: string
): Promise<void> {
  await db.siteSetting.upsert({
    where: { key },
    update: { value, updatedById: updatedById ?? null },
    create: { key, value, updatedById: updatedById ?? null },
  });
  await redis.del(CACHE_KEY);
}

// Typed helpers
export async function getFreePreviewPercent(): Promise<number> {
  const v = await getSetting("course.freePreviewPercent", "12");
  return parseInt(v, 10);
}

export async function getActiveGateway(): Promise<"pesapal" | "flutterwave"> {
  const v = await getSetting("payment.gateway", "pesapal");
  return v === "flutterwave" ? "flutterwave" : "pesapal";
}

export async function getTabSwitchThreshold(): Promise<number> {
  const v = await getSetting("exam.tabSwitchAlertThreshold", "3");
  return parseInt(v, 10);
}
