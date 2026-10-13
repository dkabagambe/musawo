import { db } from "@/lib/db";
import { notFound as _notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import type { Metadata } from "next";

interface Props {
  params: { certId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Verify Certificate - ${params.certId}`,
    robots: "noindex",
  };
}

export default async function VerifyCertificatePage({ params }: Props) {
  const [cert, supportEmail] = await Promise.all([
    db.certificate.findUnique({
      where: { uniqueId: params.certId },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, accreditationText: true } },
      },
    }),
    getSetting("site.supportEmail", "info@musawo.ug"),
  ]);

  // Log verification
  if (cert) {
    await db.certVerification.create({
      data: { certificateId: cert.id },
    });
  }

  if (!cert) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-surface">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4" aria-hidden="true">❌</div>
          <h1 className="text-xl font-bold text-danger mb-2">
            Certificate Not Found
          </h1>
          <p className="text-gray-500 text-sm">
            No certificate exists for ID: <code className="font-mono">{params.certId}</code>
          </p>
          <p className="text-gray-400 text-xs mt-2">
            If you believe this is an error, contact{" "}
            <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>
          </p>
        </div>
      </main>
    );
  }

  const isRevoked = !!cert.revokedAt;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-surface py-12">
      <div className="card max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Image
            src="/assets/logo.webp"
            alt="Musawo Training Center"
            width={100}
            height={30}
            className="h-7 w-auto"
          />
        </div>

        {isRevoked ? (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6">
            <p className="text-danger font-semibold">⚠️ Certificate Revoked</p>
            {cert.revokedReason && (
              <p className="text-sm text-gray-600 mt-1">{cert.revokedReason}</p>
            )}
          </div>
        ) : (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <p className="text-green-800 font-semibold">✅ Certificate Valid</p>
            <p className="text-sm text-green-700 mt-1">
              This certificate is authentic and has not been revoked.
            </p>
          </div>
        )}

        <h1 className="text-xl font-bold mb-4">Certificate of Completion</h1>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Issued to</dt>
            <dd className="font-medium">{cert.user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Course</dt>
            <dd className="font-medium text-right max-w-xs">{cert.course.title}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Certificate ID</dt>
            <dd className="font-mono text-xs">{cert.uniqueId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Issued</dt>
            <dd>
              {new Date(cert.issuedAt).toLocaleDateString("en-UG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          {cert.course.accreditationText && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-gray-400">{cert.course.accreditationText}</p>
            </div>
          )}
        </dl>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-gray-400">
            Issued by{" "}
            <a href="https://learn.musawotraining.ug" className="text-primary">
              Musawo Training Center
            </a>{" "}
            · Plot 5, ADFA Building, Lungujja, Kampala, Uganda
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-primary no-underline">
            ← Back to Musawo Training Center
          </Link>
        </div>
      </div>
    </main>
  );
}
