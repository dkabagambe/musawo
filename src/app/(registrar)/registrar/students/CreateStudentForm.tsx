"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Course { id: string; title: string; category: string; }
interface Intake { id: string; label: string; courseId: string; }

interface Props {
  courses: Course[];
  intakes: Intake[];
  sourceApplicationId?: string;
  prefill?: {
    name?: string; email?: string; phone?: string;
    category?: string; professionalTitle?: string;
    registrationNumber?: string; highestQualification?: string;
    courseId?: string; intakeId?: string;
  };
}

export default function CreateStudentForm({ courses, intakes, sourceApplicationId, prefill }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    name:                 prefill?.name ?? "",
    email:                prefill?.email ?? "",
    phone:                prefill?.phone ?? "",
    courseId:             prefill?.courseId ?? "",
    intakeId:             prefill?.intakeId ?? "",
    category:             prefill?.category ?? "OPEN",
    professionalTitle:    prefill?.professionalTitle ?? "",
    registrationNumber:   prefill?.registrationNumber ?? "",
    dateOfBirth:          "",
    gender:               "",
    district:             "",
    highestQualification: prefill?.highestQualification ?? "",
    emergencyContact:     "",
    idNumber:             "",
  });

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState<{ studentNumber: string; name: string } | null>(null);

  const isProfessional = form.category === "PROFESSIONAL";
  const filteredIntakes = intakes.filter((i) => !form.courseId || i.courseId === form.courseId);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError("Provide at least an email or phone number."); return; }
    if (isProfessional && !form.professionalTitle.trim()) { setError("Professional title is required for professional category."); return; }
    if (isProfessional && !form.registrationNumber.trim()) { setError("Professional registration number is required for professional category."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:                 form.name.trim(),
          email:                form.email.trim() || undefined,
          phone:                form.phone.trim() || undefined,
          courseId:             form.courseId || undefined,
          intakeId:             form.intakeId || undefined,
          category:             form.category,
          professionalTitle:    form.professionalTitle.trim() || undefined,
          registrationNumber:   form.registrationNumber.trim() || undefined,
          dateOfBirth:          form.dateOfBirth || undefined,
          gender:               form.gender || undefined,
          district:             form.district.trim() || undefined,
          highestQualification: form.highestQualification.trim() || undefined,
          emergencyContact:     form.emergencyContact.trim() || undefined,
          idNumber:             form.idNumber.trim() || undefined,
          sourceApplicationId:  sourceApplicationId,
        }),
      });
      const data = await res.json() as { student?: { studentNumber: string; name: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create account."); return; }
      setSuccess({ studentNumber: data.student!.studentNumber, name: data.student!.name });
      setTimeout(() => router.push("/registrar/students"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Account created</h2>
        <p className="text-gray-600 text-sm">
          <strong>{success.name}</strong> has been registered as <span className="font-mono font-bold text-primary">{success.studentNumber}</span>.
        </p>
        <p className="text-gray-500 text-sm">An invite email has been sent. They must accept it before they can log in.</p>
        <p className="text-xs text-gray-400">Redirecting to students list...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Personal details */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Personal details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Full name (as on ID) <span className="text-danger">*</span></label>
            <input id="name" type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="e.g. Sarah Auma" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" placeholder="sarah@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" placeholder="+256700000000" />
          </div>
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="gender">Gender</label>
            <select id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input">
              <option value="">Select...</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="district">District</label>
            <input id="district" type="text" value={form.district} onChange={(e) => set("district", e.target.value)} className="input" placeholder="e.g. Kampala" />
          </div>
          <div>
            <label className="label" htmlFor="qualification">Highest qualification</label>
            <input id="qualification" type="text" value={form.highestQualification} onChange={(e) => set("highestQualification", e.target.value)} className="input" placeholder="e.g. Uganda Certificate of Education" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="emergency">Emergency contact</label>
            <input id="emergency" type="text" value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className="input" placeholder="Name and phone number" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="id-number">ID number <span className="text-gray-400 font-normal">(optional, encrypted)</span></label>
            <input id="id-number" type="text" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} className="input" autoComplete="off" />
          </div>
        </div>
      </div>

      {/* Course and category */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Course and category</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="category">Category <span className="text-danger">*</span></label>
            <select id="category" value={form.category} onChange={(e) => set("category", e.target.value)} className="input" required>
              <option value="OPEN">Open to all</option>
              <option value="PROFESSIONAL">Professional (requires title and registration number)</option>
            </select>
          </div>
          {isProfessional && (
            <>
              <div>
                <label className="label" htmlFor="profTitle">Professional title <span className="text-danger">*</span></label>
                <input id="profTitle" type="text" required value={form.professionalTitle} onChange={(e) => set("professionalTitle", e.target.value)} className="input" placeholder="e.g. Registered Nurse" />
              </div>
              <div>
                <label className="label" htmlFor="regNo">Registration number <span className="text-danger">*</span></label>
                <input id="regNo" type="text" required value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} className="input" placeholder="e.g. NRN-2021-00123" />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="course">Course</label>
            <select id="course" value={form.courseId} onChange={(e) => { set("courseId", e.target.value); set("intakeId", ""); }} className="input">
              <option value="">Select course (optional)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="intake">Intake</label>
            <select id="intake" value={form.intakeId} onChange={(e) => set("intakeId", e.target.value)} className="input" disabled={!form.courseId}>
              <option value="">Select intake (optional)</option>
              {filteredIntakes.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-sm text-gray-600">
        A student number will be assigned automatically when this account is created.
        An invite email will be sent - the student must accept it before they can log in.
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating account..." : "Create student account and send invite"}
      </button>
    </form>
  );
}
