"use client";

/**
 * /director/reauth
 *
 * Re-authentication page for high-risk Director actions.
 * The user must enter their current TOTP code (or a backup code).
 * On success, `totpVerifiedAt` is refreshed and the user is redirected
 * back to the page they came from via the `next` query parameter.
 */

import { useState, useId, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

const CODE_LENGTH = 6;

export default function DirectorReauthPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const nextPath     = params.get("next") ?? "/director";

  const [digits, setDigits]   = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const inputRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const firstId    = useId();
  const backupId   = useId();

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
    const code = useBackup ? backupCode.trim() : digits.join("");
    if (!code) return;
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/director/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        router.push(nextPath);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const codeComplete = useBackup ? backupCode.trim().length > 0 : digits.every(Boolean);

  return (
    <div className="max-w-md mx-auto space-y-6 py-8">
      <div>
        <Link
          href={nextPath}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4 no-underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Confirm your identity</h1>
        </div>
        <p className="text-sm text-gray-500">
          This action requires recent two-factor authentication.
          {useBackup ? " Enter one of your saved backup codes." : " Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {useBackup ? (
          <div>
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
          <div>
            <label htmlFor={firstId} className="label">Authenticator code</label>
            <div className="flex gap-2 justify-center mt-1" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  id={index === 0 ? firstId : undefined}
                  type="text"
                  inputMode="numeric"
                  pattern="\d"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 h-14 text-center text-xl font-mono input rounded-xl"
                  aria-label={`Digit ${index + 1}`}
                  autoComplete="one-time-code"
                />
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !codeComplete}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Verifying...
            </span>
          ) : "Confirm"}
        </button>

        <button
          type="button"
          onClick={() => { setUseBackup((v) => !v); setDigits(Array(CODE_LENGTH).fill("")); setBackupCode(""); setError(""); }}
          className="w-full text-center text-sm text-gray-500 hover:text-primary"
        >
          {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
        </button>
      </form>
    </div>
  );
}
