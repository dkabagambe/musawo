"use client";

import { useState } from "react";

interface Group {
  label: string;
  prefix: string;
  keys: string[];
}

interface Props {
  groups: Group[];
  currentSettings: Record<string, string>;
}

const SENSITIVE_KEYS = [
  "Key",
  "Secret",
  "Token",
  "Password",
  "accessToken",
];

function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()));
}

export default function AdminSettingsForm({ groups, currentSettings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(currentSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveSetting(key: string) {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: values[key] ?? "" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
          {error}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="card">
          <h2 className="font-semibold text-lg mb-4">{group.label}</h2>
          <div className="space-y-4">
            {group.keys.map((key) => (
              <div key={key}>
                <label htmlFor={key} className="label">
                  {key.replace(group.prefix, "").replace(/([A-Z])/g, " $1").trim()}
                </label>
                <div className="flex gap-2">
                  <input
                    id={key}
                    type={isSensitive(key) ? "password" : "text"}
                    className="input flex-1"
                    value={values[key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [key]: e.target.value }))
                    }
                    placeholder={`${key}`}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn-primary text-sm px-4"
                    onClick={() => saveSetting(key)}
                    disabled={saving === key}
                  >
                    {saving === key ? "…" : saved === key ? "✓" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
