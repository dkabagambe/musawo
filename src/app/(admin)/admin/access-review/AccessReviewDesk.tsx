"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  lastAccessReviewAt: string | null;
};
type Review = {
  id: string;
  quarter: string;
  notes: string | null;
  completedAt: string;
};

function currentQuarter() {
  const date = new Date();
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export default function AccessReviewDesk() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [quarter, setQuarter] = useState(currentQuarter());
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/access-review", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load staff access records.");
    const result = (await response.json()) as {
      staff: Staff[];
      reviews: Review[];
    };
    setStaff(result.staff);
    setReviews(result.reviews);
    setSelected(result.staff.map((entry) => entry.id));
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Could not load records.",
      ),
    );
  }, []);

  async function completeReview(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/access-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quarter, notes, userIds: selected }),
      });
      const result = (await response.json()) as {
        error?: string;
        accountsReviewed?: number;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Could not complete review.");
      setMessage(
        `Review completed for ${result.accountsReviewed ?? 0} accounts.`,
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not complete review.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {message && (
        <p
          role="status"
          className="rounded border border-border bg-white p-3 text-sm"
        >
          {message}
        </p>
      )}
      <form className="card space-y-4 p-5" onSubmit={completeReview}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="label" htmlFor="review-quarter">
              Review period
            </label>
            <input
              id="review-quarter"
              className="input"
              pattern="\d{4}-Q[1-4]"
              value={quarter}
              onChange={(event) => setQuarter(event.target.value)}
              required
            />
          </div>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => setSelected(staff.map((entry) => entry.id))}
          >
            Select all
          </button>
        </div>
        <div className="max-h-96 overflow-auto rounded border border-border">
          {staff.map((entry) => (
            <label
              key={entry.id}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selected.includes(entry.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, entry.id]
                      : current.filter((id) => id !== entry.id),
                  )
                }
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {entry.name}
                <span className="ml-2 font-normal text-gray-500">
                  {entry.email ?? "No email"}
                </span>
              </span>
              <span className="text-xs text-gray-500">
                {entry.lastAccessReviewAt
                  ? `Reviewed ${new Date(entry.lastAccessReviewAt).toLocaleDateString()}`
                  : "Not yet reviewed"}
              </span>
            </label>
          ))}
          {staff.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              No staff accounts available to review.
            </p>
          )}
        </div>
        <label className="label" htmlFor="review-notes">
          Review notes
          <textarea
            id="review-notes"
            className="input w-full"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          className="btn-primary"
          disabled={busy || selected.length === 0}
        >
          {busy ? "Saving..." : "Complete access review"}
        </button>
      </form>
      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold">Recent reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No completed reviews yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((review) => (
              <li key={review.id} className="py-3">
                <p className="text-sm font-medium">{review.quarter}</p>
                <p className="text-xs text-gray-500">
                  Completed {new Date(review.completedAt).toLocaleString()}
                </p>
                {review.notes && (
                  <p className="mt-1 text-sm text-gray-700">{review.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
