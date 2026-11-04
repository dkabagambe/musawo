import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileForm from "./ProfileForm";
import AvatarUpload from "@/components/ui/AvatarUpload";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";


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
      dateOfBirth: true,
      gender: true,
      district: true,
      countryCode: true,
      highestQualification: true,
      professionalTitle: true,
      registrationNumber: true,
      emergencyContact: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4 no-underline transition-colors">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to dashboard
      </Link>
      <h1 className="text-2xl mb-6">My Profile</h1>

      {/* User info card */}
      <div className="card mb-6 flex items-start gap-4">
        <div className="flex-shrink-0">
          <AvatarUpload
            userId={user.id}
            avatarUrl={user.avatarUrl}
            name={user.name}
            size="md"
          />
        </div>
        <div className="pt-1">
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
          {user.status === "DETAILS_DISPUTED" && (
            <p className="text-xs text-danger mt-1 font-medium">
              ⚠ Your details are being reviewed. Contact the Registrar if you have not yet done so.
            </p>
          )}
        </div>
      </div>

      <ProfileForm
        user={{
          name: user.name,
          email: user.email ?? "",
          studentNumber: user.studentNumber ?? null,
          registrationNumber: user.registrationNumber ?? null,
          phone: user.phone ?? "",
          dateOfBirth: user.dateOfBirth
            ? user.dateOfBirth.toISOString().slice(0, 10)
            : null,
          gender: user.gender,
          district: user.district,
          countryCode: user.countryCode ?? "UG",
          highestQualification: user.highestQualification,
          professionalTitle: user.professionalTitle,
          emergencyContact: user.emergencyContact,
        }}
      />
    </div>
  );
}
