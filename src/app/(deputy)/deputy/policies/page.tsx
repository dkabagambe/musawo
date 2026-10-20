import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { FileText } from "lucide-react";

export const metadata = { title: "Policies - Deputy Principal" };

const POLICIES = [
  { title: "Fees and Tuition Policy",      href: "/admissions/fees" },
  { title: "Refund Policy",                href: "/refund" },
  { title: "Terms and Conditions",         href: "/terms" },
  { title: "Privacy Policy",               href: "/privacy" },
  { title: "Code of Conduct",              href: "#" },
  { title: "Attendance and Exams Policy",  href: "#" },
];

export default async function DeputyPoliciesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "policies.view")) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Institutional Policies</h1>
        <p className="text-gray-500 text-sm mt-1">View-only. Policies are editable by the Principal or Super Admin.</p>
      </div>
      <div className="card divide-y divide-border">
        {POLICIES.map((p) => (
          <a key={p.title} href={p.href} className="flex items-center gap-4 p-4 no-underline hover:bg-surface/60 transition-colors group">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <p className="font-medium text-primary group-hover:text-accent transition-colors">{p.title}</p>
            {p.href === "#" && <span className="ml-auto text-xs text-gray-300 italic">Placeholder - to be supplied by Dr Joel Mirembe</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
