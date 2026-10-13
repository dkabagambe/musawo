import React from "react";
import Link from "next/link";

// ─── CertificateBadge ─────────────────────────────────────────────────────────

export interface CertificateBadgeProps {
  uniqueId: string;
  courseTitle: string;
  issuedAt: string | Date;
  revoked?: boolean;
}

export function CertificateBadge({
  uniqueId,
  courseTitle,
  issuedAt,
  revoked = false,
}: CertificateBadgeProps) {
  const issuedDate = new Date(issuedAt).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`card flex items-start gap-4 ${revoked ? "opacity-50" : ""}`}>
      <span className="text-3xl flex-shrink-0" aria-hidden="true">📜</span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{courseTitle}</h3>
        <p className="text-xs text-gray-400 mt-0.5 font-mono">{uniqueId}</p>
        <p className="text-xs text-gray-400">Issued: {issuedDate}</p>
        {revoked && (
          <p className="text-xs text-danger font-medium mt-1">⚠️ Revoked</p>
        )}
      </div>
      {!revoked && (
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          <Link
            href={`/verify/${uniqueId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent no-underline hover:underline"
          >
            Verify ↗
          </Link>
          <Link
            href={`/api/certificates/${uniqueId}/download`}
            className="btn-outline text-xs px-3 py-1 no-underline"
          >
            Download PDF
          </Link>
        </div>
      )}
    </div>
  );
}
