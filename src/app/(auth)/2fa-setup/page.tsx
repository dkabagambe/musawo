"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Copy, Check, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

const CODE_LENGTH = 6;

export default function TwoFASetupPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret]       = useState("");
  const [copied, setCopied]       = useState(false);
  const [digits, setDigits]       = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [fetching, setFetching]   = useState(true);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const firstDigitId = useId();

  /* Load QR code from API */
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/auth/totp/setup");
        const data = await res.json() as { qrDataUrl?: string; secret?: string; error?: string };
        if (!res.ok) { setError(data.error ?? "Could not start 2FA setup."); return; }
        setQrDataUrl(data.qrDataUrl ?? null);
        setSecret(data.secret ?? "");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  function handleDigitChange(index: number, value: string) {
    const sanitised = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = sanitised;
    setDigits(next);
    if (sanitised && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft"  && index > 0)              inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
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

  const handleCopy = useCallback(() => {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [secret]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) return;
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/totp/setup", {
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
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ─ Done state ────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="auth-card text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-success" aria-hidden="true" />
          </div>
        </motion.div>
        <h1 className="text-2xl font-bold text-primary mb-2">2FA enabled</h1>
        <p className="text-sm text-gray-500 mb-8">
          Two-factor authentication is now active on your account. You&apos;ll be asked for a code each time you sign in.
        </p>
        <Link href="/dashboard" className="auth-btn-primary no-underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <Link
        href="/dashboard/security"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to security settings
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Set up two-factor authentication</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Scan the QR code with your authenticator app (e.g. Google Authenticator, Authy), then enter the code to confirm.
      </p>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-label="Loading QR code…" />
        </div>
      ) : qrDataUrl ? (
        <>
          {/* QR code */}
          <div className="flex flex-col items-center gap-4 mb-6 p-5 rounded-2xl bg-surface border border-border/60">
            <Image
              src={qrDataUrl}
              alt="TOTP QR code — scan with your authenticator app"
              width={180}
              height={180}
              className="rounded-lg"
              unoptimized
            />
            <div className="w-full">
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Or enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white border border-border rounded-lg px-3 py-2 text-primary break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 rounded-lg border border-border hover:bg-surface text-gray-500 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={copied ? "Copied!" : "Copy secret key"}
                >
                  {copied
                    ? <Check className="w-4 h-4 text-success" aria-hidden="true" />
                    : <Copy className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {/* Code entry */}
          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="mb-6">
              <legend className="label mb-3">Enter the 6-digit code from your app</legend>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    id={i === 0 ? firstDigitId : undefined}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
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
              disabled={loading || digits.join("").length !== CODE_LENGTH}
              className="auth-btn-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
              {loading ? "Verifying…" : "Enable 2FA"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
