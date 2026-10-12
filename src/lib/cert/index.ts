import { db } from "@/lib/db";

const CERT_PREFIX = "MTC";

/**
 * Generate a unique, readable certificate ID.
 * Format: MTC-2026-CNA-00042
 */
export async function generateCertificateId(
  courseSlug: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = courseSlug.toUpperCase().slice(0, 4);

  // Count existing certificates for this course this year for sequential number
  const count = await db.certificate.count({
    where: {
      course: { slug: courseSlug },
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const seq = String(count + 1).padStart(5, "0");
  return `${CERT_PREFIX}-${year}-${prefix}-${seq}`;
}

/**
 * Verify a certificate ID is authentic and not revoked.
 */
export async function verifyCertificate(uniqueId: string): Promise<{
  valid: boolean;
  certificate?: {
    uniqueId: string;
    studentName: string;
    courseName: string;
    issuedAt: Date;
    revoked: boolean;
  };
}> {
  const cert = await db.certificate.findUnique({
    where: { uniqueId },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  if (!cert) return { valid: false };

  return {
    valid: !cert.revokedAt,
    certificate: {
      uniqueId: cert.uniqueId,
      studentName: cert.user.name,
      courseName: cert.course.title,
      issuedAt: cert.issuedAt,
      revoked: !!cert.revokedAt,
    },
  };
}
