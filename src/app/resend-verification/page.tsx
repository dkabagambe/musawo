"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
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
      <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
        <div className="card max-w-md w-full text-center">
          <p className="text-5xl mb-4" aria-hidden="true">📬</p>
          <h1 className="text-2xl font-bold mb-2">Email sent</h1>
          <p className="text-gray-500 text-sm mb-6">
            If an unverified account exists for <strong>{email}</strong>, a new
            verification link has been sent.
          </p>
          <Link href="/login" className="btn-outline no-underline text-sm">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Resend verification email</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Enter your email address and we&apos;ll send you a fresh verification link.
        </p>

        {status === "error" && (
          <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="jane@example.com"
            />
          </div>
          <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
            {status === "loading" ? "Sending…" : "Send verification link"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-accent font-medium no-underline hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
