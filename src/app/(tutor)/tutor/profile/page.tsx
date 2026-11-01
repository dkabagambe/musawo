import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import InstructorProfileForm from "./InstructorProfileForm";

export const metadata = { title: "Profile - Teaching Portal" };

export default async function TutorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, courseCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, phone: true,
        totpEnabled: true, createdAt: true, status: true,
      },
    }),
    db.course.count({ where: teachingCourseWhere(session.user.id) }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account details</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user.name?.charAt(0).toUpperCase() ?? "I"}
          </div>
          <div>
            <p className="font-semibold text-lg text-primary">{user.name}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Instructor</p>
            <p className="text-xs text-gray-400">{courseCount} course{courseCount !== 1 ? "s" : ""} assigned</p>
          </div>
        </div>

        <InstructorProfileForm
          userId={user.id}
          initialName={user.name ?? ""}
          initialPhone={user.phone ?? ""}
          email={user.email ?? ""}
          totpEnabled={user.totpEnabled}
        />
      </div>
    </div>
  );
}
