"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StudentRow = Record<string, string>;
type Preview = { row: number; valid: boolean; errors: string[] };

const FIELDS = ["name", "email", "phone", "courseId", "intakeId", "category", "professionalTitle", "registrationNumber", "dateOfBirth", "gender", "district", "highestQualification", "emergencyContact", "idNumber"];

function parseCsv(text: string): StudentRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const cells = (line: string) => {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
      else value += char;
    }
    values.push(value.trim());
    return values;
  };
  const headers = cells(lines[0]).map((header) => header.trim());
  if (!headers.includes("name")) return [];
  return lines.slice(1, 101).map((line) => {
    const values = cells(line);
    const row = Object.fromEntries(FIELDS.map((field) => [field, values[headers.indexOf(field)] ?? ""])) as StudentRow;
    row.category = row.category || "OPEN";
    return row;
  });
}

export default function StudentCsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reviewFile(file?: File) {
    setMessage(""); setPreview([]); setRows([]);
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (!parsed.length) { setMessage("CSV needs a header row with a name column and at least one student."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/students/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: parsed }),
      });
      const data = await response.json() as { error?: string; results?: Preview[] };
      if (!response.ok) throw new Error(data.error ?? "Could not review the CSV.");
      setRows(parsed); setPreview(data.results ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review the CSV.");
    } finally { setBusy(false); }
  }

  async function importRows() {
    setBusy(true); setMessage("");
    let created = 0;
    const failures: string[] = [];
    for (const check of preview.filter((item) => item.valid)) {
      try {
        const row = Object.fromEntries(Object.entries(rows[check.row - 1]).map(([key, value]) => [key, value || undefined]));
        const response = await fetch("/api/admin/students", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
        });
        const data = await response.json() as { error?: string };
        if (!response.ok) failures.push(`Row ${check.row}: ${data.error ?? "Could not create student."}`);
        else created += 1;
      } catch { failures.push(`Row ${check.row}: request failed.`); }
    }
    setMessage(`${created} student${created === 1 ? "" : "s"} created.${failures.length ? ` ${failures.join(" ")}` : ""}`);
    if (created) router.refresh();
    setBusy(false);
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Import students from CSV</h2>
      <p className="text-xs text-gray-500">Headers: name, email, phone, courseId, intakeId, category, professionalTitle, registrationNumber, dateOfBirth, gender, district, highestQualification, emergencyContact, idNumber. Maximum 100 rows.</p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="input" onChange={(event) => void reviewFile(event.target.files?.[0])} />
      {busy && <p className="text-sm text-gray-500">Processing…</p>}
      {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
      {preview.length > 0 && (
        <>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs"><thead><tr className="text-left text-gray-500"><th className="py-2 pr-3">Row</th><th className="py-2 pr-3">Name</th><th className="py-2">Review</th></tr></thead>
              <tbody className="divide-y divide-border">{preview.map((item) => <tr key={item.row}>
                <td className="py-2 pr-3">{item.row}</td><td className="py-2 pr-3">{rows[item.row - 1]?.name}</td>
                <td className={`py-2 ${item.valid ? "text-success" : "text-danger"}`}>{item.valid ? "Ready" : item.errors.join(" ")}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <button type="button" disabled={busy || !preview.some((item) => item.valid)} onClick={() => void importRows()} className="btn-primary text-sm">Create valid student records</button>
        </>
      )}
    </section>
  );
}
