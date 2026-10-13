"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPostLoginPath } from "@/lib/auth/redirect";

export default function OtpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const phoneParam = params.get("phone") ?? "";
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [phone, setPhone] = useState(phoneParam);
  const [step, setStep] = useState<"phone" | "code">(phoneParam ? "code" : "phone");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // If phone was pre-filled, auto-send OTP
  useEffect(() => {
    if (phoneParam) {
      sendOtp(phoneParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendOtp(phoneNumber: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, purpose: "LOGIN" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Could not send OTP. Check the phone number.");
        return;
      }
      setStep("code");
      setResendCooldown(60);
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    await sendOtp(phone.trim());
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("otp", {
        phone,
        code: code.trim(),
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid or expired code. Please try again.");
      } else {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json() as { user?: { role?: string } };
        const role = sessionData?.user?.role;
        const dest = getPostLoginPath(role, callbackUrl, window.location.origin);
        router.push(dest);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl mb-2 text-center">Phone sign-in</h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        {step === "phone"
          ? "Enter your registered phone number to receive a code."
          : `We sent a 6-digit code to ${phone}`}
      </p>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSubmitPhone} noValidate>
          <div className="mb-6">
            <label htmlFor="phone" className="label">Phone number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+256 700 000000"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitCode} noValidate>
          <div className="mb-6">
            <label htmlFor="code" className="label">6-digit code</label>
            <input
              id="code"
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="input text-center text-2xl tracking-[0.4em] font-mono"
              placeholder="000000"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mb-3">
            {loading ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            type="button"
            onClick={() => sendOtp(phone)}
            disabled={resendCooldown > 0 || loading}
            className="btn-ghost w-full text-sm"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(""); }}
            className="btn-ghost w-full text-sm mt-1"
          >
            ← Change phone number
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Have a password?{" "}
        <Link href="/login" className="text-accent font-medium no-underline hover:underline">
          Sign in with email
        </Link>
      </p>
    </div>
  );
}
