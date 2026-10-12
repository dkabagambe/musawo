import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Resource Library — Musawo Training Center",
  description: "Free healthcare resources, PDFs, and guides from Musawo Training Center.",
};

export default async function ResourcesPage() {
  const resources = await db.resource.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by category
  const byCategory: Record<string, typeof resources> = {};
  for (const r of resources) {
    const cat = r.category ?? "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Free Resource Library</h1>
          <p className="text-white/70 max-w-xl mx-auto">
            Healthcare guides, reference materials, and study aids — free for everyone,
            no account required.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {resources.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4" aria-hidden="true">📚</p>
            <p className="text-gray-500">No resources available yet. Check back soon.</p>
          </div>
        )}

        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span aria-hidden="true">📂</span>
              {category}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map((r) => (
                <article key={r.id} className="card flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
                    {r.mimeType.includes("pdf") ? "📄" : r.mimeType.includes("video") ? "🎥" : "📎"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug">{r.title}</h3>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.createdAt).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <a
                    href={`/api/resources/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-xs px-3 py-1.5 no-underline flex-shrink-0"
                  >
                    Download
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
