import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

interface CTABandProps {
  heading?: string;
  subheading?: string;
  primaryLabel?: string;
  primaryHref?: string;
  whatsappUrl?: string;
  variant?: "primary" | "accent";
}

/**
 * Full-width CTA band with amber primary button and WhatsApp secondary.
 * Used on every public page as the penultimate section.
 */
export default function CTABand({
  heading = "Ready to start learning?",
  subheading = "Join the next intake. Enrol in minutes, study on your phone, certify in weeks.",
  primaryLabel = "Enrol now",
  primaryHref = "/register",
  whatsappUrl = "https://wa.me/256785423523",
  variant = "primary",
}: CTABandProps) {
  const bg = variant === "primary" ? "bg-primary" : "bg-accent";

  return (
    <section
      className={`${bg} py-14 sm:py-20 px-4 sm:px-6`}
      aria-label="Call to action"
    >
      <div className="max-w-[760px] mx-auto text-center">
        <h2
          className="font-extrabold text-white mb-4 text-balance"
          style={{ fontSize: "clamp(1.625rem, 2.8vw, 2.25rem)" }}
        >
          {heading}
        </h2>
        <p className="text-white/75 mb-10 text-base sm:text-lg leading-[1.65] max-w-lg mx-auto">
          {subheading}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 bg-accent
                       hover:bg-accent-600 active:scale-[0.97] text-white font-bold
                       text-base px-8 py-4 rounded-xl no-underline transition-all shadow-cta"
          >
            {primaryLabel} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/10
                       hover:bg-white/20 border border-white/30 text-white font-semibold
                       text-base px-8 py-4 rounded-xl no-underline transition-all"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
