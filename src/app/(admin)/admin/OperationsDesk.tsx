"use client";

import { useEffect, useState } from "react";

type Venue = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
};
type Booking = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: { name: string };
};
type Equipment = {
  id: string;
  name: string;
  needed: number;
  available: number;
  notes: string | null;
};
type Practical = {
  id: string;
  title: string;
  courseName: string | null;
  startsAt: string;
  endsAt: string;
  venue: { name: string };
  equipment: Equipment[];
};
type Notice = {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: string;
};
type Data = {
  venues: Venue[];
  bookings: Booking[];
  practicals: Practical[];
  notices: Notice[];
};
type Mode = "timetable" | "equipment" | "notices";

const EMPTY: Data = { venues: [], bookings: [], practicals: [], notices: [] };

export default function OperationsDesk({ mode }: { mode: Mode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/operations", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load operational records.");
    setData((await response.json()) as Data);
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load records.",
      ),
    );
  }, []);

  async function submit(action: string, fields: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...fields }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Could not save changes.");
      setSaved("Saved");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save changes.",
      );
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "input w-full";
  const labelClass = "label";
  const now = new Date();

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-teal-800">
          {saved}
        </p>
      )}

      {mode === "timetable" && (
        <>
          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold">Venues and rooms</h2>
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void submit("venue", {
                  name: form.get("name"),
                  location: form.get("location"),
                  capacity: Number(form.get("capacity")) || undefined,
                });
                event.currentTarget.reset();
              }}
            >
              <label className={labelClass}>
                Name
                <input
                  name="name"
                  className={fieldClass}
                  minLength={2}
                  required
                />
              </label>
              <label className={labelClass}>
                Location
                <input name="location" className={fieldClass} />
              </label>
              <label className={labelClass}>
                Capacity
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  className={fieldClass}
                />
              </label>
              <button className="btn-primary self-end" disabled={busy}>
                Add venue
              </button>
            </form>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.venues.map((venue) => (
                <li
                  key={venue.id}
                  className="rounded border border-border p-3 text-sm"
                >
                  <strong>{venue.name}</strong>
                  <span className="block text-gray-500">
                    {venue.location ?? "Location not set"}
                    {venue.capacity ? ` · ${venue.capacity} seats` : ""}
                  </span>
                </li>
              ))}
              {data.venues.length === 0 && (
                <li className="text-sm text-gray-500">
                  Add a room or skills lab to begin.
                </li>
              )}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold">Book a room</h2>
            <form
              className="grid gap-3 md:grid-cols-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const startsAt = new Date(
                  String(form.get("startsAt")),
                ).toISOString();
                const endsAt = new Date(
                  String(form.get("endsAt")),
                ).toISOString();
                void submit("booking", {
                  venueId: form.get("venueId"),
                  title: form.get("title"),
                  startsAt,
                  endsAt,
                });
                event.currentTarget.reset();
              }}
            >
              <label className={labelClass}>
                Venue
                <select name="venueId" className={fieldClass} required>
                  {data.venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Booking
                <input name="title" className={fieldClass} required />
              </label>
              <label className={labelClass}>
                Starts
                <input
                  name="startsAt"
                  type="datetime-local"
                  className={fieldClass}
                  min={new Date(now.getTime() - 60_000)
                    .toISOString()
                    .slice(0, 16)}
                  required
                />
              </label>
              <label className={labelClass}>
                Ends
                <input
                  name="endsAt"
                  type="datetime-local"
                  className={fieldClass}
                  required
                />
              </label>
              <button
                className="btn-primary self-end"
                disabled={busy || data.venues.length === 0}
              >
                Book room
              </button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold">Practical sessions</h2>
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const startsAt = new Date(
                  String(form.get("startsAt")),
                ).toISOString();
                const endsAt = new Date(
                  String(form.get("endsAt")),
                ).toISOString();
                const equipment = String(form.get("equipment") ?? "")
                  .split("\n")
                  .map((name) => name.trim())
                  .filter(Boolean)
                  .map((name) => ({ name, needed: 1, available: 0 }));
                void submit("practical", {
                  venueId: form.get("venueId"),
                  title: form.get("title"),
                  courseName: form.get("courseName"),
                  startsAt,
                  endsAt,
                  equipment,
                });
                event.currentTarget.reset();
              }}
            >
              <label className={labelClass}>
                Session
                <input name="title" className={fieldClass} required />
              </label>
              <label className={labelClass}>
                Course
                <input name="courseName" className={fieldClass} />
              </label>
              <label className={labelClass}>
                Venue
                <select name="venueId" className={fieldClass} required>
                  {data.venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Starts
                <input
                  name="startsAt"
                  type="datetime-local"
                  className={fieldClass}
                  required
                />
              </label>
              <label className={labelClass}>
                Ends
                <input
                  name="endsAt"
                  type="datetime-local"
                  className={fieldClass}
                  required
                />
              </label>
              <label className={labelClass}>
                Equipment, one item per line
                <textarea name="equipment" className={fieldClass} rows={2} />
              </label>
              <button
                className="btn-primary self-end"
                disabled={busy || data.venues.length === 0}
              >
                Schedule practical
              </button>
            </form>
          </section>

          <Schedule bookings={data.bookings} practicals={data.practicals} />
        </>
      )}

      {mode === "equipment" && (
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold">
            Skills lab equipment checklist
          </h2>
          {data.practicals.map((practical) => (
            <div key={practical.id} className="mb-5 last:mb-0">
              <h3 className="text-sm font-semibold">
                {practical.title}{" "}
                <span className="font-normal text-gray-500">
                  · {practical.venue.name} ·{" "}
                  {new Date(practical.startsAt).toLocaleString()}
                </span>
              </h3>
              {practical.equipment.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  No equipment items listed.
                </p>
              ) : (
                practical.equipment.map((item) => (
                  <form
                    key={item.id}
                    className="mt-2 flex flex-wrap items-center gap-2 rounded border border-border p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void submit("equipment", {
                        itemId: item.id,
                        available: Number(form.get("available")),
                        notes: form.get("notes"),
                      });
                    }}
                  >
                    <span className="min-w-40 flex-1 text-sm">
                      {item.name}{" "}
                      <span className="text-gray-500">
                        needed {item.needed}
                      </span>
                    </span>
                    <label className="text-xs text-gray-600">
                      Available
                      <input
                        name="available"
                        type="number"
                        min="0"
                        defaultValue={item.available}
                        className="input ml-2 w-20"
                      />
                    </label>
                    <input
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      placeholder="Notes"
                      className="input min-w-40 flex-1"
                    />
                    <button className="btn-secondary text-sm" disabled={busy}>
                      Update
                    </button>
                  </form>
                ))
              )}
            </div>
          ))}
          {data.practicals.length === 0 && (
            <p className="text-sm text-gray-500">
              Schedule a practical session to start its equipment list.
            </p>
          )}
        </section>
      )}

      {mode === "notices" && (
        <>
          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold">
              Send an operational notice
            </h2>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void submit("notice", {
                  title: form.get("title"),
                  body: form.get("body"),
                  audience: form.get("audience"),
                  channel: form.get("channel"),
                });
                event.currentTarget.reset();
              }}
            >
              <label className={labelClass}>
                Subject
                <input name="title" className={fieldClass} required />
              </label>
              <label className={labelClass}>
                Audience
                <select name="audience" className={fieldClass}>
                  <option value="ALL">Students and staff</option>
                  <option value="STUDENTS">Students</option>
                  <option value="STAFF">Staff</option>
                </select>
              </label>
              <label className={labelClass}>
                Delivery
                <select name="channel" className={fieldClass}>
                  <option value="IN_APP">In-platform notification</option>
                  <option value="EMAIL">Notification and email</option>
                </select>
              </label>
              <label className={labelClass}>
                Notice
                <textarea
                  name="body"
                  className={fieldClass}
                  rows={3}
                  required
                />
              </label>
              <button
                className="btn-primary md:col-span-2 md:justify-self-end"
                disabled={busy}
              >
                Send notice
              </button>
            </form>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Sent notices</h2>
            {data.notices.length === 0 ? (
              <p className="text-sm text-gray-500">No notices sent yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.notices.map((notice) => (
                  <li key={notice.id} className="py-3">
                    <p className="text-sm font-medium">{notice.title}</p>
                    <p className="text-xs text-gray-500">
                      {notice.audience} ·{" "}
                      {new Date(notice.sentAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{notice.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Schedule({
  bookings,
  practicals,
}: {
  bookings: Booking[];
  practicals: Practical[];
}) {
  const rows = [
    ...bookings.map((entry) => ({
      id: entry.id,
      title: entry.title,
      venue: entry.venue.name,
      startsAt: entry.startsAt,
      type: "Booking",
    })),
    ...practicals.map((entry) => ({
      id: entry.id,
      title: entry.title,
      venue: entry.venue.name,
      startsAt: entry.startsAt,
      type: "Practical",
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-base font-semibold">Bookings and sessions</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming room bookings.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li
              key={`${row.type}-${row.id}`}
              className="flex flex-wrap justify-between gap-2 py-3 text-sm"
            >
              <span className="font-medium">
                {row.title}
                <span className="ml-2 font-normal text-gray-500">
                  {row.type} · {row.venue}
                </span>
              </span>
              <time className="text-gray-600">
                {new Date(row.startsAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
