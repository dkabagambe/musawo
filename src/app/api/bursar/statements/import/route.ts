import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { uploadBuffer } from "@/lib/s3";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

/**
 * POST /api/bursar/statements/import
 * Multipart form: file (CSV text), bank, periodStart, periodEnd, columnMapping (JSON)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role, "statements.import");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const bank = formData.get("bank") as string | null;
  const periodStartRaw = formData.get("periodStart") as string | null;
  const periodEndRaw = formData.get("periodEnd") as string | null;
  const columnMappingRaw = formData.get("columnMapping") as string | null;
  const filename = (file instanceof File ? file.name : null) ?? "statement.csv";

  if (!file || !bank || !periodStartRaw || !periodEndRaw || !columnMappingRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let columnMapping: Record<string, number>;
  try {
    columnMapping = JSON.parse(columnMappingRaw) as Record<string, number>;
  } catch {
    return NextResponse.json({ error: "columnMapping must be valid JSON" }, { status: 400 });
  }

  const csvText = file instanceof File ? await file.text() : (file as string);
  const periodStart = new Date(periodStartRaw);
  const periodEnd = new Date(periodEndRaw);

  // Upload raw CSV to S3
  const s3Key = `statement-imports/${session.user.id}/${Date.now()}-${filename}`;
  await uploadBuffer(s3Key, Buffer.from(csvText, "utf-8"), "text/csv");

  // Parse CSV
  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
  const dataRows = lines.slice(1); // skip header

  // Create StatementImport record
  const importRecord = await db.statementImport.create({
    data: {
      uploadedById: session.user.id,
      filename,
      bank,
      periodStart,
      periodEnd,
      lineCount: dataRows.length,
      s3Key,
    },
  });

  // Parse and create StatementLines
  let matchedCount = 0;
  let unmatchedCount = 0;
  let unclaimedCount = 0;

  const txDateCol   = columnMapping.txDate   ?? 0;
  const referenceCol = columnMapping.reference ?? 1;
  const descriptionCol = columnMapping.description ?? 2;
  const amountCol   = columnMapping.amount   ?? 3;

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(",");
    const txDateRaw = cols[txDateCol]?.trim();
    const reference = cols[referenceCol]?.trim() ?? "";
    const description = cols[descriptionCol]?.trim() ?? "";
    const amountRaw = cols[amountCol]?.trim().replace(/[^0-9.-]/g, "") ?? "0";

    if (!txDateRaw || !reference) continue;

    const txDate = new Date(txDateRaw);
    const amount = Math.round(parseFloat(amountRaw));
    if (isNaN(amount) || isNaN(txDate.getTime())) continue;

    const line = await db.statementLine.create({
      data: {
        importId: importRecord.id,
        lineNumber: i + 1,
        txDate,
        reference,
        description,
        amount,
        matchStatus: "UNMATCHED",
      },
    });

    // Auto-match: find ManualPaymentClaim where transactionId === reference
    // AND amount matches AND claimedAt within 3 days of txDate
    // AND status IN SUBMITTED, UNDER_REVIEW, VERIFIED
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const matchedClaim = await db.manualPaymentClaim.findFirst({
      where: {
        transactionId: reference,
        amount,
        claimedAt: {
          gte: new Date(txDate.getTime() - threeDays),
          lte: new Date(txDate.getTime() + threeDays),
        },
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"] },
      },
    });

    if (matchedClaim) {
      await db.statementLine.update({
        where: { id: line.id },
        data: { matchStatus: "MATCHED" },
      });
      await db.manualPaymentClaim.update({
        where: { id: matchedClaim.id },
        data: { statementLineId: line.id },
      });
      matchedCount++;
    } else {
      // Check if any claim exists for this reference (unclaimed line)
      const anyClaim = await db.manualPaymentClaim.findFirst({
        where: { transactionId: reference },
      });
      if (!anyClaim) {
        await db.statementLine.update({
          where: { id: line.id },
          data: { matchStatus: "UNCLAIMED" },
        });
        unclaimedCount++;
      } else {
        unmatchedCount++;
      }
    }
  }

  await db.statementImport.update({
    where: { id: importRecord.id },
    data: { matchedCount, unmatchedCount, unclaimedCount },
  });

  await audit({
    actorId: session.user.id,
    action: "STATEMENT_IMPORTED",
    entityType: "StatementImport",
    entityId: importRecord.id,
    metadata: { bank, lineCount: dataRows.length, matchedCount, unmatchedCount, unclaimedCount },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({
    importId: importRecord.id,
    lineCount: dataRows.length,
    matchedCount,
    unmatchedCount,
    unclaimedCount,
  });
}
