"use client";

import { useState } from "react";

interface Props {
  user: { name: string; email: string; phone: string };
}

export default function ProfileForm({ user }: Props) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setProfileError(d.error ?? "Failed to update profile.");
      } else {
        setProfileMsg("Profile updated successfully.");
      }
    } catch {
      setProfileError("Something went wrong.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    setPwError("");

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: pwForm.oldPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPwError(d.error ?? "Failed to change password.");
      } else {
        setPwMsg("Password changed successfully.");
        setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setPwError("Something went wrong.");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile details */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">Personal details</h2>
        {profileMsg && (
          <div role="status" className="bg-success/10 border border-success/20 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">
            {profileMsg}
          </div>
        )}
        {profileError && (
          <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {profileError}
          </div>
        )}
        <form onSubmit={handleProfileSave} noValidate>
          <div className="mb-4">
            <label htmlFor="name" className="label">Full name</label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              type="email"
              disabled
              value={user.email}
              className="input opacity-60 cursor-not-allowed"
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="text-xs text-gray-400 mt-1">
              Contact support to change your email.
            </p>
          </div>
          <div className="mb-6">
            <label htmlFor="phone" className="label">Phone number</label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="input"
              placeholder="+256 700 000000"
            />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section id="password" className="card">
        <h2 className="text-lg font-semibold mb-4">Change password</h2>
        {pwMsg && (
          <div role="status" className="bg-success/10 border border-success/20 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">
            {pwMsg}
          </div>
        )}
        {pwError && (
          <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {pwError}
          </div>
        )}
        <form onSubmit={handlePasswordChange} noValidate>
          <div className="mb-4">
            <label htmlFor="oldPassword" className="label">Current password</label>
            <input
              id="oldPassword"
              type="password"
              autoComplete="current-password"
              required
              value={pwForm.oldPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="label">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              className="input"
              placeholder="At least 8 characters"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="label">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="input"
            />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
