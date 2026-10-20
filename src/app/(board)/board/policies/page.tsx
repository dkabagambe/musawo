import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { FileText } from "lucide-react";

export const metadata = { title: "Policies - Board" };

const POLICIES = [
  { title: "Fees and Tuition Policy",      href: "/admissions/fees" },
  { title: "Refund Policy",                href: "/refund" },
  { title: "Terms and Conditions",         href: "/terms" },
  { title: "Privacy Policy",               href: "/privacy" },
  { title: "Code of Conduct",              note: "Placeholder - to be supplied by Dr Joel Mirembe" },
  { title: "Attendance and Exams Policy",  note: "Placeholder - to be supplied by Dr Joel Mirembe" },
];

export default async function BoardPoliciesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "policies.view")) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Institutional Policies</h1>
        <p className="text-gray-500 text-sm mt-1">View-only access for Board members.</p>
      </div>
      <div className="card divide-y divide-border">
        {POLICIES.map((p) => (
          <div key={p.title} className="flex items-center gap-4 p-4">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              {"href" in p && p.href ? (
                <a href={p.href} className="font-medium text-primary hover:text-accent no-underline transition-colors">{p.title}</a>
              ) : (
                <p className="font-medium text-primary">{p.title}</p>
              )}
              {"note" in p && p.note && <p className="text-xs text-gray-400 mt-0.5 italic">{p.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
