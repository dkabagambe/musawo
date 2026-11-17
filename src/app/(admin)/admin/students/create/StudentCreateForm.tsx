"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  courseCode: string;
}

interface Intake {
  id: string;
  label: string;
}

interface District {
  id: string;
  name: string;
}

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: Date | null;
  gender: string | null;
  district: string | null;
  highestQualification: string | null;
  professionalTitle: string | null;
  professionalRegistrationNumber: string | null;
  emergencyContact: string | null;
  course: { id: string; title: string } | null;
  intake: { id: string; label: string } | null;
}

interface Props {
  application: Application | null;
  courses: Course[];
  intakes: Intake[];
  districts: District[];
}

export default function StudentCreateForm({
  application,
  courses,
  intakes,
  districts,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    fullName: application?.fullName ?? "",
    email: application?.email ?? "",
    phone: application?.phone ?? "",
    courseId: application?.course?.id ?? "",
    intakeId: application?.intake?.id ?? "",
    dateOfBirth: application?.dateOfBirth
      ? new Date(application.dateOfBirth).toISOString().split("T")[0]
      : "",
    gender: application?.gender ?? "",
    district: application?.district ?? "",
    highestQualification: application?.highestQualification ?? "",
    professionalTitle: application?.professionalTitle ?? "",
    professionalRegistrationNumber: application?.professionalRegistrationNumber ?? "",
    emergencyContact: application?.emergencyContact ?? "",
    idNumber: "",
    category: "REGULAR",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          applicationId: application?.id,
        }),
      });

      const data = (await res.json()) as { error?: string; studentId?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to create student account.");
        return;
      }

      // Success - redirect to student detail or admissions page
      router.push(`/admin/students/${data.studentId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div className="space-y-4">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
          Personal Information
        </h2>

        <div>
          <label className="label">
            Full Name as on ID <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="input"
            required
            maxLength={200}
            placeholder="First Middle Last"
          />
          <p className="text-xs text-gray-400 mt-1">
            Exactly as it appears on the national ID or passport
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              required
              maxLength={200}
              placeholder="student@example.com"
            />
            <p className="text-xs text-gray-400 mt-1">Must be unique</p>
          </div>

          <div>
            <label className="label">
              Phone <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              required
              maxLength={20}
              placeholder="+256..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Date of Birth <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">
              Gender <span className="text-danger">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">District</label>
          <select
            name="district"
            value={formData.district}
            onChange={handleChange}
            className="input"
          >
            <option value="">Select district...</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Highest Qualification</label>
          <select
            name="highestQualification"
            value={formData.highestQualification}
            onChange={handleChange}
            className="input"
          >
            <option value="">Select...</option>
            <option value="None">None</option>
            <option value="Primary">Primary</option>
            <option value="O-Level">O-Level</option>
            <option value="A-Level">A-Level</option>
            <option value="Certificate">Certificate</option>
            <option value="Diploma">Diploma</option>
            <option value="Degree">Degree</option>
            <option value="Masters">Masters</option>
            <option value="PhD">PhD</option>
          </select>
        </div>

        <div>
          <label className="label">ID Number (optional, encrypted)</label>
          <input
            type="text"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleChange}
            className="input"
            maxLength={50}
            placeholder="National ID or passport number"
          />
          <p className="text-xs text-gray-400 mt-1">
            Stored encrypted. Admin cannot view after saving.
          </p>
        </div>

        <div>
          <label className="label">Emergency Contact</label>
          <input
            type="text"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleChange}
            className="input"
            maxLength={200}
            placeholder="Name and phone number"
          />
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
          Academic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Course <span className="text-danger">*</span>
            </label>
            <select
              name="courseId"
              value={formData.courseId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.courseCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Intake <span className="text-danger">*</span>
            </label>
            <select
              name="intakeId"
              value={formData.intakeId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select intake...</option>
              {intakes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">
            Category <span className="text-danger">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="REGULAR">Regular</option>
            <option value="PROFESSIONAL">Professional (with registration)</option>
            <option value="INTERNATIONAL">International</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Determines eligibility checks and fee structure
          </p>
        </div>

        {formData.category === "PROFESSIONAL" && (
          <>
            <div>
              <label className="label">Professional Title</label>
              <input
                type="text"
                name="professionalTitle"
                value={formData.professionalTitle}
                onChange={handleChange}
                className="input"
                maxLength={100}
                placeholder="e.g., Nurse, Midwife, Clinical Officer"
              />
            </div>

            <div>
              <label className="label">Professional Registration Number</label>
              <input
                type="text"
                name="professionalRegistrationNumber"
                value={formData.professionalRegistrationNumber}
                onChange={handleChange}
                className="input"
                maxLength={100}
                placeholder="Registration number with licensing body"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost px-4 py-2"
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary px-6 py-2" disabled={loading}>
          {loading ? "Creating..." : "Create Student Account"}
        </button>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 text-xs text-gray-600">
        <p className="font-semibold mb-1">What happens next:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>System generates unique registration number (per course and year)</li>
          <li>Record submitted to Principal for approval</li>
          <li>After approval, student receives email with set-password link</li>
          <li>Student becomes ACTIVE after setting password</li>
        </ol>
      </div>
    </form>
  );
}
