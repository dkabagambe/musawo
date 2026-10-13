"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const course = params.get("course");
  const scholarship = params.get("scholarship");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consent: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.consent) {
      setError("You must agree to the data consent to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          consent: form.consent,
        }),
      });

      const data = await res.json() as { id?: string; studentNumber?: string; emailSent?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      // If they provided an email, send them to the "check your inbox" page
      if (form.email.trim() && data.emailSent) {
        router.push("/check-email");
        return;
      }

      const redirectTo = course
        ? `/login?callbackUrl=${encodeURIComponent(`/courses/${course}/enrol`)}`
        : scholarship
        ? `/login?callbackUrl=${encodeURIComponent("/courses")}`
        : "/login?registered=1";

      router.push(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl mb-2 text-center">Create your account</h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        Join Musawo Training Center and start learning today.
      </p>

      {error && (
        <div
          role="alert"
          className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="Jane Nakato"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="label">Email address <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className="input"
            placeholder="jane@example.com"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="phone" className="label">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            className="input"
            placeholder="+256 700 000000"
          />
        </div>

        <p className="text-xs text-gray-400 -mt-2 mb-4">
          Provide at least an email or phone number to log in.
        </p>

        <div className="mb-4">
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={handleChange}
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={handleChange}
            className="input"
            placeholder="Repeat your password"
          />
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              name="consent"
              type="checkbox"
              checked={form.consent}
              onChange={handleChange}
              className="mt-0.5 accent-accent"
              required
            />
            <span className="text-sm text-gray-600">
              I consent to Musawo Training Center collecting and using my personal data for
              educational purposes in accordance with the{" "}
              <Link href="/privacy" className="text-accent no-underline hover:underline">
                Privacy Policy
              </Link>{" "}
              and the Uganda Data Protection and Privacy Act 2019.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
