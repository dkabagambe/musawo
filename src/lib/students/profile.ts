import { db } from "@/lib/db";

export interface StudentProfileFields {
  professionalTitle?: string | null;
  registrationNumber?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  district?: string | null;
  highestQualification?: string | null;
  idNumberEncrypted?: string | null;
  emergencyContact?: string | null;
}

/** Persist profile columns that are present in the migration but absent from the generated client. */
export async function saveStudentProfile(userId: string, profile: StudentProfileFields) {
  await db.$executeRaw`
    UPDATE users SET
      "professionalTitle" = ${profile.professionalTitle ?? null},
      "registrationNumber" = ${profile.registrationNumber ?? null},
      "dateOfBirth" = ${profile.dateOfBirth ?? null},
      "gender" = ${profile.gender ?? null},
      "district" = ${profile.district ?? null},
      "highestQualification" = ${profile.highestQualification ?? null},
      "idNumberEncrypted" = ${profile.idNumberEncrypted ?? null},
      "emergencyContact" = ${profile.emergencyContact ?? null}
    WHERE id = ${userId}
  `;
}
