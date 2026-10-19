/**
 * Dev email store - in-memory queue of emails sent during development.
 * Only active when NODE_ENV !== "production".
 * Emails are pushed here by sendEmail() when RESEND_API_KEY is not set
 * or when DEV_INTERCEPT_EMAILS=true.
 */

export interface DevEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: Date;
}

// Use a global to survive hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __devEmailStore: DevEmail[] | undefined;
}

function getStore(): DevEmail[] {
  if (!global.__devEmailStore) global.__devEmailStore = [];
  return global.__devEmailStore;
}

export function pushDevEmail(email: Omit<DevEmail, "id" | "sentAt">): void {
  const store = getStore();
  store.unshift({
    ...email,
    id: Math.random().toString(36).slice(2),
    sentAt: new Date(),
  });
  // Keep max 50
  if (store.length > 50) store.splice(50);
}

export function getDevEmails(): DevEmail[] {
  return getStore();
}

export function clearDevEmails(): void {
  global.__devEmailStore = [];
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV !== "production";
}
