import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileEditForm from "./ProfileEditForm";
import AvatarUpload from "@/components/ui/AvatarUpload";
export const dynamic = "force-dynamic";


export const metadata = { title: "Profile & Settings - Director" };

export default async function DirectorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      totpEnabled: true,
      createdAt: true,
      role: true,
      status: true,
      avatarUrl: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Profile & Settings</h1>
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
            <p className="text-xs text-gray-400 uppercase tracking-wide">Director</p>
          </div>
        </div>

        <ProfileEditForm
          userId={user.id}
          initialName={user.name ?? ""}
          initialPhone={user.phone ?? ""}
          email={user.email ?? ""}
          totpEnabled={user.totpEnabled}
        />
      </div>

      <div className="card text-sm text-gray-500 space-y-1">
        <p>Account created: {new Date(user.createdAt).toLocaleDateString("en-UG")}</p>
        <p>Status: <span className={`font-semibold ${user.status === "ACTIVE" ? "text-success" : "text-danger"}`}>{user.status}</span></p>
      </div>
    </div>
  );
}
