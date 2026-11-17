import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

interface CSVRow {
  fullName: string;
  email: string;
  phone: string;
  courseCode: string;
  intakeLabel: string;
  dateOfBirth: string;
  gender: string;
  district?: string;
  highestQualification?: string;
  professionalTitle?: string;
  professionalRegistrationNumber?: string;
  emergencyContact?: string;
  category?: string;
}

interface ValidationResult {
  row: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file must have a header and at least one data row" },
        { status: 400 }
      );
    }

    if (lines.length > 101) {
      // 1 header + 100 data rows max
      return NextResponse.json(
        { error: "Maximum 100 students per batch" },
        { status: 400 }
      );
    }

    // Parse CSV
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    // Get courses and intakes for validation
    const [courses, intakes, existingEmails, existingPhones] = await Promise.all([
      db.course.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, courseCode: true },
      }),
      db.intake.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, label: true },
      }),
      db.user.findMany({
        where: { role: "STUDENT" },
        select: { email: true },
      }),
      db.user.findMany({
        where: { role: "STUDENT", phone: { not: null } },
        select: { phone: true },
      }),
    ]);

    const courseMap = new Map(courses.map((c) => [c.courseCode, c.id]));
    const intakeMap = new Map(intakes.map((i) => [i.label, i.id]));
    const emailSet = new Set(existingEmails.map((u) => u.email?.toLowerCase()));
    const phoneSet = new Set(existingPhones.map((u) => u.phone));

    // Validate rows
    const results: ValidationResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!row.fullName) errors.push("Full name is required");
      if (!row.email) errors.push("Email is required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
        errors.push("Invalid email format");
      else if (emailSet.has(row.email.toLowerCase()))
        errors.push("Email already exists");

      if (!row.phone) errors.push("Phone is required");
      else if (phoneSet.has(row.phone)) errors.push("Phone already exists");

      if (!row.courseCode) errors.push("Course code is required");
      else if (!courseMap.has(row.courseCode))
        errors.push(`Invalid course code: ${row.courseCode}`);

      if (!row.intakeLabel) errors.push("Intake label is required");
      else if (!intakeMap.has(row.intakeLabel))
        errors.push(`Invalid intake label: ${row.intakeLabel}`);

      if (!row.dateOfBirth) errors.push("Date of birth is required");
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth))
        errors.push("Date of birth must be YYYY-MM-DD format");

      if (!row.gender) errors.push("Gender is required");
      else if (!["Male", "Female", "Other"].includes(row.gender))
        errors.push("Gender must be Male, Female, or Other");

      // Optional validations
      if (
        row.category &&
        !["REGULAR", "PROFESSIONAL", "INTERNATIONAL"].includes(row.category)
      ) {
        errors.push("Category must be REGULAR, PROFESSIONAL, or INTERNATIONAL");
      }

      // Warnings
      if (!row.district) warnings.push("District not provided");
      if (!row.emergencyContact)
        warnings.push("Emergency contact not provided");

      results.push({
        row: i + 2, // +2 because row 1 is header and we're 0-indexed
        data: row as Record<string, string>,
        errors,
        warnings,
      });
    }

    // If validating only, return results
    if (action === "validate") {
      return NextResponse.json({ results });
    }

    // If importing, create student accounts for valid rows
    if (action === "import") {
      const validRows = results.filter((r) => r.errors.length === 0);
      let imported = 0;
      let failed = 0;

      for (const result of validRows) {
        try {
          const row = result.data as any as CSVRow;
          const courseId = courseMap.get(row.courseCode);
          const intakeId = intakeMap.get(row.intakeLabel);

          if (!courseId || !intakeId) {
            failed++;
            continue;
          }

          // Generate registration number
          const year = new Date().getFullYear();
          const existingCount = await db.user.count({
            where: {
              studentNumber: {
                startsWith: `${year}/${row.courseCode}/`,
              },
            },
          });
          const nextNumber = existingCount + 1;
          const registrationNumber = `${year}/${row.courseCode}/${nextNumber.toString().padStart(3, "0")}`;

          // Create student
          const student = await db.user.create({
            data: {
              name: row.fullName,
              email: row.email,
              phone: row.phone,
              role: "STUDENT",
              status: "PENDING",
              studentNumber: registrationNumber,
              dateOfBirth: new Date(row.dateOfBirth),
              gender: row.gender,
              district: row.district || null,
              highestQualification: row.highestQualification || null,
              professionalTitle: row.professionalTitle || null,
              professionalRegistrationNumber:
                row.professionalRegistrationNumber || null,
              emergencyContact: row.emergencyContact || null,
              countryCode: "UG",
              emailVerified: null,
              dataConsentAt: new Date(),
              passwordHash: await hash(Math.random().toString(36), 10),
            },
          });

          // Create enrolment
          await db.enrolment.create({
            data: {
              userId: student.id,
              courseId,
              intakeId,
              status: "PENDING",
              enrolmentDate: new Date(),
            },
          });

          // Create approval request
          await db.approvalRequest.create({
            data: {
              type: "ADMISSION",
              requestedBy: session.user.id,
              reason: `Bulk import: ${row.fullName} for ${row.courseCode}`,
              status: "PENDING",
              submittedAt: new Date(),
            },
          });

          imported++;
        } catch (error) {
          console.error("[CSV import] Failed to create student:", error);
          failed++;
        }
      }

      // Audit log
      await db.auditLog.create({
        data: {
          action: "STUDENTS_BULK_IMPORT",
          performedBy: session.user.id,
          details: {
            totalRows: rows.length,
            imported,
            failed,
          },
        },
      });

      return NextResponse.json({ imported, failed });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/students/import]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
