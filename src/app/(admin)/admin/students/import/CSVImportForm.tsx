"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface Course {
  id: string;
  title: string;
  courseCode: string;
}

interface Intake {
  id: string;
  label: string;
}

interface Props {
  courses: Course[];
  intakes: Intake[];
}

interface ValidationResult {
  row: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export default function CSVImportForm({ courses, intakes }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setResults(null);
    setError("");
    setSuccess("");
  }

  async function handleValidate() {
    if (!file) return;

    setValidating(true);
    setError("");
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "validate");

      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        results?: ValidationResult[];
      };

      if (!res.ok) {
        setError(data.error ?? "Validation failed");
        return;
      }

      setResults(data.results ?? []);
    } catch {
      setError("Network error during validation");
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    if (!file || !results) return;

    const validRows = results.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      setError("No valid rows to import. Fix errors first.");
      return;
    }

    if (
      !confirm(
        `Import ${validRows.length} student${validRows.length !== 1 ? "s" : ""}? This will create accounts pending Principal approval.`
      )
    ) {
      return;
    }

    setImporting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "import");

      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        imported?: number;
        failed?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      setSuccess(
        `Successfully imported ${data.imported} student${data.imported !== 1 ? "s" : ""}. ${data.failed ?? 0} failed.`
      );
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/admin/students");
      }, 2000);
    } catch {
      setError("Network error during import");
    } finally {
      setImporting(false);
    }
  }

  const validCount = results?.filter((r) => r.errors.length === 0).length ?? 0;
  const errorCount = results?.filter((r) => r.errors.length > 0).length ?? 0;
  const warningCount = results?.filter((r) => r.warnings.length > 0).length ?? 0;

  return (
    <div className="space-y-6">
      {/* File upload */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">1. Select CSV File</h2>
        
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <label className="cursor-pointer">
            <span className="text-sm text-primary font-medium hover:underline">
              Click to upload
            </span>
            <span className="text-sm text-gray-500"> or drag and drop</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-2">CSV file, max 5MB, up to 100 rows</p>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 bg-surface rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-danger hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        {file && !results && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className="btn-primary mt-4"
          >
            {validating ? "Validating..." : "Validate CSV"}
          </button>
        )}
      </div>

      {/* Validation results */}
      {results && (
        <>
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">2. Validation Results</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-success">Valid</span>
                </div>
                <p className="text-2xl font-bold">{validCount}</p>
              </div>
              
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-danger" />
                  <span className="text-sm font-semibold text-danger">Errors</span>
                </div>
                <p className="text-2xl font-bold">{errorCount}</p>
              </div>
              
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-semibold text-warning">Warnings</span>
                </div>
                <p className="text-2xl font-bold">{warningCount}</p>
              </div>
            </div>

            {/* Detailed results */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.row}
                  className={`p-3 rounded-lg border ${
                    result.errors.length > 0
                      ? "bg-danger/5 border-danger/20"
                      : result.warnings.length > 0
                      ? "bg-warning/5 border-warning/20"
                      : "bg-success/5 border-success/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500">
                      Row {result.row}
                    </span>
                    {result.errors.length === 0 && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                  </div>
                  
                  <p className="text-sm font-medium mb-1">
                    {result.data.fullName || "No name"} ({result.data.email || "No email"})
                  </p>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-danger flex items-start gap-1">
                          <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {result.warnings.length > 0 && (
                    <div className="mt-2">
                      {result.warnings.map((warn, i) => (
                        <p key={i} className="text-xs text-warning flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {warn}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Import button */}
          {validCount > 0 && (
            <div className="card">
              <h2 className="font-semibold text-lg mb-4">3. Confirm Import</h2>
              <p className="text-sm text-gray-600 mb-4">
                {validCount} student{validCount !== 1 ? "s" : ""} ready to import.
                {errorCount > 0 && ` ${errorCount} row${errorCount !== 1 ? "s" : ""} with errors will be skipped.`}
              </p>
              
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary"
              >
                {importing ? "Importing..." : `Import ${validCount} Student${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}
    </div>
  );
}
