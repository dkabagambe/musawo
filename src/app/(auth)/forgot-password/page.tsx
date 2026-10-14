"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const emailId = useId();
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show success - no email enumeration
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Check your inbox</h1>
        <p className="text-sm text-gray-500 mb-6">
          If an account exists for <strong className="text-primary">{email}</strong>, we sent a
          password reset link. It expires in 1 hour.
        </p>
        <p className="text-xs text-gray-400 mb-8">
          Didn&apos;t get it? Check your spam folder.
        </p>
        <Link href="/login" className="auth-btn-primary no-underline">
          Back to sign in
        </Link>
      </div>
    );
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

      <h1 className="text-2xl font-bold text-primary">Reset your password</h1>
      <p className="text-gray-500 text-sm mt-2 mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor={emailId} className="label">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input h-12 pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
