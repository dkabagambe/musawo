import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Check your email - Musawo Training Center" };

export default function CheckEmailPage() {
  return (
    <div className="auth-card text-center">
      <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">Check your inbox</h1>
      <p className="text-gray-500 text-sm mb-4">
        We&apos;ve sent a verification link to your email address. Click the link to
        verify your account and start learning.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Didn&apos;t receive it? Check your spam folder, or{" "}
        <Link href="/resend-verification" className="text-primary no-underline hover:underline">
          resend the verification email
        </Link>
        .
      </p>
      <Link href="/login" className="auth-btn-primary no-underline">
        Go to sign in
      </Link>
    </div>
  );
}
