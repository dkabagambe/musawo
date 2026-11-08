/**
 * Sign-out page.
 *
 * Uses a Server Action to clear the session server-side (no client-side
 * CSRF fetch that can time out in headless/E2E environments).
 * The action calls signOut from next-auth which deletes the JWT cookie
 * and redirects to /login. The client shows a "Signing out..." state
 * while the form auto-submits on mount.
 */
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth/server";
import SignOutTrigger from "./SignOutTrigger";

export const metadata = { title: "Signing out - Musawo Training Center" };

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default function SignOutPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Full-bleed background photo */}
      <Image
        src="/assets/musawo-staff.webp"
        alt=""
        fill
        className="object-cover object-center"
        priority
        aria-hidden="true"
        sizes="100vw"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 via-primary/70 to-primary-dark/90" />

      {/* Logo */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <span className="flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20 rounded-full w-10 h-10 p-1.5 group-hover:bg-white/25 transition-colors shadow-md">
            <Image src="/assets/logo-header.png" alt="MTC" width={28} height={28} className="w-full h-full object-contain" />
          </span>
          <span className="hidden sm:block text-white font-bold text-sm drop-shadow">
            Musawo Training Center
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">

          {/* Animated icon */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center border-2 bg-white/10 border-white/20 animate-pulse">
              <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Signing out...
          </h1>
          <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8 max-w-xs mx-auto">
            Please wait while we securely end your session.
          </p>

          <div className="flex justify-center gap-2 mb-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-white/60 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>

          {/* Hidden form auto-submitted by SignOutTrigger */}
          <SignOutTrigger action={doSignOut} />
        </div>

        <p className="text-center text-white/35 text-xs mt-5">
          Musawo Training Center - Kampala, Uganda
        </p>
      </div>
    </div>
  );
}
