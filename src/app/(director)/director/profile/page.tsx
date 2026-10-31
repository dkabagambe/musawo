import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Profile & Settings - Director" };

export default async function DirectorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account details and security settings</p>
      </div>
      <div className="card space-y-3">
        <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {session.user.name}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {session.user.email}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Role:</span> Director</p>
      </div>
      <div className="card py-12 text-center text-gray-400 text-sm">
        Profile editing and TOTP settings coming soon.
      </div>
    </div>
  );
}
