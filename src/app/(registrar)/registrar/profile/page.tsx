import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Profile - Academic Registrar" };

export default async function RegistrarProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your account details</p>
      </div>
      <div className="card space-y-3">
        <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {session.user.name}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {session.user.email}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Role:</span> Academic Registrar</p>
      </div>
    </div>
  );
}
