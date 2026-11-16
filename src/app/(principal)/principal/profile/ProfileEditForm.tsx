"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";

interface Props {
  userId: string;
  currentName: string;
  initialProfessionalTitle: string;
  initialPhone: string;
  email: string;
  totpEnabled: boolean;
  initialTheme: string;
}

export default function ProfileEditForm({
  currentName,
  initialProfessionalTitle,
  initialPhone,
  email,
  totpEnabled,
  initialTheme,
}: Props) {
  const [title, setTitle] = useState(initialProfessionalTitle);
  const [phone, setPhone] = useState(initialPhone);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState(initialTheme);
  const [themeSaving, setThemeSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalTitle: title.trim() || null,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Save failed.");
      } else {
        setMsg("Profile updated.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTheme(newTheme: string) {
    setTheme(newTheme);
    setThemeSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePreference: newTheme }),
      });
    } catch {
      /* non-fatal */
    } finally {
      setThemeSaving(false);
    }
  }

  async function handlePwChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwErr("Passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPwErr(data.error ?? "Password change failed.");
      } else {
        setPwMsg("Password changed.");
        setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setPwErr("Network error.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Basic Information</h2>

        <div>
          <label className="label">
            Full name <span className="font-normal text-gray-400">(read-only, contact Admin to change)</span>
          </label>
          <input className="input opacity-60" value={currentName} disabled readOnly />
        </div>

        <div>
          <label className="label">
            Title <span className="font-normal text-gray-400">(Dr., Prof., Mr., Nurse, etc.)</span>
          </label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={20}
            placeholder="Dr."
          />
          <p className="text-xs text-gray-400 mt-1">Displayed separately from your name. Used for greetings and avatars show initials only.</p>
        </div>

        <div>
          <label className="label">
            Email <span className="font-normal text-gray-400">(read-only)</span>
          </label>
          <input className="input opacity-60" value={email} disabled readOnly />
        </div>

        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+256..."
            maxLength={20}
          />
        </div>

        {msg && <p className="text-sm text-success font-medium">{msg}</p>}
        {err && <p className="text-sm text-danger font-medium">{err}</p>}
        <button type="submit" disabled={saving} className="btn-secondary text-sm">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Theme */}
      <div className="pt-6 border-t border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Theme</h2>
        <div className="flex gap-2 flex-wrap">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={themeSaving}
              onClick={() => handleTheme(t)}
              className={`btn-secondary text-sm capitalize ${theme === t ? "ring-2 ring-primary" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Preference saved automatically.</p>
      </div>

      {/* Password */}
      <form onSubmit={handlePwChange} id="password" className="space-y-4 pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Change Password</h2>
        <div>
          <label className="label">Current password</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={pwForm.oldPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            required
            minLength={8}
          />
        </div>
        {pwMsg && <p className="text-sm text-success font-medium">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-danger font-medium">{pwErr}</p>}
        <button type="submit" disabled={pwSaving} className="btn-secondary text-sm">
          {pwSaving ? "Updating..." : "Change password"}
        </button>
      </form>

      {/* Two-factor authentication */}
      <div className="pt-6 border-t border-border space-y-3" id="2fa">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Two-Factor Authentication</h2>
        {totpEnabled ? (
          <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-xl px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-success">2FA is active</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your account is protected with a time-based authenticator app.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-xl px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-warning">2FA is not enabled</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Required for Principal accounts in production. Set it up now.
              </p>
              <Link
                href="/2fa-setup"
                className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2 no-underline hover:underline"
              >
                Set up two-factor authentication <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Active sessions */}
      <div className="pt-6 border-t border-border space-y-3" id="sessions">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Active Sessions</h2>
        <p className="text-xs text-gray-400">Recent login sessions from the last 30 days.</p>
        <div className="text-sm text-gray-500">
          <p>Session management coming soon. Contact IT Admin to revoke sessions if needed.</p>
        </div>
      </div>
    </div>
  );
}
