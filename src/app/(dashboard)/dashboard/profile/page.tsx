import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      studentNumber: true,
      avatarUrl: true,
      createdAt: true,
      status: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">My Profile</h1>

      {/* User info card */}
      <div className="card mb-6 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold flex-shrink-0"
          aria-hidden="true"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-semibold">{user.name}</h2>
          {user.studentNumber && (
            <p className="text-xs text-gray-400 font-mono">{user.studentNumber}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            Member since{" "}
            {new Date(user.createdAt).toLocaleDateString("en-UG", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <ProfileForm
        user={{
          name: user.name,
          email: user.email ?? "",
          phone: user.phone ?? "",
        }}
      />
    </div>
  );
}
