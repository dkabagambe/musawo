"use client";

import { useState, useId } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, Phone, Eye, EyeOff, ArrowLeft,
  AlertCircle, CheckCircle2, Loader2, ShieldCheck,
} from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

type Step = "credentials" | "totp";
type Mode = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const rawCallback = params.get("callbackUrl");

  const emailId  = useId();
  const phoneId  = useId();
  const passId   = useId();
  const totpId   = useId();
  const remId    = useId();

  const [mode, setMode]             = useState<Mode>("email");
  const [step, setStep]             = useState<Step>("credentials");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [remember, setRemember]     = useState(false);
  const [totpCode, setTotpCode]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [needsTotp, setNeedsTotp]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        identifier: mode === "email" ? email : phone,
        password,
        totpCode: needsTotp ? totpCode : "",
        redirect: false,
      });

      if (result?.error === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setStep("totp");
        setLoading(false);
        return;
      }

      if (result?.error) {
        const msg = result.error;
        if (msg.includes("locked") || msg.includes("403")) {
          setError("Your account is temporarily locked after too many failed attempts. Please try again in 15 minutes or contact support.");
        } else if (msg.includes("rate") || msg.includes("429")) {
          setError("Too many sign-in attempts. Please wait a moment before trying again.");
        } else if (needsTotp) {
          setError("Invalid authenticator code. Please check your app and try again.");
        } else {
          setError("Incorrect email or password. Please try again.");
        }
        setLoading(false);
        return;
      }

      const sessionRes  = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json() as { user?: { role?: string } };
      const dest = getPostLoginPath(sessionData?.user?.role, rawCallback, window.location.origin);
      router.push(dest);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  /* ─ TOTP step ───────────────────────────────────────────────── */
  if (step === "totp") {
    return (
      <div className="auth-card">
        <button
          type="button"
          onClick={() => { setStep("credentials"); setNeedsTotp(false); setTotpCode(""); setError(""); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to sign in
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Two-factor verification</h1>
          <p className="text-sm text-gray-500">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label htmlFor={totpId} className="label">Authenticator code</label>
            <input
              id={totpId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="input h-12 text-center text-2xl tracking-[0.4em] font-mono"
              placeholder="000000"
            />
          </div>
          <button type="submit" disabled={loading || totpCode.length !== 6} className="auth-btn-primary">
            {loading ? <Spinner /> : null}
            {loading ? "Verifying…" : "Verify"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Lost access to your authenticator?{" "}
            <Link href="/login?mode=backup" className="text-primary hover:underline no-underline">
              Use a backup code
            </Link>
          </p>
        </form>
      </div>
    );
  }

  /* ─ Main credentials step ───────────────────────────────────── */
  return (
    <div className="auth-card">
      <h1 className="text-2xl font-bold text-primary text-center tracking-tight">Welcome back</h1>
      <p className="text-gray-500 text-sm text-center mt-2 mb-7">
        Sign in to your Musawo Training Center account
      </p>

      {/* Status banners */}
      {params.get("verified") === "1" && (
        <div role="status" className="auth-banner-success mb-6">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Your email has been verified. You can now sign in.
        </div>
      )}
      {params.get("verifyError") && (
        <div role="alert" className="auth-banner-error mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>
            {params.get("verifyError") === "expired"
              ? "Your verification link has expired. "
              : "This verification link is invalid. "}
            <Link href="/resend-verification" className="underline font-medium">Request a new one</Link>.
          </span>
        </div>
      )}
      {params.get("registered") === "1" && (
        <div role="status" className="auth-banner-success mb-6">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Account created. You can now sign in.
        </div>
      )}

      {/* Sign-in methods stay separate from account roles. The account's permissions
          determine the portal after authentication. */}
      <div className="relative grid grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-surface p-1.5 mb-7" role="tablist" aria-label="Sign-in method">
        <motion.div
          className="absolute left-1.5 inset-y-1.5 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04]"
          style={{ width: "calc(50% - 6px)" }}
          animate={{ x: mode === "email" ? 0 : "calc(100% + 6px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          aria-hidden="true"
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === "email"}
          onClick={() => setMode("email")}
          className={`relative z-10 min-w-0 flex items-center justify-center gap-2.5 rounded-xl px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === "email" ? "text-primary" : "text-gray-500 hover:text-gray-800"}`}
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          <span>Email</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "phone"}
          onClick={() => setMode("phone")}
          className={`relative z-10 min-w-0 flex items-center justify-center gap-2.5 rounded-xl px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === "phone" ? "text-primary" : "text-gray-500 hover:text-gray-800"}`}
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span>Phone OTP</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "phone" ? (
          <motion.div
            key="phone-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-center py-4"
          >
            <Phone className="w-10 h-10 text-primary/30 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500 mb-6">
              Sign in with a one-time code sent to your registered phone number.
            </p>
            <Link
              href={`/otp${rawCallback ? `?callbackUrl=${encodeURIComponent(rawCallback)}` : ""}`}
              className="auth-btn-primary no-underline text-center"
            >
              Continue with phone OTP
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="email-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {error && <ErrorAlert message={error} className="mb-5" />}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="mb-5">
                <label htmlFor={emailId} className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
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

              {/* Password */}
              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label htmlFor={passId} className="label mb-0">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary no-underline hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
                  <input
                    id={passId}
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input h-12 pl-10 pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded p-0.5"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass
                      ? <EyeOff style={{width:"18px",height:"18px"}} aria-hidden="true" />
                      : <Eye    style={{width:"18px",height:"18px"}} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5 mb-6">
                <input
                  id={remId}
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <label htmlFor={remId} className="text-sm text-gray-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              <button type="submit" disabled={loading} className="auth-btn-primary mb-6">
                {loading ? <Spinner /> : null}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Divider + browse */}
            <div className="divider text-xs">or</div>
            <Link
              href="/courses"
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-border text-gray-600 hover:border-primary hover:text-primary text-sm font-medium py-3 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Browse courses without an account
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust line */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-6 mb-5">
        <Lock style={{width:"13px",height:"13px"}} aria-hidden="true" />
        <span>Your information is protected · Digital certificate with QR verification</span>
      </div>

      {/* Footer links */}
      <p className="text-center text-sm text-gray-500">
        New to Musawo Training Center?{" "}
        <Link href="/apply" className="text-primary font-bold no-underline hover:underline underline-offset-4">
          Apply now
        </Link>
      </p>
      <p className="text-center text-xs text-gray-400 mt-3">
        Staff sign in here too
      </p>
    </div>
  );
}

/* ── Small shared sub-components ───────────────────────────────── */

function ErrorAlert({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div role="alert" className={`flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function Spinner() {
  return <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />;
}
