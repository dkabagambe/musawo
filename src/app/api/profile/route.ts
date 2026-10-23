import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.string().max(30).optional(),
  district: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  highestQualification: z.string().max(100).optional(),
  professionalTitle: z.string().max(100).optional(),
  registrationNumber: z.string().max(100).optional(),
  emergencyContact: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const {
    name,
    phone,
    dateOfBirth,
    gender,
    district,
    countryCode,
    highestQualification,
    professionalTitle,
    registrationNumber,
    emergencyContact,
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
      ...(name ? { name } : {}),
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
      ...(registrationNumber !== undefined
        ? { registrationNumber: registrationNumber || null }
        : {}),
      ...(emergencyContact !== undefined
        ? { emergencyContact: emergencyContact || null }
        : {}),
    },
    select: { id: true, name: true, phone: true },
  });

  return NextResponse.json({ user });
}
