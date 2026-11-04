import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AvatarUpload from "@/components/ui/AvatarUpload";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";


export const metadata = { title: "Profile - Academic Registrar" };

export default async function RegistrarProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/registrar" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-3 no-underline transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your account details</p>
      </div>

      <div className="card flex justify-center">
        <AvatarUpload
          userId={user.id}
          avatarUrl={user.avatarUrl}
          name={user.name}
          size="lg"
        />
      </div>

      <div className="card space-y-3">
        <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {user.name}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {user.email ?? "—"}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Phone:</span> {user.phone || "—"}</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Role:</span> Academic Registrar</p>
        <p className="text-sm text-gray-600"><span className="font-medium">Member since:</span>{" "}
          {new Date(user.createdAt).toLocaleDateString("en-UG", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
