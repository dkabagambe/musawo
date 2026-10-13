"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { getPostLoginPath } from "@/lib/auth/redirect";

interface Props {
  token: string;
  email: string;
  role: string;
}

export default function AcceptInviteForm({ token, email, role }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create account."); return; }

      // Auto sign-in
      const result = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json() as { user?: { role?: string } };
      router.push(getPostLoginPath(sessionData?.user?.role, undefined, window.location.origin));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card max-w-md w-full">
      <div className="text-center mb-6">
        <p className="text-3xl mb-2" aria-hidden="true">👋</p>
        <h1 className="text-2xl font-bold mb-1">Set up your account</h1>
        <p className="text-sm text-gray-500">
          You&apos;ve been invited as <span className="font-medium text-primary">{role.replace("_", " ")}</span> at Musawo Training Center.
        </p>
        <p className="text-xs text-gray-400 mt-1">{email}</p>
      </div>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="label">Your full name</label>
          <input id="name" type="text" autoComplete="name" required value={name}
            onChange={(e) => setName(e.target.value)} className="input" placeholder="Jane Nakato" />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="label">Choose a password</label>
          <input id="password" type="password" autoComplete="new-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
        </div>
        <div className="mb-6">
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" required value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className="input" placeholder="Repeat password" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create account & sign in"}
        </button>
      </form>
    </div>
  );
}
