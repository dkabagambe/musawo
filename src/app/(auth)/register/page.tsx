"use client";

import { useState, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft,
  AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";

/** Password strength meter - returns 0-4 score */
function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-gray-200", "bg-danger", "bg-warning", "bg-yellow-400", "bg-success"];

const NEXT_STEPS = [
  "Create your free account",
  "Verify your email or phone",
  "Choose a course and enrol",
  "Pay via MTN or Airtel Money",
  "Start learning from anywhere",
];

export default function RegisterPage() {
  const router = useRouter();
  const params  = useSearchParams();
  const course  = params.get("course");
  const scholarship = params.get("scholarship");

  const nameId    = useId();
  const emailId   = useId();
  const phoneId   = useId();
  const passId    = useId();
  const confirmId = useId();
  const consentId = useId();

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    password: "", confirmPassword: "", consent: false,
  });
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const strength = passwordStrength(form.password);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Please provide at least an email address or phone number so you can sign in.");
      return;
    }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.consent) { setError("You must agree to the data consent to continue."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          consent: form.consent,
        }),
      });
      const data = await res.json() as { id?: string; studentNumber?: string; emailSent?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      if (form.email.trim() && data.emailSent) {
        router.push("/check-email");
        return;
      }
      router.push(
        course        ? `/login?callbackUrl=${encodeURIComponent(`/courses/${course}/enrol`)}`
        : scholarship ? `/login?callbackUrl=${encodeURIComponent("/courses")}`
        :               "/login?registered=1"
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      {/* Back to sign in */}
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to sign in
      </Link>

      <h1 className="text-2xl font-bold text-primary">Create your account</h1>
      <p className="text-gray-500 text-sm mt-2 mb-8">
        Join Musawo Training Center and start learning today.
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Full name */}
        <div className="mb-5">
          <label htmlFor={nameId} className="label">Full name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={nameId} name="name" type="text" autoComplete="name" required
              value={form.name} onChange={handleChange}
              className="input h-12 pl-10" placeholder="Jane Nakato"
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-5">
          <label htmlFor={emailId} className="label">
            Email address{" "}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={emailId} name="email" type="email" autoComplete="email"
              value={form.email} onChange={handleChange}
              className="input h-12 pl-10" placeholder="jane@example.com"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="mb-5">
          <label htmlFor={phoneId} className="label">
            Phone number{" "}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={phoneId} name="phone" type="tel" autoComplete="tel"
              value={form.phone} onChange={handleChange}
              className="input h-12 pl-10" placeholder="+256 700 000000"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Provide at least an email or phone number to sign in later.</p>
        </div>

        {/* Password */}
        <div className="mb-5">
          <label htmlFor={passId} className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={passId} name="password" type={showPass ? "text" : "password"} autoComplete="new-password" required
              value={form.password} onChange={handleChange}
              className="input h-12 pl-10 pr-11" placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded p-0.5"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff style={{width:"18px",height:"18px"}} aria-hidden="true" /> : <Eye style={{width:"18px",height:"18px"}} aria-hidden="true" />}
            </button>
          </div>
          {/* Strength meter */}
          {form.password && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-colors duration-300 ${i <= strength ? STRENGTH_COLORS[strength] : "bg-gray-200"}`}
                  />
                ))}
              </div>
              {strength > 0 && (
                <p className="text-xs text-gray-500">{STRENGTH_LABELS[strength]} password</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Confirm password */}
        <div className="mb-5">
          <label htmlFor={confirmId} className="label">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={confirmId} name="confirmPassword" type={showConf ? "text" : "password"} autoComplete="new-password" required
              value={form.confirmPassword} onChange={handleChange}
              className={`input h-12 pl-10 pr-11 ${form.confirmPassword && form.confirmPassword !== form.password ? "input-error" : ""}`}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConf((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded p-0.5"
              aria-label={showConf ? "Hide confirm password" : "Show confirm password"}
            >
              {showConf ? <EyeOff style={{width:"18px",height:"18px"}} aria-hidden="true" /> : <Eye style={{width:"18px",height:"18px"}} aria-hidden="true" />}
            </button>
          </div>
          {form.confirmPassword && form.confirmPassword !== form.password && (
            <p className="form-error mt-1.5">Passwords do not match</p>
          )}
        </div>

        {/* Consent */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer" htmlFor={consentId}>
            <input
              id={consentId} name="consent" type="checkbox"
              checked={form.consent} onChange={handleChange}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              required
            />
            <span className="text-sm text-gray-600">
              I consent to Musawo Training Center collecting and using my personal data for educational purposes in accordance with the{" "}
              <Link href="/privacy" className="text-primary no-underline hover:underline">Privacy Policy</Link>{" "}
              and the Uganda Data Protection and Privacy Act 2019.
            </span>
          </label>
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* What happens next - desktop only */}
      <div className="hidden lg:block mt-8 pt-6 border-t border-border/60">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What happens next</p>
        <ol className="space-y-2">
          {NEXT_STEPS.map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-bold no-underline hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
