"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, FileText, Trash2, Eye, X, RefreshCw } from "lucide-react";

type StudentOption = { id: string; name: string; studentNumber: string | null };

type DocumentItem = {
  id: string;
  title: string;
  type: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  user: { name: string; studentNumber: string | null };
  uploadedBy: { name: string };
};

const TYPE_LABELS: Record<string, string> = {
  ID_SCAN: "ID Scan",
  ACADEMIC_CERT: "Academic Certificate",
  PHOTO: "Passport Photo",
  MEDICAL: "Medical Report",
  OTHER: "Other",
};

const TYPE_BADGE: Record<string, string> = {
  ID_SCAN: "badge-info",
  ACADEMIC_CERT: "badge-success",
  PHOTO: "badge-neutral",
  MEDICAL: "badge-warning",
  OTHER: "badge-neutral",
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsClient({
  students,
  documents: initialDocuments,
}: {
  students: StudentOption[];
  documents: DocumentItem[];
}) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replace state
  const [replacing, setReplacing] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceUploading, setReplaceUploading] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!selectedStudent || !title.trim() || !file) {
      setError("Select a student, enter a title, and choose a file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          title: title.trim(),
          type: docType,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Could not create document record.");
      }
      const { document: doc, uploadUrl } = await res.json() as { document: DocumentItem; uploadUrl: string };

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("File upload failed.");

      const student = students.find((s) => s.id === selectedStudent);
      setDocuments((prev) => [
        {
          ...doc,
          user: { name: student?.name ?? "", studentNumber: student?.studentNumber ?? null },
          uploadedBy: { name: "You" },
        },
        ...prev,
      ]);

      setTitle("");
      setFile(null);
      setDocType("OTHER");
      setSelectedStudent("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleReplace() {
    if (!replacing || !replaceFile) return;
    setReplaceUploading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/documents/${replacing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: replaceFile.name,
          mimeType: replaceFile.type || "application/octet-stream",
          fileSize: replaceFile.size,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Could not replace document.");
      }
      const { uploadUrl } = await res.json() as { uploadUrl: string };
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": replaceFile.type || "application/octet-stream" },
        body: replaceFile,
      });
      if (!uploadRes.ok) throw new Error("File upload to storage failed.");

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === replacing.id
            ? { ...d, fileName: replaceFile.name, fileSize: replaceFile.size, mimeType: replaceFile.type }
            : d,
        ),
      );
      setReplacing(null);
      setReplaceFile(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replace failed.");
    } finally {
      setReplaceUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const filteredDocs = filterStudent
    ? documents.filter((d) => d.user.name === filterStudent)
    : documents;

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload a Document</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => setError("")}
              className="float-right text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.studentNumber ? `(${s.studentNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National ID scan"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File (PDF, JPG, PNG, WEBP, DOC, DOCX - max 50 MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:cursor-pointer hover:file:bg-primary-dark"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={uploading || !selectedStudent || !title.trim() || !file}
          className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4" /> Upload Document</>
          )}
        </button>
      </div>

      {/* Replace file modal */}
      {replacing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Replace file</h3>
              <button
                type="button"
                onClick={() => { setReplacing(null); setReplaceFile(null); setError(""); }}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Replacing file for: <strong>{replacing.title}</strong> ({replacing.user.name})
            </p>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New file (PDF, JPG, PNG, WEBP, DOC, DOCX - max 50 MB)
              </label>
              <input
                ref={replaceInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setReplacing(null); setReplaceFile(null); setError(""); }}
                className="btn-outline text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReplace()}
                disabled={replaceUploading || !replaceFile}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {replaceUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Replace</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">Documents ({filteredDocs.length})</h2>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded by</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium">
                      {doc.user.name}
                      {doc.user.studentNumber && (
                        <span className="block text-xs text-gray-400">{doc.user.studentNumber}</span>
                      )}
                    </td>
                    <td>{doc.title}</td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[doc.type] ?? "badge-neutral"} text-xs`}>
                        {TYPE_LABELS[doc.type] ?? doc.type}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{formatSize(doc.fileSize)}</td>
                    <td className="text-sm text-gray-600">{doc.uploadedBy.name}</td>
                    <td className="text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <a
                          href={`/api/admin/documents/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portal-icon-button"
                          aria-label={`View ${doc.title}`}
                          title="View"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setReplacing(doc); setError(""); }}
                          className="portal-icon-button text-blue-500 hover:text-blue-700"
                          aria-label={`Replace file for ${doc.title}`}
                          title="Replace file"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(doc.id)}
                          className="portal-icon-button text-red-500 hover:text-red-700"
                          aria-label={`Delete ${doc.title}`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
