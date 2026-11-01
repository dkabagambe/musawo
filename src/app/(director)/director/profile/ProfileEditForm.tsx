"use client";

import { useState } from "react";

interface Props {
  userId: string;
  initialName: string;
  initialPhone: string;
  email: string;
  totpEnabled: boolean;
}

export default function ProfileEditForm({ initialName, initialPhone, email, totpEnabled }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr(""); setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Save failed."); }
      else { setMsg("Profile updated."); }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePwChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(""); setPwErr("");
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwErr("Passwords do not match."); return; }
    if (pwForm.newPassword.length < 8) { setPwErr("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error ?? "Password change failed."); }
      else { setPwMsg("Password changed."); setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" }); }
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
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email <span className="font-normal text-gray-400">(read-only)</span></label>
          <input className="input opacity-60" value={email} disabled readOnly />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256..." />
        </div>
        {msg && <p className="text-sm text-success font-medium">{msg}</p>}
        {err && <p className="text-sm text-danger font-medium">{err}</p>}
        <button type="submit" disabled={saving} className="btn-secondary text-sm">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={handlePwChange} id="password" className="space-y-4 pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Change Password</h2>
        <div>
          <label className="label">Current password</label>
          <input
            className="input" type="password" autoComplete="current-password"
            value={pwForm.oldPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            className="input" type="password" autoComplete="new-password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            required minLength={8}
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            className="input" type="password" autoComplete="new-password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            required minLength={8}
          />
        </div>
        {pwMsg && <p className="text-sm text-success font-medium">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-danger font-medium">{pwErr}</p>}
        <button type="submit" disabled={pwSaving} className="btn-secondary text-sm">
          {pwSaving ? "Updating..." : "Change password"}
        </button>
      </form>

      {/* 2FA status */}
      <div className="pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Two-Factor Authentication</h2>
        {totpEnabled ? (
          <p className="text-sm text-success font-medium">2FA is enabled on your account.</p>
        ) : (
          <p className="text-sm text-warning font-medium">2FA is not enabled. Contact IT Admin to set it up.</p>
        )}
      </div>
    </div>
  );
}
