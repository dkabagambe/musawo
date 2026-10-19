"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BANKS = [
  "Stanbic Bank Uganda",
  "Centenary Bank",
  "DFCU Bank",
  "Absa Bank Uganda",
  "Standard Chartered Uganda",
  "Equity Bank Uganda",
  "Diamond Trust Bank Uganda",
  "PostBank Uganda",
  "Finance Trust Bank",
  "Housing Finance Bank",
  "Other",
];

interface Props {
  courseId: string;
  courseName: string;
  fullFeeUgx: number;
  instalmentCount: number;
  intakeId?: string;
}

export default function BankPaymentForm({
  courseId,
  courseName,
  fullFeeUgx,
  instalmentCount,
  intakeId,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "upload" | "done">("form");
  const [planType, setPlanType] = useState<"FULL" | "INSTALMENT">("FULL");
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");const [amount, _setAmount] = useState(fullFeeUgx);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [_paymentId, setPaymentId] = useState("");

  const firstInstalmentAmount =
    planType === "INSTALMENT" ? Math.ceil(fullFeeUgx / instalmentCount) : fullFeeUgx;

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!bankName) { setError("Please select your bank."); return; }
    if (!bankRef.trim()) { setError("Please enter your bank transfer reference number."); return; }

    try {
      const res = await fetch("/api/payments/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          intakeId,
          amount: planType === "INSTALMENT" ? firstInstalmentAmount : amount,
          bankName,
          bankTransferRef: bankRef.trim(),
          planType,
        }),
      });

      const data = await res.json() as { uploadUrl?: string; paymentId?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }

      setUploadUrl(data.uploadUrl ?? "");
      setPaymentId(data.paymentId ?? "");
      setStep("upload");
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function handleUploadReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptFile) { setError("Please select your bank receipt file."); return; }
    if (!uploadUrl) { setError("Upload URL missing. Please restart."); return; }

    setUploading(true);
    setError("");
    try {
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": receiptFile.type || "application/pdf" },
        body: receiptFile,
      });

      if (!uploadRes.ok) {
        throw new Error("File upload failed");
      }

      setStep("done");
    } catch {
      setError("Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="card text-center py-10">
        <div className="text-5xl mb-4" aria-hidden="true">✅</div>
        <h2 className="text-xl font-bold mb-2">Payment submitted!</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          Your bank receipt has been received. An admin will review and approve
          your payment within 1-2 business days. You will receive an email and
          SMS once approved.
        </p>
        <button
          onClick={() => router.push("/dashboard/payments")}
          className="btn-primary"
        >
          View my payments
        </button>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <form onSubmit={handleUploadReceipt} className="card max-w-md">
        <h2 className="text-lg font-semibold mb-1">Upload your bank receipt</h2>
        <p className="text-sm text-gray-500 mb-4">
          Please attach a photo or PDF of your bank deposit receipt for{" "}
          <strong>{courseName}</strong>. Accepted formats: PDF, JPG, PNG (max 5 MB).
        </p>

        {error && (
          <p className="text-danger text-sm bg-danger/10 rounded-xl p-3 mb-4">{error}</p>
        )}

        <div className="mb-4">
          <label htmlFor="receipt" className="label">Bank receipt file *</label>
          <input
            id="receipt"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > 5 * 1024 * 1024) {
                setError("File is too large. Maximum 5 MB.");
                return;
              }
              setReceiptFile(f ?? null);
            }}
            required
          />
          <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG - max 5 MB</p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload receipt"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmitDetails} className="card max-w-md">
      <h2 className="text-lg font-semibold mb-1">Pay by bank transfer</h2>
      <p className="text-sm text-gray-500 mb-4">
        Deposit your fees at any bank branch, then submit your receipt here.
        Your account will be activated within 1-2 business days.
      </p>

      {/* Bank details to pay to */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-6 text-sm">
        <p className="font-semibold text-primary mb-2">Pay to this account:</p>
        <div className="space-y-1 text-gray-700">
          <p><span className="font-medium">Account name:</span> Musawo / ADFA</p>
          <p><span className="font-medium">Bank:</span> Centenary Bank Uganda</p>
          <p><span className="font-medium">Account number:</span> 3100000000 <span className="text-gray-400">(placeholder - update in admin)</span></p>
          <p><span className="font-medium">Branch:</span> Kampala Road</p>
          <p className="text-xs text-gray-400 mt-2">
            ⚠️ Use your full name as the payment reference so we can identify your deposit.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-danger text-sm bg-danger/10 rounded-xl p-3 mb-4">{error}</p>
      )}

      {/* Payment plan */}
      {instalmentCount > 1 && (
        <div className="mb-4">
          <label className="label">Payment plan</label>
          <div className="flex gap-3">
            {(["FULL", "INSTALMENT"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlanType(p)}
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  planType === p
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border text-gray-500"
                }`}
              >
                {p === "FULL"
                  ? `Full - UGX ${fullFeeUgx.toLocaleString()}`
                  : `${instalmentCount} instalments from UGX ${firstInstalmentAmount.toLocaleString()}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="bank-name" className="label">Bank you paid from *</label>
        <select
          id="bank-name"
          className="input"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
        >
          <option value="">Select bank…</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="bank-ref" className="label">Bank transfer / receipt reference number *</label>
        <input
          id="bank-ref"
          type="text"
          className="input"
          placeholder="e.g. TXN20261012001234"
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
          required
        />
        <p className="text-xs text-gray-400 mt-1">Found on your bank receipt or SMS confirmation</p>
      </div>

      <div className="bg-surface rounded-xl p-3 mb-4 text-sm flex justify-between">
        <span className="text-gray-500">Amount to deposit</span>
        <span className="font-bold text-primary">
          UGX {(planType === "INSTALMENT" ? firstInstalmentAmount : fullFeeUgx).toLocaleString()}
        </span>
      </div>

      <button type="submit" className="btn-primary w-full">
        Continue - upload receipt
      </button>
    </form>
  );
}
