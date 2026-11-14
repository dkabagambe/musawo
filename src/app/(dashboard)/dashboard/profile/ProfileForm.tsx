"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface Props {
  user: {
    name: string;
    email: string;
    studentNumber: string | null;
    registrationNumber: string | null;
    programme: string | null;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    district: string | null;
    countryCode: string;
    highestQualification: string | null;
    professionalTitle: string | null;
    emergencyContact: string | null;
    bio: string;
    themePreference: string;
  };
  /**
   * When true the Full name field is editable (for staff roles).
   * Students leave this false: their name is locked and set by the Admin.
   */
  allowNameEdit?: boolean;
}

interface NotificationPref {
  id: string;
  channel: string;
  type: string;
  enabled: boolean;
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

const LOCKED_HINT = "Contact the Admin to change.";

export default function ProfileForm({ user, allowNameEdit = false }: Props) {
  const { setTheme } = useTheme();

  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth ?? "",
    gender: user.gender ?? "",
    district: user.district ?? "",
    countryCode: user.countryCode,
    highestQualification: user.highestQualification ?? "",
    professionalTitle: user.professionalTitle ?? "",
    emergencyContact: user.emergencyContact ?? "",
    bio: user.bio,
    themePreference: user.themePreference,
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPref[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  // Fetch notification preferences on mount
  useEffect(() => {
    fetch("/api/profile/notifications")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { preferences: NotificationPref[] }) => {
        setNotifPrefs(data.preferences);
      })
      .catch(() => {
        setNotifPrefs([]);
      })
      .finally(() => {
        setNotifLoading(false);
      });
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Apply theme change immediately so the user sees it
      if (field === "themePreference") {
        setTheme(value || "system");
      }
      return next;
    });
  };

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
          ...(allowNameEdit ? { name: form.name.trim() } : {}),
          phone: form.phone.trim() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          district: form.district || undefined,
          countryCode: form.countryCode || "UG",
          highestQualification: form.highestQualification || undefined,
          professionalTitle: form.professionalTitle || undefined,
          emergencyContact: form.emergencyContact || undefined,
          bio: form.bio.trim() || undefined,
          themePreference: form.themePreference,
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

  async function toggleNotificationPref(id: string, enabled: boolean) {
    try {
      const res = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) {
        setNotifPrefs((prefs) =>
          prefs.map((p) => (p.id === id ? { ...p, enabled } : p)),
        );
      }
    } catch {
      // Silent fail
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

          {/* Full name - locked for students, editable for staff */}
          <div className="mb-4">
            <label htmlFor="name" className="label">Full name</label>
            {allowNameEdit ? (
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={set("name")}
                className="input"
                required
                minLength={2}
                maxLength={120}
              />
            ) : (
              <>
                <input id="name" type="text" disabled value={user.name}
                  className="input opacity-60 cursor-not-allowed" aria-describedby="name-hint" />
                <p id="name-hint" className="text-xs text-gray-400 mt-1">
                  {LOCKED_HINT}
                </p>
              </>
            )}
          </div>

          {/* Email - locked */}
          <div className="mb-4">
            <label htmlFor="email" className="label">Email address</label>
            <input id="email" type="email" disabled value={user.email}
              className="input opacity-60 cursor-not-allowed" aria-describedby="email-hint" />
            <p id="email-hint" className="text-xs text-gray-400 mt-1">
              {LOCKED_HINT}
            </p>
          </div>

          {/* Student number (registration number) - locked, set by Admin */}
          {user.studentNumber && (
            <div className="mb-4">
              <label className="label">Registration number</label>
              <input type="text" disabled value={user.studentNumber}
                className="input opacity-60 cursor-not-allowed font-mono"
                aria-describedby="sn-hint" />
              <p id="sn-hint" className="text-xs text-gray-400 mt-1">
                {LOCKED_HINT}
              </p>
            </div>
          )}

          {/* Programme - locked, set by Admin via enrolment */}
          <div className="mb-4">
            <label className="label">Programme</label>
            <input type="text" disabled
              value={user.programme ?? "Not enrolled yet"}
              className="input opacity-60 cursor-not-allowed"
              aria-describedby="prog-hint" />
            <p id="prog-hint" className="text-xs text-gray-400 mt-1">
              {LOCKED_HINT}
            </p>
          </div>

          {/* Professional registration number - locked, set by Admin */}
          {user.registrationNumber && (
            <div className="mb-4">
              <label className="label">
                Professional registration number
              </label>
              <input type="text" disabled value={user.registrationNumber}
                className="input opacity-60 cursor-not-allowed font-mono"
                aria-describedby="regnum-hint" />
              <p id="regnum-hint" className="text-xs text-gray-400 mt-1">
                {LOCKED_HINT}
              </p>
            </div>
          )}

          {/* Phone - editable */}
          <div className="mb-4">
            <label htmlFor="phone" className="label">Phone number</label>
            <input id="phone" type="tel" value={form.phone}
              onChange={set("phone")} className="input" placeholder="+256 700 000000" />
          </div>

          {/* Date of birth - editable */}
          <div className="mb-4">
            <label htmlFor="dob" className="label">Date of birth</label>
            <input id="dob" type="date" value={form.dateOfBirth}
              onChange={set("dateOfBirth")} className="input" />
          </div>

          {/* Gender - editable */}
          <div className="mb-4">
            <label htmlFor="gender" className="label">Gender</label>
            <select id="gender" value={form.gender} onChange={set("gender")} className="input">
              <option value="">- Select -</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* District / address - editable */}
          <div className="mb-4">
            <label htmlFor="district" className="label">District / Address</label>
            <select id="district" value={form.district} onChange={set("district")} className="input">
              <option value="">- Select district -</option>
              {UGANDAN_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Highest qualification - editable */}
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

          {/* Professional title - editable */}
          <div className="mb-4">
            <label htmlFor="profTitle" className="label">
              Professional title{" "}
              <span className="text-xs text-gray-400">(health professionals only)</span>
            </label>
            <input id="profTitle" type="text" value={form.professionalTitle}
              onChange={set("professionalTitle")} className="input"
              placeholder="e.g. Registered Nurse, Clinical Officer" />
          </div>

          {/* Emergency contact - editable */}
          <div className="mb-4">
            <label htmlFor="emergency" className="label">
              Emergency contact{" "}
              <span className="text-xs text-gray-400">(name and phone number)</span>
            </label>
            <input id="emergency" type="text" value={form.emergencyContact}
              onChange={set("emergencyContact")} className="input"
              placeholder="e.g. Jane Namutebi, +256 700 000000" />
          </div>

          {/* Bio - editable */}
          <div className="mb-4">
            <label htmlFor="bio" className="label">
              Short bio{" "}
              <span className="text-xs text-gray-400">(optional, max 500 characters)</span>
            </label>
            <textarea id="bio" value={form.bio}
              onChange={set("bio")} className="input min-h-[80px]"
              maxLength={500}
              placeholder="Tell us a bit about yourself..." />
            <p className="text-xs text-gray-400 mt-1">
              {form.bio.length}/500 characters
            </p>
          </div>

          {/* Theme preference - editable */}
          <div className="mb-6">
            <label htmlFor="theme" className="label">Theme preference</label>
            <select id="theme" value={form.themePreference}
              onChange={set("themePreference")} className="input">
              <option value="system">System default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* Notification preferences */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">Notification preferences</h2>
        {notifLoading ? (
          <p className="text-sm text-gray-400">Loading preferences...</p>
        ) : notifPrefs.length === 0 ? (
          <p className="text-sm text-gray-400">
            No notification preferences configured yet.
          </p>
        ) : (
          <div className="space-y-3">
            {notifPrefs.map((pref) => (
              <label
                key={pref.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  onChange={(e) =>
                    toggleNotificationPref(pref.id, e.target.checked)
                  }
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm capitalize">
                  {pref.type.replace(/_/g, " ")} ({pref.channel.replace(/_/g, " ").toLowerCase()})
                </span>
              </label>
            ))}
          </div>
        )}
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
