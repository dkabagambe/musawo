"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: mode === "email" ? email : phone,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
      } else {
        router.push(callbackUrl);
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

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden mb-6">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === "email"
              ? "bg-primary text-white"
              : "text-gray-500 hover:bg-surface"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === "phone"
              ? "bg-primary text-white"
              : "text-gray-500 hover:bg-surface"
          }`}
        >
          Phone / OTP
        </button>
      </div>

      {mode === "phone" ? (
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
            <div
              role="alert"
              className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4"
            >
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="label">
              Email address
            </label>
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
              <label htmlFor="password" className="label mb-0">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-accent no-underline hover:underline"
              >
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
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
