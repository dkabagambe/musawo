import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Fields open to every authenticated user
const BaseSchema = z.object({
  // name is locked for ALL users - only Admin can change it
  phone: z.string().min(9).max(20).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.string().max(30).optional(),
  district: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  highestQualification: z.string().max(100).optional(),
  professionalTitle: z.string().max(100).optional(),
  emergencyContact: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BaseSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const {
    phone,
    dateOfBirth,
    gender,
    district,
    countryCode,
    highestQualification,
    professionalTitle,
    emergencyContact,
    bio,
    themePreference,
  } = parsed.data;

  if (phone) {
    const existing = await db.user.findFirst({
      where: { phone, NOT: { id: session.user.id } },
    });
    if (existing)
      return NextResponse.json(
        { error: "Phone number already in use." },
        { status: 409 },
      );
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      ...(gender !== undefined ? { gender: gender || null } : {}),
      ...(district !== undefined ? { district: district || null } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(highestQualification !== undefined
        ? { highestQualification: highestQualification || null }
        : {}),
      ...(professionalTitle !== undefined
        ? { professionalTitle: professionalTitle || null }
        : {}),
      ...(emergencyContact !== undefined
        ? { emergencyContact: emergencyContact || null }
        : {}),
      ...(bio !== undefined ? { bio: bio || null } : {}),
      ...(themePreference ? { themePreference } : {}),
    },
    select: { id: true, name: true, phone: true, bio: true, themePreference: true },
  });

  return NextResponse.json({ user });
}
