"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

interface Props {
  token: string;
  email: string;
  role: string;
}

export default function AcceptInviteForm({ token, email, role }: Props) {
  const router = useRouter();

  const nameId     = useId();
  const passId     = useId();
  const confirmId  = useId();

  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    if (password.length < 8)   { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/admin/staff-invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create account."); return; }

      const result = await signIn("credentials", { identifier: email, password, redirect: false });
      if (result?.error) { router.push("/login"); return; }

      const sessionRes  = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json() as { user?: { role?: string } };
      router.push(getPostLoginPath(sessionData?.user?.role, undefined, window.location.origin));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = role.replace(/_/g, " ");

  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-7 h-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1">Set up your staff account</h1>
        <p className="text-sm text-gray-500">
          You&apos;ve been invited as{" "}
          <span className="font-semibold text-primary">{roleLabel}</span> at Musawo Training Center.
        </p>
        <p className="text-xs text-gray-400 mt-1">{email}</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-danger/5 border border-danger/20 text-red-800 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label htmlFor={nameId} className="label">Your full name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={nameId} type="text" autoComplete="name" required
              value={name} onChange={(e) => setName(e.target.value)}
              className="input h-12 pl-10" placeholder="Jane Nakato"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor={passId} className="label">Choose a password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={passId} type={showPass ? "text" : "password"} autoComplete="new-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="input h-12 pl-10 pr-11" placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded p-0.5"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff style={{width:"18px",height:"18px"}} aria-hidden="true" /> : <Eye style={{width:"18px",height:"18px"}} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor={confirmId} className="label">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{width:"18px",height:"18px"}} aria-hidden="true" />
            <input
              id={confirmId} type={showConf ? "text" : "password"} autoComplete="new-password" required
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className={`input h-12 pl-10 pr-11 ${confirm && confirm !== password ? "input-error" : ""}`}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConf((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded p-0.5"
              aria-label={showConf ? "Hide confirm password" : "Show confirm password"}
            >
              {showConf ? <EyeOff style={{width:"18px",height:"18px"}} aria-hidden="true" /> : <Eye style={{width:"18px",height:"18px"}} aria-hidden="true" />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="form-error mt-1.5">Passwords do not match</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Creating account…" : "Create account & sign in"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Wrong link?{" "}
        <Link href="/" className="text-primary hover:underline no-underline">
          Go to home
        </Link>
      </p>
    </div>
  );
}
