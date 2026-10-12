import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

const SELLING_POINTS = [
  "Ministry of Health accredited",
  "Pay with MTN or Airtel Money",
  "Study on your phone, offline-ready",
  "Scholarships available every intake",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel — branding, visible lg+ */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-2/5 bg-primary relative overflow-hidden flex-col">
        <div className="absolute inset-0">
          <Image
            src="/assets/images/hero-training.jpg"
            alt=""
            fill
            className="object-cover opacity-25"
            aria-hidden="true"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        </div>

        <div className="relative flex flex-col h-full p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-3 no-underline mb-auto">
            <Image src="/assets/logo.webp" alt="Musawo Training Center" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" priority />
            <div>
              <p className="text-white font-extrabold text-sm leading-tight">Musawo Training Center</p>
              <p className="text-white/40 text-xs font-normal tracking-wide">LEARN · CERTIFY · SERVE</p>
            </div>
          </Link>

          <div className="my-auto">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white mb-4 leading-snug text-balance">
              Become a certified<br />
              <span className="text-accent">health worker</span><br />
              from anywhere in Uganda
            </h2>
            <p className="text-white/65 text-sm leading-relaxed mb-8 max-w-xs">
              Accredited online courses, live classes twice a week, and a digital certificate upon completion.
            </p>
            <ul className="space-y-3">
              {SELLING_POINTS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/75">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/25 mt-auto">© {new Date().getFullYear()} Musawo / ADFA, Kampala, Uganda</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <Image src="/assets/logo.webp" alt="Musawo Training Center" width={40} height={40} className="h-10 w-10 rounded-xl object-contain" priority />
            <div>
              <p className="font-extrabold text-primary text-sm leading-tight">Musawo Training Center</p>
              <p className="text-gray-400 text-xs font-normal">LEARN · CERTIFY · SERVE</p>
            </div>
          </Link>
        </div>

        <div className="w-full max-w-md">{children}</div>

        <p className="mt-8 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} Musawo Training Center · All rights reserved
        </p>
      </div>
    </div>
  );
}
