"use client";

import { useState, useRef, useId, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

const CODE_LENGTH = 6;

function TwoFAVerifyForm() {
  const router    = useRouter();
  const params    = useSearchParams();
  const rawCallback = params.get("callbackUrl") ?? "";
  const identifier  = params.get("identifier") ?? "";
  const password    = params.get("password")   ?? "";

  const inputRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const firstId    = useId();

  const [digits, setDigits]     = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const backupId = useId();

  function handleDigitChange(index: number, value: string) {
    const sanitised = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = sanitised;
    setDigits(next);
    if (sanitised && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft"  && index > 0)               inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1)  inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totpCode = useBackup ? backupCode.trim() : digits.join("");
    if (!totpCode) return;

    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        totpCode,
        redirect: false,
      });
      if (result?.error) {
        setError(useBackup
          ? "Invalid backup code. Please try again."
          : "Invalid authenticator code. Please check your app and try again."
        );
        if (!useBackup) {
          setDigits(Array(CODE_LENGTH).fill(""));
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
        }
      } else {
        const sessionRes  = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json() as { user?: { role?: string } };
        const dest = getPostLoginPath(sessionData?.user?.role, rawCallback, window.location.origin);
        router.push(dest);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const codeComplete = useBackup ? backupCode.trim().length > 0 : digits.every(Boolean);

  return (
    <div className="auth-card">
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to sign in
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Two-factor verification</h1>
      </div>
      <p className="text-gray-500 text-sm mt-2 mb-8">
        {useBackup
          ? "Enter one of your saved backup codes."
          : "Enter the 6-digit code from your authenticator app."}
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {useBackup ? (
          <div className="mb-6">
            <label htmlFor={backupId} className="label">Backup code</label>
            <input
              id={backupId}
              type="text"
              autoComplete="off"
              required
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="input h-12 font-mono tracking-widest text-center"
              placeholder="XXXX-XXXX"
            />
          </div>
        ) : (
          <fieldset className="mb-6">
            <legend className="sr-only">Enter the 6-digit authenticator code</legend>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  id={i === 0 ? firstId : undefined}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  pattern="\d"
                  maxLength={1}
                  autoFocus={i === 0}
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
        )}

        <button
          type="submit"
          disabled={loading || !codeComplete}
          className="auth-btn-primary mb-4"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setUseBackup((v) => !v); setError(""); setDigits(Array(CODE_LENGTH).fill("")); setBackupCode(""); }}
        className="w-full text-sm text-primary hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        {useBackup ? "← Use authenticator app instead" : "Use a backup code"}
      </button>
    </div>
  );
}

export default function TwoFAVerifyPage() {
  return (
    <Suspense>
      <TwoFAVerifyForm />
    </Suspense>
  );
}
