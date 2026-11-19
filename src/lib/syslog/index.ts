/**
 * syslog: write structured system log entries.
 *
 * Rules:
 * - NEVER log personal data (emails, names, IDs only as references)
 * - NEVER log secrets, tokens, passwords, or API keys
 * - Log only infrastructure events: errors, warnings, job runs, service issues
 */
import { db } from "@/lib/db";

type Level = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  level: Level;
  source: string;
  route?: string;
  requestId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Redact known sensitive keys from metadata */
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(obj, (key, val) => {
      if (typeof key === "string" && /key|secret|token|password|pass|auth|bearer/i.test(key)) {
        return "[REDACTED]";
      }
      return val;
    })
  );
}

export async function syslog(entry: LogEntry): Promise<void> {
  try {
    await db.systemLog.create({
      data: {
        level: entry.level,
        source: entry.source,
        route: entry.route,
        requestId: entry.requestId,
        message: entry.message,
        metadata: entry.metadata ? redact(entry.metadata) : null,
      },
    });
  } catch {
    // Non-fatal: never let logging break the main flow
    console.error("[syslog] Failed to write system log:", entry.message);
  }
}

export async function syslogError(source: string, message: string, metadata?: Record<string, unknown>) {
  return syslog({ level: "ERROR", source, message, metadata });
}

export async function syslogWarn(source: string, message: string, metadata?: Record<string, unknown>) {
  return syslog({ level: "WARN", source, message, metadata });
}

export async function syslogInfo(source: string, message: string, metadata?: Record<string, unknown>) {
  return syslog({ level: "INFO", source, message, metadata });
}
