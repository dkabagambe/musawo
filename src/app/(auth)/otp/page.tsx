"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Phone, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

const CODE_LENGTH = 6;

export default function OtpPage() {
  const router    = useRouter();
  const params    = useSearchParams();
  const phoneParam  = params.get("phone") ?? "";
  const callbackUrl = params.get("callbackUrl") ?? "";

  const phoneId = useId();

  const [phone, setPhone]           = useState(phoneParam);
  const [step, setStep]             = useState<"phone" | "code">(phoneParam ? "code" : "phone");
  const [digits, setDigits]         = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResend] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Countdown timer */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResend((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = useCallback(async (phoneNumber: string) => {
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
      setResend(60);
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-send when pre-filled */
  useEffect(() => {
    if (phoneParam) sendOtp(phoneParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDigitChange(index: number, value: string) {
    const sanitised = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = sanitised;
    setDigits(next);
    if (sanitised && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    await sendOtp(phone.trim());
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn("otp", { phone, code, redirect: false });
      if (result?.error) {
        setError("Invalid or expired code. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        const sessionRes  = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json() as { user?: { role?: string } };
        const dest = getPostLoginPath(sessionData?.user?.role, callbackUrl, window.location.origin);
        router.push(dest);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const codeComplete = digits.every(Boolean);

  /* ─ Phone entry step ──────────────────────────────────────────── */
  if (step === "phone") {
    return (
      <div className="auth-card">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to sign in
        </Link>

        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Phone className="w-7 h-7 text-primary" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-primary mb-2">Phone sign-in</h1>
        <p className="text-gray-500 text-sm mb-8">
          Enter your registered phone number to receive a one-time code.
        </p>

        {error && (
          <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitPhone} noValidate>
          <div className="mb-6">
            <label htmlFor={phoneId} className="label">Phone number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
              <input
                id={phoneId}
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input h-12 pl-10"
                placeholder="+256 700 000000"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="auth-btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      </div>
    );
  }

  /* ─ Code entry step ──────────────────────────────────────────── */
  return (
    <div className="auth-card text-center">
      <button
        type="button"
        onClick={() => { setStep("phone"); setDigits(Array(CODE_LENGTH).fill("")); setError(""); }}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Change phone number
      </button>

      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Phone className="w-7 h-7 text-primary" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-primary mb-2">Enter your code</h1>
      <p className="text-sm text-gray-500 mb-8">
        We sent a 6-digit code to <strong className="text-primary">{phone}</strong>
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitCode} noValidate>
        {/* Six separate digit boxes */}
        <fieldset className="mb-6">
          <legend className="sr-only">Enter the 6-digit OTP code</legend>
          <div
            className="flex gap-2 justify-center"
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                pattern="\d"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                className={`w-11 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-primary/40
                  ${digit ? "border-primary bg-primary/5" : "border-border bg-white"}
                `}
              />
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading || !codeComplete}
          className="auth-btn-primary mb-4"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Verifying…" : "Verify & sign in"}
        </button>

        {/* Resend countdown */}
        <motion.div
          key={resendCooldown > 0 ? "counting" : "ready"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-500"
        >
          {resendCooldown > 0 ? (
            <span>Resend code in <strong className="text-primary">{resendCooldown}s</strong></span>
          ) : (
            <button
              type="button"
              onClick={() => sendOtp(phone)}
              disabled={loading}
              className="text-primary font-medium hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </motion.div>
      </form>

      <p className="text-sm text-gray-500 mt-6">
        Have a password?{" "}
        <Link href="/login" className="text-primary font-medium no-underline hover:underline underline-offset-4">
          Sign in with email
        </Link>
      </p>
    </div>
  );
}
