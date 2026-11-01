import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileEditForm from "./ProfileEditForm";

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
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user.name?.charAt(0).toUpperCase() ?? "D"}
          </div>
          <div>
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
