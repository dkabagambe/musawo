"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EquipmentItem {
  name: string;
  needed: number;
  available: number;
  notes: string | null;
}

interface Practical {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  equipment: EquipmentItem[];
}

interface Props {
  practicals: Practical[];
}

export default function EquipmentRequestForm({ practicals }: Props) {
  const router = useRouter();
  const [selectedPractical, setSelectedPractical] = useState("");
  const [customItems, setCustomItems] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const practical = practicals.find((p) => p.id === selectedPractical);
  const shortItems = practical?.equipment
    .filter((e) => e.available < e.needed)
    .map((e) => `${e.name}: need ${e.needed}, have ${e.available}`)
    .join("; ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Describe what is needed."); return; }
    setLoading(true);
    setError("");

    const fullReason = [
      practical ? `Session: ${practical.title} (${new Date(practical.startsAt).toLocaleString("en-UG")})` : "",
      shortItems ? `Shortages: ${shortItems}` : "",
      customItems.trim() ? `Additional items: ${customItems.trim()}` : "",
      `Notes: ${reason.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EQUIPMENT_REQUEST",
          reason: fullReason,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to submit request.");
        return;
      }
      setSuccess(true);
      setReason("");
      setCustomItems("");
      setSelectedPractical("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-4 text-center">
        <p className="text-green-800 font-semibold">Request submitted for Principal approval.</p>
        <button
          className="text-sm text-accent underline mt-2"
          onClick={() => setSuccess(false)}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {practicals.length > 0 && (
        <div>
          <label className="label">Practical session (optional)</label>
          <select
            className="input w-full"
            value={selectedPractical}
            onChange={(e) => setSelectedPractical(e.target.value)}
          >
            <option value="">-- Select a session --</option>
            {practicals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} - {p.venue} ({new Date(p.startsAt).toLocaleDateString("en-UG")})
              </option>
            ))}
          </select>
          {shortItems && (
            <p className="text-xs text-danger mt-1">
              Shortages: {shortItems}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label">Additional items needed (one per line)</label>
        <textarea
          rows={3}
          className="input w-full resize-none"
          placeholder="e.g. Disposable gloves x 50&#10;Blood pressure cuffs x 10"
          value={customItems}
          onChange={(e) => setCustomItems(e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          Request details <span className="text-danger">*</span>
        </label>
        <textarea
          rows={3}
          required
          className="input w-full resize-none"
          placeholder="Describe what is needed and why, urgency, and any alternatives..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Submitting..." : "Submit for Principal approval"}
      </button>
    </form>
  );
}
