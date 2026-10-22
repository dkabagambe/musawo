"use client";

import { useEffect, useState } from "react";

type LeaveRequest = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: string;
  decisionNote: string | null;
  user: { id: string; name: string; email: string | null };
  decidedBy: { name: string } | null;
};

export default function LeaveDesk() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/leave", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load leave requests.");
    const result = (await response.json()) as { requests: LeaveRequest[] };
    setRequests(result.requests);
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load leave requests.",
      ),
    );
  }, []);

  async function decide(
    request: LeaveRequest,
    decision: "APPROVED" | "REJECTED",
  ) {
    setError("");
    const response = await fetch("/api/admin/leave", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: request.id,
        decision,
        note: notes[request.id],
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not update the request.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {requests.length === 0 ? (
        <p className="rounded border border-dashed border-border p-8 text-center text-sm text-gray-500">
          No leave requests have been submitted.
        </p>
      ) : (
        requests.map((request) => (
          <article
            key={request.id}
            className="rounded-md border border-border bg-white p-4"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{request.user.name}</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {request.user.email ?? "No email"} ·{" "}
                  {new Date(request.startsAt).toLocaleDateString()} to{" "}
                  {new Date(request.endsAt).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800">
                {request.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-700">{request.reason}</p>
            {request.status === "PENDING" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  className="input min-w-48 flex-1"
                  value={notes[request.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                  placeholder="Decision note"
                  aria-label={`Decision note for ${request.user.name}`}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void decide(request, "APPROVED")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void decide(request, "REJECTED")}
                >
                  Reject
                </button>
              </div>
            ) : request.decisionNote ? (
              <p className="mt-3 text-xs text-gray-500">
                Decision note: {request.decisionNote}
              </p>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
