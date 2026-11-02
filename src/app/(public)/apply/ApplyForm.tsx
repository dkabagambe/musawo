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
  "Community Health Workers (CHW)",
  "Village Health Teams (VHT)",
  "Friend or family",
  "Social media",
  "Radio or TV",
  "Poster or flyer",
  "Other (please specify)",
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

const UGANDA_DISTRICTS = [
  "Kampala","Wakiso","Mukono","Jinja","Mbale","Mbarara","Gulu","Lira",
  "Arua","Fort Portal","Masaka","Entebbe","Soroti","Kabale","Tororo",
  "Iganga","Hoima","Masindi","Kasese","Mityana","Nakaseke","Buikwe",
  "Kayunga","Luweero","Nakasongola","Rakai","Sembabule","Butebo",
  "Buvuma","Gomba","Kalangala","Kalungu","Kiboga","Kyankwanzi","Lwengo",
  "Lyantonde","Mpigi","Mubende","Butebo","Other / Outside Uganda",
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
    gender: "",
    dateOfBirth: "",
    district: "",
    highestQualification: "",
    howHeard: "",
    notes: "",
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const selectedCourse  = courses.find((c) => c.id === form.courseId) ?? null;
  const isProfessional  = form.category === "PROFESSIONAL";

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

    if (!form.fullName.trim())  { setError("Please enter your full name."); return; }
    if (!form.phone.trim())     { setError("Please enter your phone number."); return; }
    if (!form.courseId)         { setError("Please select a course."); return; }
    if (!form.category)         { setError("Please select a course first."); return; }
    if (isProfessional && !form.professionalTitle.trim()) {
      setError("Professional courses require your professional title."); return;
    }
    if (isProfessional && !form.registrationNumber.trim()) {
      setError("Professional courses require your registration number."); return;
    }
    if (!form.highestQualification) { setError("Please select your highest qualification."); return; }
    if (!form.consent)          { setError("Please tick the consent box to continue."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName:             form.fullName.trim(),
          email:                form.email.trim() || undefined,
          phone:                form.phone.trim(),
          courseId:             form.courseId,
          intakeLabel,
          category:             form.category,
          professionalTitle:    form.professionalTitle.trim() || undefined,
          registrationNumber:   form.registrationNumber.trim() || undefined,
          gender:               form.gender || undefined,
          dateOfBirth:          form.dateOfBirth || undefined,
          district:             form.district || undefined,
          highestQualification: form.highestQualification,
          howHeard:             form.howHeard || undefined,
          notes:                form.notes.trim() || undefined,
          dataConsent:          true,
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Application submitted!</h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
          Thank you, <strong>{form.fullName}</strong>. The Academic Registrar will review your
          application and contact you{form.email ? ` at ${form.email}` : " by phone"} within
          3 to 5 working days.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Questions? Contact{" "}
          <a href="mailto:admissions@musawo.ug" className="text-primary no-underline hover:underline">
            admissions@musawo.ug
          </a>{" "}
          or call <a href="tel:+256709184468" className="text-primary no-underline hover:underline">0709 184 468</a>.
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Error banner */}
      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 dark:text-red-300 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Personal details ─────────────────────────── */}
      <fieldset className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6 space-y-5">
        <legend className="text-base font-bold text-primary px-1">Personal details</legend>

        {/* Full name */}
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Full name (as on your ID) <span className="text-danger">*</span>
          </label>
          <input
            id="fullName" name="fullName" type="text" autoComplete="name" required
            value={form.fullName} onChange={handleChange}
            className="input h-11" placeholder="e.g. Jane Nakato Ssemanda"
          />
        </div>

        {/* Gender + DOB */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Gender <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <select
                id="gender" name="gender"
                value={form.gender} onChange={handleChange}
                className="input h-11 pr-9 appearance-none"
              >
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Date of birth <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="dateOfBirth" name="dateOfBirth" type="date"
              value={form.dateOfBirth} onChange={handleChange}
              className="input h-11"
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Phone number <span className="text-danger">*</span>
            </label>
            <input
              id="phone" name="phone" type="tel" autoComplete="tel" required
              value={form.phone} onChange={handleChange}
              className="input h-11" placeholder="e.g. 0700 123 456"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Email address <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email"
              value={form.email} onChange={handleChange}
              className="input h-11" placeholder="jane@example.com"
            />
          </div>
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <label htmlFor="district" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            District / area <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <select
              id="district" name="district"
              value={form.district} onChange={handleChange}
              className="input h-11 pr-9 appearance-none"
            >
              <option value="">Select district</option>
              {UGANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </fieldset>

      {/* ── Course and intake ─────────────────────────── */}
      <fieldset className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6 space-y-5">
        <legend className="text-base font-bold text-primary px-1">Course and intake</legend>

        <div className="space-y-1.5">
          <label htmlFor="courseId" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
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
                  {c.title}{c.durationMonths ? ` — ${c.durationMonths} month${c.durationMonths > 1 ? "s" : ""}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Category — auto-set, read-only */}
        {selectedCourse && (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Category</p>
            <div className={`rounded-xl border px-4 h-11 flex items-center text-sm font-medium ${
              isProfessional
                ? "text-primary bg-primary/5 border-primary/20"
                : "text-success bg-success/5 border-success/20"
            }`}>
              {isProfessional
                ? "Professionals only (nurses, midwives, clinical officers, doctors)"
                : "Open to all"}
            </div>
            {isProfessional && (
              <p className="text-xs text-primary font-medium">
                This course requires a professional qualification and registration number.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Intake</p>
          <input
            type="text" readOnly value={intakeLabel}
            className="input h-11 bg-gray-50 dark:bg-slate-700 text-gray-500 cursor-not-allowed"
          />
        </div>
      </fieldset>

      {/* ── Professional details ──────────────────────── */}
      {isProfessional && (
        <fieldset className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-5">
          <legend className="text-base font-bold text-primary px-1">Professional details <span className="text-danger">*</span></legend>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Your professional title and registration number will be verified before admission.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="professionalTitle" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Professional title <span className="text-danger">*</span>
              </label>
              <input
                id="professionalTitle" name="professionalTitle" type="text"
                required={isProfessional}
                value={form.professionalTitle} onChange={handleChange}
                className="input h-11"
                placeholder="e.g. Registered Nurse, Midwife"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="registrationNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
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

      {/* ── Background ───────────────────────────────── */}
      <fieldset className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6 space-y-5">
        <legend className="text-base font-bold text-primary px-1">Background</legend>

        <div className="space-y-1.5">
          <label htmlFor="highestQualification" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
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

        <div className="space-y-1.5">
          <label htmlFor="howHeard" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            How did you hear about us? <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
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

        <div className="space-y-1.5">
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Additional information <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="notes" name="notes" rows={3}
            value={form.notes} onChange={handleChange}
            className="input py-3 resize-none leading-relaxed"
            placeholder="Anything else you would like us to know"
          />
        </div>
      </fieldset>

      {/* ── Data consent ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox" name="consent" required
            checked={form.consent as boolean} onChange={handleChange}
            className="mt-1 w-4 h-4 rounded border-border accent-primary flex-shrink-0"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            I consent to Musawo Training Center collecting and using my personal data to
            process this application in accordance with the{" "}
            <a href="/privacy" className="text-primary no-underline hover:underline">Privacy Policy</a>{" "}
            and the Uganda Data Protection and Privacy Act 2019 and other applicable laws.
          </span>
        </label>
      </div>

      {/* ── Submit ───────────────────────────────────── */}
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-600
                   active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all
                   shadow-cta text-base disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {loading ? "Submitting..." : "Submit application"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <a href="/login" className="text-primary no-underline hover:underline font-semibold">Log in</a>
      </p>

    </form>
  );
}
