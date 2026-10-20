import Image from "next/image";
import Link from "next/link";
import {
  Instagram,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import WhatsAppFab from "@/components/public/WhatsAppFab";

/* TikTok icon (not in Lucide) */
const TikTokIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z" />
  </svg>
);

/* Section heading with amber underline accent */
function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-white">
        {children}
      </h3>
      <div
        className="mt-1.5 w-8 h-0.5 bg-accent rounded-full"
        aria-hidden="true"
      />
    </div>
  );
}

export default async function PublicFooter() {
  const [contact, siteName] = await Promise.all([
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  const linkClass =
    "text-white/90 hover:text-accent no-underline transition-colors text-sm leading-relaxed";

  return (
    <footer className="bg-primary text-white">
      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-12 gap-y-12">
          {/* Brand block */}
          <div className="md:col-span-2 lg:col-span-4">
            <Link
              href="/"
              className="flex items-center gap-3 mb-5 no-underline"
              aria-label={`${siteName} - home`}
            >
              <span className="flex items-center justify-center bg-white rounded-xl w-12 h-12 flex-shrink-0 shadow-sm p-1.5">
                <Image
                  src="/assets/logo-header.png"
                  alt={siteName}
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </span>
              <div>
                <p className="font-extrabold text-white text-sm leading-tight">
                  {siteName}
                </p>
                <p className="text-white/50 text-[11px] mt-0.5">
                  Allied Doctors and Friends of Uganda
                </p>
              </div>
            </Link>

            {/* Tagline */}
            <p className="text-white font-semibold text-sm mb-3 tracking-wide">
              Learn · Serve · Transform
            </p>

            <p className="text-white/85 text-sm leading-relaxed mb-6 max-w-xs">
              Hybrid and online healthcare training with 70% hands-on
              practicals. Taught by doctors, nurses and clinicians. Serving
              Uganda since 2018.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 mb-4">
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/15 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors"
                aria-label="Musawo on Instagram"
              >
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={contact.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/15 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors"
                aria-label="Musawo on TikTok"
              >
                <TikTokIcon />
              </a>
            </div>

            <a
              href="https://www.musawo.ug"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 no-underline transition-colors"
            >
              Visit musawo.ug{" "}
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <FooterHeading>Quick Links</FooterHeading>
            <ul className="space-y-3 list-none">
              {[
                { label: "Home", href: "/" },
                { label: "Courses", href: "/courses" },
                { label: "Apply now", href: "/apply" },
                { label: "How to enrol", href: "/admissions/how-to-enrol" },
                { label: "Learning", href: "/learning/how-you-learn" },
                { label: "About", href: "/about" },
                { label: "Resources", href: "/resources" },
                { label: "FAQ", href: "/faq" },
                { label: "Contact", href: "/contact" },
                { label: "Student login", href: "/login" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Courses */}
          <div className="lg:col-span-2">
            <FooterHeading>Courses</FooterHeading>
            <ul className="space-y-3 list-none">
              {[
                {
                  label: "Medical Home Caregiver Course",
                  href: "/courses/medical-home-caregiver",
                },
                {
                  label: "Basic Home Caregiver",
                  href: "/courses/basic-home-caregiver",
                },
                {
                  label: "Babysitting and Childcare",
                  href: "/courses/babysitting-childcare-safety",
                },
                {
                  label: "Mental Health Support",
                  href: "/courses/mental-health-support-advocacy",
                },
                {
                  label: "Care of Older Persons",
                  href: "/courses/care-older-persons-disability",
                },
                {
                  label: "Basic Life Support",
                  href: "/courses/basic-life-support-first-aid",
                },
                {
                  label: "Advanced Life Support",
                  href: "/courses/advanced-life-support",
                },
                { label: "All courses", href: "/courses" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Enquiries */}
          <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
            {/* Local Enquiries */}
            <div>
              <FooterHeading>Local Enquiries</FooterHeading>
              <ul className="space-y-3 list-none text-sm">
                <li className="flex items-start gap-2.5 text-white/85">
                  <MapPin
                    className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent"
                    aria-hidden="true"
                  />
                  <span className="leading-snug">{contact.address}</span>
                </li>
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-start gap-2.5 text-white/85 hover:text-accent no-underline transition-colors"
                  >
                    <Mail
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    {contact.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:+256709184468`}
                    className="flex items-start gap-2.5 text-white/85 hover:text-accent no-underline transition-colors"
                  >
                    <Phone
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    {contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:+256790192270`}
                    className="flex items-start gap-2.5 text-white/85 hover:text-accent no-underline transition-colors"
                  >
                    <Phone
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    0790 192 270
                  </a>
                </li>
              </ul>
            </div>

            {/* Admissions + WhatsApp */}
            <div>
              <FooterHeading>Admissions</FooterHeading>
              <ul className="space-y-3 list-none text-sm">
                <li>
                  <a
                    href="mailto:admissions@musawo.ug"
                    className="flex items-start gap-2.5 text-white/85 hover:text-accent no-underline transition-colors"
                  >
                    <Mail
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    admissions@musawo.ug
                  </a>
                </li>
                <li>
                  <Link
                    href="/apply"
                    className="inline-flex items-center gap-1.5 mt-1 bg-white/10 hover:bg-white/20
                               text-white text-xs font-semibold px-3.5 py-2 rounded-lg
                               no-underline transition-colors"
                  >
                    Apply now
                  </Link>
                </li>
              </ul>

              <div className="mt-8">
                <FooterHeading>Online Support</FooterHeading>
                <ul className="space-y-3 list-none text-sm">
                  <li>
                    <a
                      href={contact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2.5 text-white/85 hover:text-accent no-underline transition-colors"
                    >
                      <MessageCircle
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      {contact.phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={contact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 bg-[#25D366] hover:bg-[#1ebe5d]
                                 text-white text-xs font-semibold px-3.5 py-2 rounded-lg
                                 no-underline transition-colors"
                    >
                      <MessageCircle
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      Chat on WhatsApp
                    </a>
                  </li>
                  <li className="text-white/50 text-xs leading-snug">
                    Mon to Fri, 8 am to 6 pm EAT.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0A5A4E]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-5 pb-[88px] sm:pb-6 text-center">
          <p className="text-[15px] text-white/88 font-normal mb-3">
            &copy; {new Date().getFullYear()} MUSAWO / Allied Doctors and
            Friends of Uganda (ADFA). All rights reserved.
          </p>
          <nav aria-label="Legal links">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 list-none text-sm">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy", href: "/refund" },
                { label: "FAQ", href: "/faq" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-white/60 hover:text-white no-underline transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Floating WhatsApp FAB */}
      <WhatsAppFab href={contact.whatsappUrl} />
    </footer>
  );
}
