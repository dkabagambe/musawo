"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Programme {
  id: string;
  title: string;
  courseCode: string | null;
  description: string;
  shortDescription: string | null;
  category: string;
  fullFeeUgx: number | null;
  instalmentCount: number;
  durationMonths: number | null;
  eligibilityText: string | null;
  targetAudience: string | null;
  intakeLabel: string | null;
  status: string;
}

interface Props {
  programme?: Programme | null;
  departments: Array<{ id: string; name: string }>;
  onClose: () => void;
}

export default function ProgrammeFormDialog({ programme, departments, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: programme?.title ?? "",
    courseCode: programme?.courseCode ?? "",
    shortDescription: programme?.shortDescription ?? "",
    description: programme?.description ?? "",
    category: programme?.category ?? "OPEN",
    fullFeeUgx: programme?.fullFeeUgx ?? null,
    instalmentCount: programme?.instalmentCount ?? 1,
    durationMonths: programme?.durationMonths ?? 3,
    eligibilityText: programme?.eligibilityText ?? "",
    targetAudience: programme?.targetAudience ?? "",
    intakeLabel: programme?.intakeLabel ?? "",
    departmentIds: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Submit approval request for programme change
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ACADEMIC_PROGRAMME_CHANGE",
          reason: programme
            ? `Update programme: ${formData.title} (${formData.courseCode})\n\nChanges:\n${JSON.stringify(formData, null, 2)}`
            : `Create new programme: ${formData.title} (${formData.courseCode})\n\n${formData.description.substring(0, 200)}...`,
          courseId: programme?.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit approval request");
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {programme ? "Edit Programme" : "Create Programme"}
          </h2>
          <button onClick={onClose} className="btn-ghost text-lg">
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Programme Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                placeholder="Certificate in Medical Home Care"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.courseCode}
                onChange={(e) =>
                  setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })
                }
                className="input w-full font-mono"
                placeholder="MHC"
                maxLength={4}
              />
              <p className="text-xs text-gray-400 mt-1">Max 4 uppercase letters</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              className="input w-full"
              placeholder="Brief one-sentence summary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Full Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="Detailed programme description including modules, delivery method, etc."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input w-full"
              >
                <option value="OPEN">Open to all</option>
                <option value="PROFESSIONAL">Professionals only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (months)</label>
              <input
                type="number"
                min={1}
                max={36}
                value={formData.durationMonths ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationMonths: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="input w-full"
                placeholder="3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              className="input w-full"
              placeholder="Nurses, midwives, clinical officers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Eligibility Requirements</label>
            <textarea
              rows={3}
              value={formData.eligibilityText}
              onChange={(e) => setFormData({ ...formData, eligibilityText: e.target.value })}
              className="input w-full"
              placeholder="Applicants must hold..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Fee (UGX)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={formData.fullFeeUgx ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fullFeeUgx: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="input w-full"
                placeholder="1800000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Instalment Count</label>
              <input
                type="number"
                min={1}
                max={6}
                value={formData.instalmentCount}
                onChange={(e) =>
                  setFormData({ ...formData, instalmentCount: parseInt(e.target.value) })
                }
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Intake Label</label>
            <input
              type="text"
              value={formData.intakeLabel}
              onChange={(e) => setFormData({ ...formData, intakeLabel: e.target.value })}
              className="input w-full"
              placeholder="November 2026"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded text-sm">
            <p className="font-medium text-amber-900 mb-1">⚠ Director Approval Required</p>
            <p className="text-amber-700">
              {programme ? "Modifications" : "New programmes"} require Director approval before
              taking effect. This form will create an approval request.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
