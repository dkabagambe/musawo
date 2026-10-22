import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import AccessReviewDesk from "./AccessReviewDesk";

export const metadata = { title: "Staff Access Review" };

export default async function AccessReviewPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.access_review"))
    redirect("/403");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Access Review"
        subtitle="Review active staff accounts each quarter"
      />
      <AccessReviewDesk />
    </div>
  );
}
