"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";

interface Enrolment {
  id: string;
  course: { id: string; title: string; fullFeeUgx: number | null };
  paidAmountUgx?: number;
  totalAmountUgx?: number;
}

type Method = "MOBILE_MONEY_MTN" | "MOBILE_MONEY_AIRTEL";

export default function PaymentClaimForm({
  enrolments,
}: {
  enrolments: Enrolment[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    enrolmentId: enrolments[0]?.id ?? "",
    method: "MOBILE_MONEY_MTN" as Method,
    transactionId: "",
    amount: "",
    payerName: "",
    payerPhone: "",
    bankOrProvider: "MTN MoMo",
    claimedAt: new Date().toISOString().slice(0, 16),
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const METHOD_LABELS: Record<Method, string> = {
    MOBILE_MONEY_MTN: "MTN Mobile Money",
    MOBILE_MONEY_AIRTEL: "Airtel Money",
  };

  const PROVIDER_DEFAULTS: Record<Method, string> = {
    MOBILE_MONEY_MTN: "MTN MoMo",
    MOBILE_MONEY_AIRTEL: "Airtel Money",
  };

  function setMethod(method: Method) {
    setForm((f) => ({ ...f, method, bankOrProvider: PROVIDER_DEFAULTS[method] }));
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5 MB.");
      return;
    }
    setError("");
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  function removeScreenshot() {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(form.amount, 10);
    if (!amt || amt < 1000) {
      setError("Enter a valid amount (minimum UGX 1,000).");
      return;
    }
    if (!form.transactionId.trim()) {
      setError("Transaction ID or reference is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrolmentId: form.enrolmentId,
          method: form.method,
          transactionId: form.transactionId.trim(),
          amount: amt,
          payerName: form.payerName.trim(),
          payerPhone: form.payerPhone.trim(),
          bankOrProvider: form.bankOrProvider.trim(),
          claimedAt: new Date(form.claimedAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      // Upload screenshot if provided and API returned an upload URL
      if (screenshot && data.uploadUrl && data.s3Key) {
        try {
          await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": screenshot.type || "image/jpeg" },
            body: screenshot,
          });
        } catch {
          // Non-fatal: the claim was created, screenshot upload failed
        }
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center py-12">
        <CheckCircle2
          className="w-14 h-14 text-success mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-primary mb-2">Claim submitted!</h2>
        <p className="text-sm text-gray-500 mb-6">
          The Admin will review your payment and update your balance, usually
          within one business day. You will receive a notification once verified.
        </p>
        <Link href="/dashboard/payments" className="btn-secondary no-underline text-sm">
          Back to payments
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {error && (
        <div role="alert" className="auth-banner-error">
          {error}
        </div>
      )}

      {/* Enrolment selector */}
      <div>
        <label htmlFor="enrolmentId" className="label">
          Course
        </label>
        <select
          id="enrolmentId"
          value={form.enrolmentId}
          onChange={(e) => setForm((f) => ({ ...f, enrolmentId: e.target.value }))}
          className="input"
          required
        >
          {enrolments.map((enr) => (
            <option key={enr.id} value={enr.id}>
              {enr.course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Payment method */}
      <div>
        <label className="label">Payment method</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METHOD_LABELS) as Array<Method>).map((m) => (
            <label
              key={m}
              className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm transition-colors ${
                form.method === m
                  ? "border-accent bg-accent/10 font-semibold"
                  : "border-border hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={form.method === m}
                onChange={() => setMethod(m)}
                className="accent-accent"
              />
              {METHOD_LABELS[m]}
            </label>
          ))}
        </div>
      </div>

      {/* Transaction ID */}
      <div>
        <label htmlFor="transactionId" className="label">
          Transaction ID / Reference number
        </label>
        <input
          id="transactionId"
          type="text"
          required
          value={form.transactionId}
          onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
          className="input font-mono"
          placeholder="e.g. 1234567890 or MP241109XXXXX"
        />
        <p className="text-xs text-gray-400 mt-1">
          Found in the SMS confirmation from your mobile money provider.
        </p>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="label">
          Amount paid (UGX)
        </label>
        <input
          id="amount"
          type="number"
          required
          min={1000}
          step={1000}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          className="input"
          placeholder="e.g. 500000"
        />
      </div>

      {/* Date and time */}
      <div>
        <label htmlFor="claimedAt" className="label">
          Date and time of payment
        </label>
        <input
          id="claimedAt"
          type="datetime-local"
          required
          value={form.claimedAt}
          max={new Date().toISOString().slice(0, 16)}
          onChange={(e) => setForm((f) => ({ ...f, claimedAt: e.target.value }))}
          className="input"
        />
      </div>

      {/* Payer name */}
      <div>
        <label htmlFor="payerName" className="label">
          Name on the mobile account
        </label>
        <input
          id="payerName"
          type="text"
          required
          value={form.payerName}
          onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))}
          className="input"
          placeholder="Full name registered with MTN or Airtel"
        />
      </div>

      {/* Payer phone */}
      <div>
        <label htmlFor="payerPhone" className="label">
          Phone number used to pay
        </label>
        <input
          id="payerPhone"
          type="tel"
          required
          value={form.payerPhone}
          onChange={(e) => setForm((f) => ({ ...f, payerPhone: e.target.value }))}
          className="input"
          placeholder="e.g. 0771234567"
        />
      </div>

      {/* Optional screenshot */}
      <div>
        <label className="label">Payment screenshot (optional, up to 5 MB)</label>
        {screenshotPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotPreview}
              alt="Payment screenshot preview"
              className="max-h-40 rounded-xl border border-border"
            />
            <button
              type="button"
              onClick={removeScreenshot}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center shadow-md"
              aria-label="Remove screenshot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload screenshot of payment confirmation
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScreenshot}
        />
      </div>

      <p className="text-xs text-gray-400">
        The Admin will verify this claim against the transaction record and
        update your balance. Do not submit duplicate claims for the same
        transaction.
      </p>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />}
        {loading ? "Submitting..." : "Submit payment claim"}
      </button>
    </form>
  );
}
