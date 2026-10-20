import { db } from "@/lib/db";
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import { getContactInfo } from "@/lib/contact";
import { FileText, BookOpen, ClipboardList, FileCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Resource Library",
  description: "Free healthcare resources, PDFs, and guides from Musawo Training Center.",
};

const CATEGORY_META: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  "Reference":   { icon: BookOpen,      color: "bg-primary/10 text-primary",   label: "Reference" },
  "Guides":      { icon: FileText,      color: "bg-accent/10 text-accent",     label: "Guides" },
  "Study aids":  { icon: ClipboardList, color: "bg-success/10 text-success",   label: "Study aids" },
  "Forms":       { icon: FileCheck,     color: "bg-warning/10 text-warning",   label: "Forms" },
  "General":     { icon: FileText,      color: "bg-gray-100 text-gray-500",    label: "General" },
};

// fileSizeLabel kept for future use when resource sizes are shown

export default async function ResourcesPage() {
  const [resources, contact] = await Promise.all([
    db.resource.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
    }),
    getContactInfo(),
  ]);

  const categories = ["Reference", "Guides", "Study aids", "Forms", "General"];
  const byCategory: Record<string, typeof resources> = {};
  for (const r of resources) {
    const cat = r.category ?? "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }
  const usedCategories = categories.filter((c) => byCategory[c]?.length > 0);

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-resources.webp"
        imageAlt="Musawo Training Center healthcare services and educational resources"
        title="Free Resource Library"
        description="Healthcare guides, reference materials, and study aids - free for everyone, no account required."
        breadcrumbs={[{ label: "Resources" }]}
        boxSide="left"
        objectPosition="right center"
      />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {resources.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4" aria-hidden="true">📚</p>
            <h2 className="text-xl font-bold text-primary mb-2">Resources coming soon</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              Our library is being built. Check back soon for free healthcare guides and study materials.
            </p>
          </div>
        ) : (
          <>
            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-10" role="list" aria-label="Resource categories">
              {usedCategories.map((cat) => {
                const meta = CATEGORY_META[cat] ?? CATEGORY_META["General"];
                const Icon = meta.icon;
                return (
                  <a
                    key={cat}
                    href={`#cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                    role="listitem"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold no-underline transition-colors hover:opacity-80 ${meta.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {meta.label}
                    <span className="font-normal opacity-60">({byCategory[cat].length})</span>
                  </a>
                );
              })}
            </div>

            {/* Resources by category */}
            {usedCategories.map((cat) => {
              const meta = CATEGORY_META[cat] ?? CATEGORY_META["General"];
              const Icon = meta.icon;
              return (
                <div key={cat} id={`cat-${cat.toLowerCase().replace(/\s+/g, "-")}`} className="mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-lg font-bold text-primary">{meta.label}</h2>
                    <span className="text-xs text-gray-400">({byCategory[cat].length})</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {byCategory[cat].map((r) => (
                      <ResourceCard key={r.id} resource={r} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
      <CTABand
        heading="Want full course access?"
        subheading="These free resources are just a sample. Enrolled students get the complete study library."
        primaryLabel="Enrol now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}

function ResourceCard({ resource }: { resource: { id: string; title: string; description: string | null; mimeType: string; category: string | null; createdAt: Date } }) {
  const typeLabel = resource.mimeType.includes("pdf") ? "PDF"
    : resource.mimeType.includes("word") ? "Word"
    : resource.mimeType.includes("image") ? "Image"
    : "File";

  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex items-start gap-4 hover:shadow-card-hover transition-shadow">
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-primary leading-snug mb-1">{resource.title}</p>
        {resource.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{resource.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{typeLabel}</span>
          <span>{new Date(resource.createdAt).toLocaleDateString("en-UG", { month: "short", year: "numeric" })}</span>
        </div>
      </div>
      <a
        href={`/api/resources/${resource.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 flex items-center gap-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white text-xs font-semibold px-3 py-2 rounded-xl no-underline transition-colors"
        aria-label={`Open ${resource.title}`}
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        Open resource
      </a>
    </div>
  );
}
