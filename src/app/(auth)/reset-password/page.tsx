"use client";

import { useState, useId, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const token   = params.get("token") ?? "";

  const passId    = useId();
  const confirmId = useId();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);
  const [loading, setLoading]       = useState(false);

  if (!token) {
    return (
      <div className="auth-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Invalid link</h1>
        <p className="text-sm text-gray-500 mb-8">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="auth-btn-primary no-underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Password updated</h1>
        <p className="text-sm text-gray-500 mb-8">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <Link href="/login" className="auth-btn-primary no-underline">
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Reset failed. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to sign in
      </Link>

      <h1 className="text-2xl font-bold text-primary">Choose a new password</h1>
      <p className="text-gray-500 text-sm mt-2 mb-8">
        Enter a strong password for your account.
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          <span>
            {error}{" "}
            {error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid") ? (
              <Link href="/forgot-password" className="underline font-medium">Request a new link</Link>
            ) : null}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label htmlFor={passId} className="label">New password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={passId}
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input h-12 pl-10 pr-11"
              placeholder="At least 8 characters"
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
        </div>

        <div className="mb-6">
          <label htmlFor={confirmId} className="label">Confirm new password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={confirmId}
              type={showConf ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`input h-12 pl-10 pr-11 ${confirm && confirm !== password ? "input-error" : ""}`}
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
          {confirm && confirm !== password && (
            <p className="form-error mt-1.5">Passwords do not match</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
