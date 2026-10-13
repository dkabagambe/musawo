import Link from "next/link";

export const metadata = { title: "Check your email — Musawo Training Center" };

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="card max-w-md w-full text-center">
        <p className="text-5xl mb-4" aria-hidden="true">📬</p>
        <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
        <p className="text-gray-500 text-sm mb-6">
          We&apos;ve sent a verification link to your email address. Click the link
          to verify your account and start learning.
        </p>
        <p className="text-xs text-gray-400 mb-8">
          Didn&apos;t receive it? Check your spam folder, or{" "}
          <Link href="/resend-verification" className="text-accent no-underline hover:underline">
            resend the verification email
          </Link>
          .
        </p>
        <Link href="/login" className="btn-outline no-underline text-sm">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
