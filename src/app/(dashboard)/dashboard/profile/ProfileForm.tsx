"use client";

import { useState } from "react";

interface Props {
  user: {
    name: string;
    email: string;
    studentNumber: string | null;
    registrationNumber: string | null;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    district: string | null;
    countryCode: string;
    highestQualification: string | null;
    professionalTitle: string | null;
    emergencyContact: string | null;
  };
}

const UGANDAN_DISTRICTS = [
  "Kampala", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Lira",
  "Masaka", "Arua", "Fort Portal", "Mbale", "Kabale", "Soroti", "Tororo",
  "Hoima", "Kasese", "Entebbe", "Other",
];

const QUALIFICATIONS = [
  "O-Level (UCE)", "A-Level (UACE)", "Certificate", "Diploma",
  "Bachelor's Degree", "Master's Degree",
  "Doctorate (PhD)", "Professional Certificate", "Other",
];

export default function ProfileForm({ user }: Props) {
  const [form, setForm] = useState({
    phone: user.phone,
    dateOfBirth: user.dateOfBirth ?? "",
    gender: user.gender ?? "",
    district: user.district ?? "",
    countryCode: user.countryCode,
    highestQualification: user.highestQualification ?? "",
    professionalTitle: user.professionalTitle ?? "",
    emergencyContact: user.emergencyContact ?? "",
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          district: form.district || undefined,
          countryCode: form.countryCode || "UG",
          highestQualification: form.highestQualification || undefined,
          professionalTitle: form.professionalTitle || undefined,
          emergencyContact: form.emergencyContact || undefined,
        }),
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
      {/* Personal details */}
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

          {/* Full name — locked, set by Admin */}
          <div className="mb-4">
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" type="text" disabled value={user.name}
              className="input opacity-60 cursor-not-allowed" aria-describedby="name-hint" />
            <p id="name-hint" className="text-xs text-gray-400 mt-1">
              Contact the Registrar to correct your name.
            </p>
          </div>

          {/* Email — locked */}
          <div className="mb-4">
            <label htmlFor="email" className="label">Email address</label>
            <input id="email" type="email" disabled value={user.email}
              className="input opacity-60 cursor-not-allowed" aria-describedby="email-hint" />
            <p id="email-hint" className="text-xs text-gray-400 mt-1">
              Contact support to change your email.
            </p>
          </div>

          {/* Student number — locked, read-only display */}
          {user.studentNumber && (
            <div className="mb-4">
              <label className="label">Student number</label>
              <input type="text" disabled value={user.studentNumber}
                className="input opacity-60 cursor-not-allowed font-mono" />
            </div>
          )}

          {/* Professional registration number — locked, set by Admin */}
          {user.registrationNumber && (
            <div className="mb-4">
              <label className="label">
                Professional registration number
              </label>
              <input type="text" disabled value={user.registrationNumber}
                className="input opacity-60 cursor-not-allowed font-mono"
                aria-describedby="regnum-hint" />
              <p id="regnum-hint" className="text-xs text-gray-400 mt-1">
                Contact the Registrar to update your registration number.
              </p>
            </div>
          )}

          {/* Phone — editable */}
          <div className="mb-4">
            <label htmlFor="phone" className="label">Phone number</label>
            <input id="phone" type="tel" value={form.phone}
              onChange={set("phone")} className="input" placeholder="+256 700 000000" />
          </div>

          {/* Date of birth — editable */}
          <div className="mb-4">
            <label htmlFor="dob" className="label">Date of birth</label>
            <input id="dob" type="date" value={form.dateOfBirth}
              onChange={set("dateOfBirth")} className="input" />
          </div>

          {/* Gender — editable */}
          <div className="mb-4">
            <label htmlFor="gender" className="label">Gender</label>
            <select id="gender" value={form.gender} onChange={set("gender")} className="input">
              <option value="">- Select -</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* District — editable */}
          <div className="mb-4">
            <label htmlFor="district" className="label">District (Uganda)</label>
            <select id="district" value={form.district} onChange={set("district")} className="input">
              <option value="">- Select district -</option>
              {UGANDAN_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Highest qualification — editable */}
          <div className="mb-4">
            <label htmlFor="qualification" className="label">Highest qualification</label>
            <select id="qualification" value={form.highestQualification}
              onChange={set("highestQualification")} className="input">
              <option value="">- Select -</option>
              {QUALIFICATIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Professional title — editable */}
          <div className="mb-4">
            <label htmlFor="profTitle" className="label">
              Professional title{" "}
              <span className="text-xs text-gray-400">(health professionals only)</span>
            </label>
            <input id="profTitle" type="text" value={form.professionalTitle}
              onChange={set("professionalTitle")} className="input"
              placeholder="e.g. Registered Nurse, Clinical Officer" />
          </div>

          {/* Emergency contact — editable */}
          <div className="mb-6">
            <label htmlFor="emergency" className="label">
              Emergency contact{" "}
              <span className="text-xs text-gray-400">(name and phone number)</span>
            </label>
            <input id="emergency" type="text" value={form.emergencyContact}
              onChange={set("emergencyContact")} className="input"
              placeholder="e.g. Jane Namutebi - +256 700 000000" />
          </div>

          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? "Saving..." : "Save changes"}
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
            <input id="oldPassword" type="password" autoComplete="current-password" required
              value={pwForm.oldPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
              className="input" />
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="label">New password</label>
            <input id="newPassword" type="password" autoComplete="new-password" required
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              className="input" />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="label">Confirm new password</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" required
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="input" />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? "Changing..." : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
