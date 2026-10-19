import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
export const metadata = { title: "Deputy Principal" };
export default async function DeputyPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-2">Deputy Principal</h1>
      <p className="text-gray-500 text-sm">Daily operations, timetable and student support.</p>
      <div className="card mt-8 p-8 text-center">
        <p className="text-gray-500 text-sm">Full Deputy Principal portal coming in Batch E.</p>
      </div>
    </div>
  );
}
