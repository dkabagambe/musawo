"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "credentials" | "totp";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [mode, setMode]       = useState<"email" | "phone">("email");
  const [step, setStep]       = useState<Step>("credentials");
  const [email, setEmail]     = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [phone, setPhone]     = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  // If the server signals TOTP is required we prompt for it
  const [needsTotp, setNeedsTotp] = useState(false);

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
        // For SUPERADMIN wrong TOTP show specific message
        if (needsTotp) {
          setError("Invalid authenticator code. Please try again.");
        } else {
          setError("Invalid credentials. Please try again.");
        }
      } else {
        // Let server redirect to role-appropriate home
        router.push(callbackUrl !== "/dashboard" ? callbackUrl : "/_rbac_redirect");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl mb-2 text-center">Welcome back</h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        Sign in to your Musawo Training Center account
      </p>

      {/* Mode toggle — only on credentials step */}
      {step === "credentials" && (
        <div className="flex rounded-xl border border-border overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "email" ? "bg-primary text-white" : "text-gray-500 hover:bg-surface"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "phone" ? "bg-primary text-white" : "text-gray-500 hover:bg-surface"
            }`}
          >
            Phone / OTP
          </button>
        </div>
      )}

      {/* TOTP step */}
      {step === "totp" ? (
        <form onSubmit={handleSubmit} noValidate>
          <div className="text-center mb-6">
            <p className="text-3xl mb-2" aria-hidden="true">🔐</p>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <div className="mb-6">
            <label htmlFor="totpCode" className="label">Authenticator code</label>
            <input
              id="totpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="input text-center text-2xl tracking-[0.4em] font-mono"
              placeholder="000000"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("credentials"); setNeedsTotp(false); setTotpCode(""); setError(""); }}
            className="btn-ghost w-full mt-2 text-sm"
          >
            ← Back
          </button>
        </form>
      ) : mode === "phone" ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-4">
            Sign in with a one-time code sent to your phone.
          </p>
          <Link href="/otp" className="btn-primary no-underline">
            Continue with phone OTP
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

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
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-1.5">
              <label htmlFor="password" className="label mb-0">Password</label>
              <Link href="/forgot-password" className="text-xs text-accent no-underline hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {/* Pre-fill TOTP if user knows they need it */}
          {needsTotp && (
            <div className="mb-6">
              <label htmlFor="totpInline" className="label">Authenticator code (2FA)</label>
              <input
                id="totpInline"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="input"
                placeholder="000000"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent font-medium no-underline hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
