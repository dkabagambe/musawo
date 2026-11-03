import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";


export const metadata = { title: "Delegation - Principal" };

const DELEGATABLE: Record<string, string> = {
  "delegation.exams.release": "Release exam results",
  "delegation.graduands.approve": "Approve graduands",
  "delegation.certificates.issue": "Issue certificates",
  "delegation.courses.publish": "Publish courses",
  "delegation.marks.change.approve": "Approve marks-change requests",
};

export default async function PrincipalDelegationPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.publish"))
    redirect("/principal");

  const settings = await db.siteSetting.findMany({
    where: { key: { in: Object.keys(DELEGATABLE) } },
    select: { key: true, value: true },
  });
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));

  const entries = Object.entries(DELEGATABLE).map(([key, label]) => {
    const raw = settingMap.get(key) ?? "";
    let active = false;
    let until: string | null = null;
    try {
      const parsed = JSON.parse(raw) as { enabled?: boolean; until?: string };
      active = !!parsed.enabled;
      if (parsed.until && new Date(parsed.until) < new Date()) active = false;
      until = parsed.until ?? null;
    } catch {
      active = raw === "true";
    }
    return { key, label, active, until };
  });

  return (
    <main className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Delegation to Deputy Principal</h1>
        <p className="portal-page-subtitle">
          Grant the Deputy Principal time-limited authority to act on your behalf.
          Changes are applied via the API and expire automatically.
        </p>
      </div>

      <div className="portal-list">
        {entries.map((e) => (
          <div key={e.key} className="portal-list-item">
            <span className="portal-list-item-title">{e.label}</span>
            <span className="portal-list-item-meta">
              {e.active
                ? `Active${e.until ? ` until ${new Date(e.until).toLocaleDateString("en-GB")}` : ""}`
                : "Not delegated"}
            </span>
          </div>
        ))}
      </div>

      <p className="portal-page-note">
        Use the API endpoints at <code>/api/principal/delegation</code> to
        grant or revoke delegation with an expiry date.
      </p>
    </main>
  );
}
