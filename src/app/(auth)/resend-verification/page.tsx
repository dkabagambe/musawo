"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ResendVerificationPage() {
  const emailId = useId();
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res  = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="auth-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Email sent</h1>
        <p className="text-gray-500 text-sm mb-8">
          If an unverified account exists for <strong className="text-primary">{email}</strong>,
          a new verification link has been sent.
        </p>
        <Link href="/login" className="auth-btn-primary no-underline">
          Go to sign in
        </Link>
      </div>
    );
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

      <h1 className="text-2xl font-bold text-primary">Resend verification email</h1>
      <p className="text-gray-500 text-sm mt-2 mb-8">
        Enter your email address and we&apos;ll send you a fresh verification link.
      </p>

      {status === "error" && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {message}
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
              placeholder="jane@example.com"
            />
          </div>
        </div>
        <button type="submit" disabled={status === "loading"} className="auth-btn-primary">
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {status === "loading" ? "Sending…" : "Send verification link"}
        </button>
      </form>
    </div>
  );
}
