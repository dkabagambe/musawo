import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Partner Pages - Admin" };

export default async function AdminPartnerPagesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "partner_pages.edit")) redirect("/dashboard");

  const pages = await db.partnerPage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">Partner Campaign Pages</h1>

      {/* Create form */}
      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Create new partner page</h2>
        <form action="/api/admin/partner-pages" method="POST" className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="partnerName">Partner name</label>
            <input id="partnerName" name="partnerName" type="text" required className="input" placeholder="Acme Health NGO" />
          </div>
          <div>
            <label className="label" htmlFor="slug">URL slug</label>
            <input id="slug" name="slug" type="text" required className="input" placeholder="acme-health" pattern="[a-z0-9-]+" />
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="heading">Heading</label>
            <input id="heading" name="heading" type="text" required className="input" placeholder="Train with Acme Health x Musawo" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="body">Body text</label>
            <textarea id="body" name="body" rows={4} required className="input resize-y" placeholder="Describe the partnership offer…" />
          </div>
          <div>
            <label className="label" htmlFor="ctaText">CTA button text</label>
            <input id="ctaText" name="ctaText" type="text" defaultValue="Enrol Now" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="ctaUrl">CTA URL</label>
            <input id="ctaUrl" name="ctaUrl" type="text" defaultValue="/register" className="input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Create page</button>
          </div>
        </form>
      </div>

      {/* Existing pages */}
      <div className="space-y-4">
        {pages.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm">No partner pages yet.</p>
          </div>
        )}
        {pages.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold">{p.partnerName}</h2>
                <span className={`badge text-xs ${p.active ? "badge-success" : "badge-danger"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-gray-500">{p.heading}</p>
              <a
                href={`/partner/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent no-underline hover:underline"
              >
                /partner/{p.slug} ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
