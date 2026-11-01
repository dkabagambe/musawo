"use client";

import { useState } from "react";

interface Policy {
  key: string;
  label: string;
  type: "bool" | "number" | "text";
  value: string;
  default: string;
}

interface Props {
  policies: Policy[];
}

export default function PoliciesEditor({ policies: initial }: Props) {
  const [policies, setPolicies] = useState(initial);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  function setValue(key: string, value: string) {
    setPolicies((ps) => ps.map((p) => (p.key === key ? { ...p, value } : p)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: policies.map((p) => ({ key: p.key, value: p.value })) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Save failed.");
      } else {
        setMsg("Settings saved.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card space-y-5">
      {policies.map((p) => (
        <div key={p.key}>
          <label className="label">{p.label}</label>
          {p.type === "bool" ? (
            <div className="flex gap-4">
              {["true", "false"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name={p.key}
                    value={opt}
                    checked={p.value === opt}
                    onChange={() => setValue(p.key, opt)}
                    className="accent-primary"
                  />
                  {opt === "true" ? "Enabled" : "Disabled"}
                </label>
              ))}
            </div>
          ) : (
            <input
              className="input"
              type={p.type === "number" ? "number" : "text"}
              value={p.value}
              onChange={(e) => setValue(p.key, e.target.value)}
              placeholder={p.default}
            />
          )}
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.key}</p>
        </div>
      ))}

      {msg && <p className="text-sm text-success font-medium">{msg}</p>}
      {err && <p className="text-sm text-danger font-medium">{err}</p>}

      <button type="submit" disabled={saving} className="btn-secondary text-sm">
        {saving ? "Saving..." : "Save all settings"}
      </button>
    </form>
  );
}
