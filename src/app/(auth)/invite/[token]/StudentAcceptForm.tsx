"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  User, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, AlertTriangle,
} from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

interface StudentInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  studentNumber: string | null;
  status: string;
}

interface Props {
  token: string;
  student: StudentInfo;
}

type View = "review" | "accept" | "dispute" | "done_accept" | "done_dispute";

export default function StudentAcceptForm({ token, student }: Props) {
  const router = useRouter();

  const passId    = useId();
  const confirmId = useId();
  const reasonId  = useId();

  const [view, setView]           = useState<View>("review");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [reason, setReason]       = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  // --- Accept flow ---
  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/student/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, action: "accept" }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return; }

      // Auto sign-in
      const identifier = student.email ?? student.phone ?? "";
      const result = await signIn("credentials", { identifier, password, redirect: false });
      if (result?.error) {
        setView("done_accept");
        return;
      }
      const sessionRes  = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json() as { user?: { role?: string } };
      router.push(getPostLoginPath(sessionData?.user?.role, undefined, window.location.origin));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- Dispute flow ---
  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) { setError("Please describe what is incorrect."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/student/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason.trim(), action: "dispute" }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return; }
      setView("done_dispute");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Review screen ──────────────────────────────────────────────
  if (view === "review") {
    return (
      <div className="auth-card">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Welcome to MTC</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Please review your details below. If everything is correct, click <strong>Accept and continue</strong> to set your password. If anything is wrong, click <strong>These details are wrong</strong>.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-border divide-y divide-border mb-6">
          <Row label="Full name"      value={student.name} />
          <Row label="Email"          value={student.email ?? "Not provided"} />
          <Row label="Phone"          value={student.phone ?? "Not provided"} />
          <Row label="Student number" value={student.studentNumber ?? "Being assigned"} />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setView("accept")}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
                       text-white font-bold py-3 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            Accept and continue
          </button>
          <button
            type="button"
            onClick={() => setView("dispute")}
            className="w-full flex items-center justify-center gap-2 border border-danger/40
                       text-danger hover:bg-danger/5 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            These details are wrong
          </button>
        </div>
      </div>
    );
  }

  // ── Set password screen ────────────────────────────────────────
  if (view === "accept") {
    return (
      <div className="auth-card">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Set your password</h1>
          <p className="text-sm text-gray-500">
            Choose a strong password for your student account at Musawo Training Center.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={handleAccept} className="space-y-4" noValidate>
          {/* Password */}
          <div>
            <label htmlFor={passId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id={passId}
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="auth-input pr-11"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor={confirmId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                id={confirmId}
                type={showConf ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="auth-input pr-11"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConf ? "Hide password" : "Show password"}
              >
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Data consent notice */}
          <p className="text-xs text-gray-400 leading-relaxed">
            By clicking <strong>Activate my account</strong> you confirm that the details shown are correct and you consent to Musawo Training Center storing and processing your personal data for the purposes of your education.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
                       disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Activate my account
          </button>

          <button
            type="button"
            onClick={() => { setError(""); setView("review"); }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Back to details review
          </button>
        </form>
      </div>
    );
  }

  // ── Dispute screen ─────────────────────────────────────────────
  if (view === "dispute") {
    return (
      <div className="auth-card">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-danger" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Report incorrect details</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Tell us what is wrong. The Registrar will contact you to correct your details.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={handleDispute} className="space-y-4" noValidate>
          <div>
            <label htmlFor={reasonId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              What is incorrect?
            </label>
            <textarea
              id={reasonId}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="auth-input resize-none"
              placeholder="E.g. My name is spelt incorrectly, or the wrong phone number is shown."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-danger hover:bg-danger/90
                       disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Submit dispute
          </button>

          <button
            type="button"
            onClick={() => { setError(""); setView("review"); }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  // ── Done: accepted (fallback if auto-login fails) ──────────────
  if (view === "done_accept") {
    return (
      <div className="auth-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Account activated!</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your student account is ready. You can now log in with your email and password.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center bg-primary hover:bg-primary/90
                     text-white font-bold px-6 py-3 rounded-xl transition-colors no-underline"
        >
          Go to login
        </a>
      </div>
    );
  }

  // ── Done: disputed ─────────────────────────────────────────────
  return (
    <div className="auth-card text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7 text-amber-600" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">Dispute submitted</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        Thank you. The Registrar has been notified and will contact you to correct your details. You will receive a new invitation link once your details are updated.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}
