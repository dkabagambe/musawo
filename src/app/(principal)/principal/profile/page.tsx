import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileForm from "@/app/(dashboard)/dashboard/profile/ProfileForm";
import AvatarUpload from "@/components/ui/AvatarUpload";
export const dynamic = "force-dynamic";


export const metadata = { title: "Profile - Principal" };

export default async function PrincipalProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      district: true,
      countryCode: true,
      highestQualification: true,
      professionalTitle: true,
      registrationNumber: true,
      emergencyContact: true,
      avatarUrl: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal details</p>
      </div>
      <div className="card mb-6 flex justify-center">
        <AvatarUpload
          userId={user.id}
          avatarUrl={user.avatarUrl}
          name={user.name}
          size="lg"
        />
      </div>
      <div className="card">
        <ProfileForm
          user={{
            name: user.name,
            email: user.email ?? "",
            studentNumber: null,
            registrationNumber: user.registrationNumber,
            phone: user.phone ?? "",
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
            gender: user.gender,
            district: user.district,
            countryCode: user.countryCode,
            highestQualification: user.highestQualification,
            professionalTitle: user.professionalTitle,
            emergencyContact: user.emergencyContact,
          }}
        />
      </div>
    </div>
  );
}
