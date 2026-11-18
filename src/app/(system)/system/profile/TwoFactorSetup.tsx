"use client";

import { useState } from "react";
import { Shield, Download, Check, X, Copy } from "lucide-react";
import Image from "next/image";

interface Props {
  totpEnabled: boolean;
  email: string;
}

export default function TwoFactorSetup({ totpEnabled, email }: Props) {
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"start" | "verify" | "codes" | "done">("start");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disabling, setDisabling] = useState(false);

  async function startEnrollment() {
    setError("");
    setEnrolling(true);

    try {
      const res = await fetch("/api/profile/totp/setup", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate 2FA setup");
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("verify");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyAndEnable() {
    if (verifyCode.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }

    setError("");
    setEnrolling(true);

    try {
      const res = await fetch("/api/profile/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }

      setBackupCodes(data.backupCodes || []);
      setStep("codes");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  function downloadBackupCodes() {
    const text = `MTC Two-Factor Authentication Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join("\n")}\n\nKeep these codes safe. Each can be used once if you lose access to your authenticator app.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mtc-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard");
    setTimeout(() => setSuccess(""), 2000);
  }

  async function disable2FA() {
    if (!confirm("Are you sure you want to disable two-factor authentication? This will make your account less secure.")) {
      return;
    }

    setDisabling(true);
    setError("");

    try {
      const res = await fetch("/api/profile/totp/disable", { method: "POST" });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to disable 2FA");
        return;
      }

      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDisabling(false);
    }
  }

  if (totpEnabled) {
    return (
      <div className="pt-6 border-t border-border">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
          Two-Factor Authentication
        </h2>
        
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">2FA is enabled</p>
            <p className="text-xs text-green-700 mt-1">
              Your account is protected with two-factor authentication.
            </p>
          </div>
        </div>

        <button
          onClick={disable2FA}
          disabled={disabling}
          className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {disabling ? "Disabling..." : "Disable 2FA"}
        </button>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-border">
      <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
        Two-Factor Authentication
      </h2>

      {step === "start" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">2FA is not enabled</p>
              <p className="text-xs text-yellow-700 mt-1">
                Two-factor authentication is <strong>required for IT Admin</strong> in production. 
                Set it up now to secure your account.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </p>
          )}

          <button
            onClick={startEnrollment}
            disabled={enrolling}
            className="btn-primary text-sm inline-flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {enrolling ? "Setting up..." : "Enable 2FA"}
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Step 1: Scan QR Code</p>
            <p className="text-xs text-blue-700 mb-3">
              Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code:
            </p>
            
            {qrCode && (
              <div className="bg-white p-4 rounded inline-block">
                <Image src={qrCode} alt="2FA QR Code" width={200} height={200} unoptimized />
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs text-blue-700 mb-1">Or enter this secret key manually:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded font-mono">{secret}</code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="text-blue-600 hover:text-blue-700"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Step 2: Enter Verification Code</p>
            <p className="text-xs text-blue-700 mb-3">
              Enter the 6-digit code from your authenticator app:
            </p>
            
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="input w-32 text-center text-lg tracking-wider font-mono"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
              {success}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={verifyAndEnable}
              disabled={enrolling || verifyCode.length !== 6}
              className="btn-primary text-sm"
            >
              {enrolling ? "Verifying..." : "Verify and Enable"}
            </button>
            <button
              onClick={() => {
                setStep("start");
                setQrCode("");
                setSecret("");
                setVerifyCode("");
                setError("");
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "codes" && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900">2FA Enabled Successfully!</p>
                <p className="text-xs text-green-700 mt-1">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-900 mb-2">Save Your Backup Codes</p>
            <p className="text-xs text-yellow-700 mb-3">
              Store these backup codes in a safe place. Each code can be used once if you lose access to your authenticator app.
            </p>
            
            <div className="bg-white p-3 rounded border border-yellow-300 mb-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-400">{i + 1}.</span>
                    <code className="flex-1">{code}</code>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={downloadBackupCodes}
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Backup Codes
            </button>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
