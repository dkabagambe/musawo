import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

const RowSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.union([z.string().trim().email().toLowerCase(), z.literal("")]).optional(),
  phone: z.union([z.string().trim().min(7).max(20), z.literal("")]).optional(),
  courseId: z.union([z.string().cuid(), z.literal("")]).optional(),
  intakeId: z.union([z.string().cuid(), z.literal("")]).optional(),
  category: z.enum(["OPEN", "PROFESSIONAL"]).default("OPEN"),
  professionalTitle: z.string().max(120).optional(),
  registrationNumber: z.string().max(80).optional(),
  dateOfBirth: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  gender: z.string().max(20).optional(),
  district: z.string().max(80).optional(),
  highestQualification: z.string().max(100).optional(),
  emergencyContact: z.string().max(200).optional(),
  idNumber: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requirePermission(session.user.role, "students.create");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const body = await req.json() as { rows?: unknown[] };
  if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 100) {
    return NextResponse.json({ error: "Upload between 1 and 100 student rows." }, { status: 400 });
  }

  const parsedRows = body.rows.map((input, index) => ({ index: index + 1, parsed: RowSchema.safeParse(input) }));
  const candidates = parsedRows.flatMap(({ parsed }) => parsed.success ? [parsed.data] : []);
  const emails = candidates.map((row) => row.email?.toLowerCase()).filter((value): value is string => !!value);
  const phones = candidates.map((row) => row.phone).filter((value): value is string => !!value);
  const [existing, courses] = await Promise.all([
    db.user.findMany({
      where: { OR: [...(emails.length ? [{ email: { in: emails } }] : []), ...(phones.length ? [{ phone: { in: phones } }] : [])] },
      select: { email: true, phone: true },
    }),
    db.course.findMany({ where: { id: { in: candidates.map((row) => row.courseId).filter((id): id is string => !!id) } }, select: { id: true, category: true } }),
  ]);

  const knownEmails = new Set(existing.map((user) => user.email?.toLowerCase()).filter(Boolean));
  const knownPhones = new Set(existing.map((user) => user.phone).filter(Boolean));
  const fileEmails = new Set<string>();
  const filePhones = new Set<string>();
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const results = parsedRows.map(({ index, parsed }) => {
    if (!parsed.success) return { row: index, valid: false, errors: ["Required fields are missing or a field is invalid."] };
    const data = parsed.data;
    const errors: string[] = [];
    const email = data.email?.toLowerCase();
    const phone = data.phone;
    if (!email && !phone) errors.push("Provide an email address or phone number.");
    if (email && knownEmails.has(email)) errors.push("Email already belongs to an account.");
    if (phone && knownPhones.has(phone)) errors.push("Phone already belongs to an account.");
    if (email && fileEmails.has(email)) errors.push("Email appears more than once in this file.");
    if (phone && filePhones.has(phone)) errors.push("Phone appears more than once in this file.");
    if (email) fileEmails.add(email);
    if (phone) filePhones.add(phone);
    if (data.category === "PROFESSIONAL" && (!data.professionalTitle || !data.registrationNumber)) {
      errors.push("Professional category requires a professional title and registration number.");
    }
    if (data.courseId) {
      const course = courseById.get(data.courseId);
      if (!course) errors.push("Course was not found.");
      else if (course.category === "PROFESSIONAL" && data.category !== "PROFESSIONAL") errors.push("Selected course requires the professional category.");
    }
    return { row: index, valid: errors.length === 0, errors };
  });

  return NextResponse.json({ results, validCount: results.filter((row) => row.valid).length });
}
