"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowRight, MessageSquare, RotateCcw } from "lucide-react";

interface Props {
  requestId: string;
  requestType: string;
  actions: string[];
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; variant: string; needsNote: boolean }> = {
  APPROVE: {
    label: "Approve",
    icon: CheckCircle,
    variant: "btn-success",
    needsNote: false,
  },
  REJECT: {
    label: "Reject",
    icon: XCircle,
    variant: "btn-danger",
    needsNote: true,
  },
  FORWARD: {
    label: "Forward to Director",
    icon: ArrowRight,
    variant: "btn-primary",
    needsNote: false,
  },
  REQUEST_INFO: {
    label: "Request more information",
    icon: MessageSquare,
    variant: "btn-outline",
    needsNote: true,
  },
  SEND_BACK: {
    label: "Send back",
    icon: RotateCcw,
    variant: "btn-outline",
    needsNote: true,
  },
  RETURN: {
    label: "Return to Admin",
    icon: RotateCcw,
    variant: "btn-outline",
    needsNote: true,
  },
  CONFIRM: {
    label: "Confirm",
    icon: CheckCircle,
    variant: "btn-success",
    needsNote: false,
  },
};

export default function ApprovalDecisionForm({ requestId, requestType, actions }: Props) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = selectedAction ? ACTION_CONFIG[selectedAction] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAction) return;
    if (config?.needsNote && !note.trim()) {
      setError("A note is required for this action");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/principal/approvals/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision");
      }

      // Success - redirect back to inbox
      router.push("/principal/approvals-inbox");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Action selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Choose action</label>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const cfg = ACTION_CONFIG[action];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={action}
                type="button"
                onClick={() => setSelectedAction(action)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  selectedAction === action
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-border hover:border-primary hover:text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note input (shown when action is selected) */}
      {selectedAction && (
        <>
          <div>
            <label htmlFor="note" className="block text-sm font-semibold mb-1">
              {config?.needsNote ? "Note (required)" : "Note (optional)"}
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required={config?.needsNote}
              rows={4}
              className="textarea w-full"
              placeholder={
                selectedAction === "APPROVE"
                  ? "Optional: Add any remarks or conditions..."
                  : selectedAction === "REJECT"
                  ? "Explain why this request is being rejected..."
                  : selectedAction === "FORWARD"
                  ? "Optional: Add context for the Director..."
                  : selectedAction === "REQUEST_INFO"
                  ? "Explain what additional information is needed..."
                  : "Add your comment..."
              }
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`btn ${config?.variant} flex-1 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? "Processing..." : `Confirm: ${config?.label}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAction(null);
                setNote("");
                setError(null);
              }}
              disabled={loading}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </form>
  );
}
