"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, CheckCircle2, ChevronDown } from "lucide-react";

interface Course {
  id: string;
  slug: string;
  title: string;
  category: string;
  durationMonths: number | null;
}

interface Props {
  courses: Course[];
  intakeLabel: string;
  preselectedSlug?: string;
}

const HOW_HEARD_OPTIONS = [
  "WhatsApp",
  "Facebook",
  "Instagram or TikTok",
  "Friend or family",
  "Community health worker",
  "Hospital or clinic",
  "Radio",
  "Other",
];

const QUALIFICATIONS = [
  "PLE (Primary Leaving Examination)",
  "O Level (S.4)",
  "A Level (S.6)",
  "Certificate",
  "Diploma",
  "Degree",
  "Postgraduate",
  "Other",
];

export default function ApplyForm({ courses, intakeLabel, preselectedSlug }: Props) {
  const router = useRouter();

  const initialCourse = courses.find((c) => c.slug === preselectedSlug) ?? null;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    courseId: initialCourse?.id ?? "",
    category: initialCourse
      ? initialCourse.category === "PROFESSIONAL" ? "PROFESSIONAL" : "OPEN"
      : "",
    professionalTitle: "",
    registrationNumber: "",
    highestQualification: "",
    howHeard: "",
    notes: "",
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedCourse = courses.find((c) => c.id === form.courseId) ?? null;
  const isProfessional = form.category === "PROFESSIONAL";

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const course = courses.find((c) => c.id === e.target.value);
    setForm((f) => ({
      ...f,
      courseId: e.target.value,
      category: course
        ? course.category === "PROFESSIONAL" ? "PROFESSIONAL" : "OPEN"
        : "",
    }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim()) { setError("Please enter your email address."); return; }
    if (!form.phone.trim()) { setError("Please enter your phone number."); return; }
    if (!form.courseId) { setError("Please select a course."); return; }
    if (!form.category) { setError("Please select a course first -- category will be set automatically."); return; }
    if (isProfessional && !form.professionalTitle.trim()) {
      setError("Professional courses require your professional title."); return;
    }
    if (isProfessional && !form.registrationNumber.trim()) {
      setError("Professional courses require your registration number."); return;
    }
    if (!form.highestQualification) { setError("Please select your highest qualification."); return; }
    if (!form.consent) { setError("Please tick the consent box to continue."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName:             form.fullName.trim(),
          email:                form.email.trim(),
          phone:                form.phone.trim(),
          courseId:             form.courseId,
          intakeLabel,
          category:             form.category,
          professionalTitle:    form.professionalTitle.trim() || undefined,
          registrationNumber:   form.registrationNumber.trim() || undefined,
          highestQualification: form.highestQualification,
          howHeard:             form.howHeard || undefined,
          notes:                form.notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Application submitted!</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          Thank you. We have sent a confirmation to <strong>{form.email}</strong>.
          The Academic Registrar will review your application and contact you within
          3 to 5 working days.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          If you do not receive an email within 24 hours, check your spam folder or
          contact{" "}
          <a href="mailto:admissions@mtc.ac.ug" className="text-primary no-underline hover:underline">
            admissions@mtc.ac.ug
          </a>.
        </p>
        <button
          type="button"
          onClick={() => router.push("/courses")}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          Browse more courses
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* Error banner */}
      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Personal details */}
      <fieldset className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <legend className="font-bold text-primary text-sm px-1">Personal details</legend>

        <div>
          <label htmlFor="fullName" className="label">
            Full name (as on your ID) <span className="text-danger">*</span>
          </label>
          <input
            id="fullName" name="fullName" type="text" autoComplete="name" required
            value={form.fullName} onChange={handleChange}
            className="input h-11" placeholder="e.g. Jane Nakato Ssemanda"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="label">
              Email address <span className="text-danger">*</span>
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={handleChange}
              className="input h-11" placeholder="jane@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Phone number <span className="text-danger">*</span>
            </label>
            <input
              id="phone" name="phone" type="tel" autoComplete="tel" required
              value={form.phone} onChange={handleChange}
              className="input h-11" placeholder="+256 700 000 000"
            />
          </div>
        </div>
      </fieldset>

      {/* Course and intake */}
      <fieldset className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <legend className="font-bold text-primary text-sm px-1">Course and intake</legend>

        {/* Course selector */}
        <div>
          <label htmlFor="courseId" className="label">
            Course <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="courseId" name="courseId" required
              value={form.courseId} onChange={handleCourseChange}
              className="input h-11 pr-9 appearance-none"
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.durationMonths
                    ? ` (${c.durationMonths} month${c.durationMonths > 1 ? "s" : ""})`
                    : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Category -- auto-set when course is chosen, shown read-only */}
        <div>
          <label className="label">Category</label>
          {selectedCourse ? (
            <div className={`input h-11 flex items-center text-sm font-medium ${
              isProfessional ? "text-primary bg-primary/5" : "text-success bg-success/5"
            }`}>
              {isProfessional
                ? "Professionals only (nurses, midwives, clinical officers, doctors)"
                : "Open to all"}
            </div>
          ) : (
            <div className="input h-11 flex items-center text-sm text-gray-400 bg-surface cursor-not-allowed">
              Select a course above to set the category
            </div>
          )}
          {isProfessional && (
            <p className="text-xs text-primary mt-1.5 font-medium">
              This course requires a professional qualification and registration number.
            </p>
          )}
        </div>

        {/* Intake */}
        <div>
          <label className="label">Intake</label>
          <input
            type="text" readOnly value={intakeLabel}
            className="input h-11 bg-surface text-gray-500 cursor-not-allowed"
          />
        </div>
      </fieldset>

      {/* Professional details -- only shown when professional course selected */}
      {isProfessional && (
        <fieldset className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
          <legend className="font-bold text-primary text-sm px-1">
            Professional details (required)
          </legend>
          <p className="text-xs text-gray-600">
            Your professional title and registration number will be verified before admission.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="professionalTitle" className="label">
                Professional title <span className="text-danger">*</span>
              </label>
              <input
                id="professionalTitle" name="professionalTitle" type="text"
                required={isProfessional}
                value={form.professionalTitle} onChange={handleChange}
                className="input h-11"
                placeholder="e.g. Registered Nurse, Midwife, Clinical Officer"
              />
            </div>
            <div>
              <label htmlFor="registrationNumber" className="label">
                Registration number <span className="text-danger">*</span>
              </label>
              <input
                id="registrationNumber" name="registrationNumber" type="text"
                required={isProfessional}
                value={form.registrationNumber} onChange={handleChange}
                className="input h-11" placeholder="e.g. NMC/RN/00123"
              />
            </div>
          </div>
        </fieldset>
      )}

      {/* Background */}
      <fieldset className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <legend className="font-bold text-primary text-sm px-1">Background</legend>

        <div>
          <label htmlFor="highestQualification" className="label">
            Highest qualification <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="highestQualification" name="highestQualification" required
              value={form.highestQualification} onChange={handleChange}
              className="input h-11 pr-9 appearance-none"
            >
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        <div>
          <label htmlFor="howHeard" className="label">How did you hear about us?</label>
          <div className="relative">
            <select
              id="howHeard" name="howHeard"
              value={form.howHeard} onChange={handleChange}
              className="input h-11 pr-9 appearance-none"
            >
              <option value="">Select an option</option>
              {HOW_HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">
            Additional information{" "}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            id="notes" name="notes" rows={3}
            value={form.notes} onChange={handleChange}
            className="input py-2.5 resize-none"
            placeholder="Anything else you would like us to know"
          />
        </div>
      </fieldset>

      {/* Data consent */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox" name="consent" required
            checked={form.consent as boolean} onChange={handleChange}
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary flex-shrink-0"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            I consent to Musawo Training Center collecting and using my personal data to
            process this application in accordance with the{" "}
            <a href="/privacy" className="text-primary no-underline hover:underline">Privacy Policy</a>{" "}
            and the Uganda Data Protection and Privacy Act 2019. I understand this is an
            application only and does not create a student account.
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-600
                   active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all
                   shadow-cta text-base disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {loading ? "Submitting application..." : "Submit application"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <a href="/login" className="text-primary no-underline hover:underline font-semibold">
          Log in
        </a>
      </p>

    </form>
  );
}
