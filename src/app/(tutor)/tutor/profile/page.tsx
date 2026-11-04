import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import InstructorProfileForm from "./InstructorProfileForm";
import AvatarUpload from "@/components/ui/AvatarUpload";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";


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
        avatarUrl: true,
      },
    }),
    db.course.count({ where: teachingCourseWhere(session.user.id) }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/tutor" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-3 no-underline transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account details</p>
      </div>

      <div className="card">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
          <div className="flex-shrink-0">
            <AvatarUpload
              userId={user.id}
              avatarUrl={user.avatarUrl}
              name={user.name}
              size="md"
            />
          </div>
          <div className="pt-1">
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
