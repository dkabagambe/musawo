"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
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
      // Always show success to avoid revealing whether email exists
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl mb-2 text-center">Reset your password</h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <div className="text-center py-4">
          <p className="text-4xl mb-4" aria-hidden="true">📬</p>
          <h2 className="font-semibold mb-2">Check your inbox</h2>
          <p className="text-sm text-gray-500 mb-6">
            If an account exists for <strong>{email}</strong>, we sent a password
            reset link. It expires in 1 hour.
          </p>
          <Link href="/login" className="btn-primary no-underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Remembered it?{" "}
            <Link href="/login" className="text-accent font-medium no-underline hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
