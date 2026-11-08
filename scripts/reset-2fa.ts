/**
 * Server-side 2FA reset script.
 *
 * Clears totpSecret, totpEnabled, totpBackupCodes for a user by email.
 * Audit logged as TOTP_RESET with actor "SYSTEM".
 *
 * Use: server access only (direct DB). Do NOT use for routine resets;
 * prefer the Director portal (/api/director/reset-2fa) which is audit-logged
 * and sends a notification.
 *
 * Run:
 *   npm run reset-2fa -- <email>
 *
 * Example:
 *   npm run reset-2fa -- director@yourdomain.com
 */

import { PrismaClient, AuditAction } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes("@")) {
    console.error("\nUsage: npm run reset-2fa -- <email>\n");
    console.error("Example: npm run reset-2fa -- director@yourdomain.com\n");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, totpEnabled: true },
  });

  if (!user) {
    console.error(`\n[reset-2fa] User not found: ${email}\n`);
    process.exit(1);
  }

  if (!user.totpEnabled) {
    console.log(`\n[reset-2fa] ${email} does not have 2FA enabled. Nothing to reset.\n`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret:      null,
      totpEnabled:     false,
      totpVerifiedAt:  null,
      totpBackupCodes: null,
    },
  });

  // Audit log with SYSTEM as actor (no real user performing the action)
  await prisma.auditLog.create({
    data: {
      actorId:    user.id, // closest available actor -- the user being reset
      action:     AuditAction.TOTP_RESET,
      entityType: "User",
      entityId:   user.id,
      metadata:   {
        resetMethod: "CLI script (scripts/reset-2fa.ts)",
        targetEmail: user.email,
        targetRole:  user.role,
        note:        "Server-access reset. Verify identity before running.",
      },
    },
  });

  console.log(`\n[reset-2fa] 2FA cleared for ${user.name ?? user.email} (${user.role})`);
  console.log(`  They will be required to set up 2FA again on next login.\n`);
  console.log("  Note: a notification was NOT sent (no email service configured).");
  console.log("  Inform the user directly that their 2FA has been reset.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("[reset-2fa] Error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
