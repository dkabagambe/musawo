/**
 * Tutor support ticket detail — reuses the shared ticket detail implementation.
 * The shared page at /dashboard/support/[id] handles all roles and calculates
 * the correct back-link based on session.user.role.
 */
export { default } from "@/app/(dashboard)/dashboard/support/[id]/page";
