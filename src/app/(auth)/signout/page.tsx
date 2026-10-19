"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, LogOut } from "lucide-react";

export default function SignOutPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    signOut({ redirect: false }).then(() => setDone(true));
  }, []);

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

      {/* Gradient overlay - deep teal, stronger at edges */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 via-primary/70 to-primary-dark/90" />

      {/* Logo - top left */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <span className="flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl w-10 h-10 p-1.5 group-hover:bg-white/25 transition-colors">
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

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-700 ${
              done
                ? "bg-success/20 border-success/50"
                : "bg-white/10 border-white/20 animate-pulse"
            }`}>
              {done ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationIterationCount: 1 }} />
                  <svg className="w-11 h-11 text-success drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </>
              ) : (
                <LogOut className="w-10 h-10 text-white/80" />
              )}
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            {done ? "See you soon!" : "Signing out..."}
          </h1>
          <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8 max-w-xs mx-auto">
            {done
              ? "Your session ended securely. Progress and certificates are saved."
              : "Please wait while we securely end your session."}
          </p>

          {/* Loading dots */}
          {!done && (
            <div className="flex justify-center gap-2 mb-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 bg-white/60 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}

          {/* Buttons - appear after sign-out */}
          {done && (
            <div className="space-y-3" style={{ animation: "fadeInUp 0.4s ease-out both" }}>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 bg-white text-primary font-bold text-base px-6 py-3.5 rounded-xl no-underline hover:bg-white/90 shadow-lg w-full transition-colors"
              >
                Sign in again <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold text-sm px-6 py-3 rounded-xl no-underline w-full transition-colors"
              >
                Back to home
              </Link>
              <Link
                href="/courses"
                className="flex items-center justify-center gap-2 text-white/55 hover:text-white/90 text-sm no-underline transition-colors w-full pt-1"
              >
                <BookOpen className="w-4 h-4" />Browse our courses
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-white/35 text-xs mt-5">
          Musawo Training Center - Kampala, Uganda
        </p>
      </div>
    </div>
  );
}
