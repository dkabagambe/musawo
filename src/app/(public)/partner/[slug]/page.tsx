import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPresignedDownloadUrl } from "@/lib/s3";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await db.partnerPage.findUnique({
    where: { slug: params.slug, active: true },
    select: { partnerName: true, heading: true },
  });
  if (!page) return {};
  return {
    title: `${page.partnerName} - Musawo Training Center`,
    description: page.heading,
    robots: "noindex", // Partner pages are private campaign pages
  };
}

export default async function PartnerPage({ params }: Props) {
  const page = await db.partnerPage.findUnique({
    where: { slug: params.slug, active: true },
  });

  if (!page) notFound();

  let logoUrl: string | null = null;
  if (page.logoS3Key) {
    try {
      logoUrl = await getPresignedDownloadUrl(page.logoS3Key);
    } catch {
      // Non-fatal
    }
  }

  return (
    <>
      <header className="bg-primary text-white py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Image
            src="/assets/logo.webp"
            alt="Musawo Training Center"
            width={100}
            height={30}
            className="h-7 w-auto"
          />
          {logoUrl && (
            <>
              <span className="text-white/30">×</span>
              <Image
                src={logoUrl}
                alt={`${page.partnerName} logo`}
                width={100}
                height={30}
                className="h-7 w-auto"
              />
            </>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        {page.partnerName && (
          <p className="text-sm text-accent font-semibold mb-2 uppercase tracking-wide">
            {page.partnerName} × Musawo Training Center
          </p>
        )}
        <h1 className="text-3xl font-bold mb-6 text-balance">{page.heading}</h1>
        <div
          className="prose prose-gray max-w-none mb-10"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
        <Link href={page.ctaUrl} className="btn-primary text-base px-8 py-3 no-underline">
          {page.ctaText}
        </Link>
      </main>

      <footer className="bg-surface py-8 px-4 text-center text-xs text-gray-400">
        <p>
          Musawo Training Center - Allied Doctors and Friends of Uganda
        </p>
        <p className="mt-1">
          <a href="https://mtc.ac.ug" className="text-primary no-underline hover:underline">
            mtc.ac.ug
          </a>
        </p>
      </footer>
    </>
  );
}
