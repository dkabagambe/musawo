import Image from "next/image";
import Link from "next/link";
import { Instagram, Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import WhatsAppFab from "@/components/public/WhatsAppFab";
import AnimateIn from "@/components/public/AnimateIn";

export default async function PublicFooter() {
  const [contact, siteName] = await Promise.all([
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  return (
    <footer className="bg-primary text-white">

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* ── Col 1: Brand ────────────────────────────────────────── */}
          <AnimateIn className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5 no-underline" aria-label={`${siteName} - home`}>
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
                <p className="font-extrabold text-white text-sm leading-tight">{siteName}</p>
                <p className="text-white/50 text-[11px] mt-0.5">Allied Doctors and Friends of Uganda</p>
              </div>
            </Link>

            <p className="text-white/85 text-sm leading-relaxed mb-6 max-w-xs">
              Accredited online healthcare training for Ugandan communities. Study on your phone, pay with mobile money.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 mb-5">
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z"/>
                </svg>
              </a>
              <a
                href="https://musawo.ug"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/55 hover:text-white/90 no-underline transition-colors ml-1"
              >
                Visit musawo.ug ↗
              </a>
            </div>
          </AnimateIn>

          {/* ── Col 2: Courses ──────────────────────────────────────── */}
          <AnimateIn delay={0.05}>
            <h3 className="text-white text-[11px] font-bold uppercase tracking-widest mb-4">Courses</h3>
            <ul className="space-y-3 text-sm list-none">
              {[
                { label: "Certified Nursing Care Assistant", href: "/courses/cna" },
                { label: "Basic Nursing Care Assistant",     href: "/courses/basic-nursing-care" },
                { label: "Child Care and Safety",            href: "/courses/child-care-safety" },
                { label: "Free Resources",                   href: "/resources" },
                { label: "Scholarships",                     href: "/scholarships" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-white/90 hover:text-accent hover:underline underline-offset-4 no-underline transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </AnimateIn>

          {/* ── Col 3: Quick links ──────────────────────────────────── */}
          <AnimateIn delay={0.1}>
            <h3 className="text-white text-[11px] font-bold uppercase tracking-widest mb-4">Quick links</h3>
            <ul className="space-y-3 text-sm list-none">
              {[
                { label: "Home",          href: "/" },
                { label: "Courses",       href: "/courses" },
                { label: "Resources",     href: "/resources" },
                { label: "About",         href: "/about" },
                { label: "FAQ",           href: "/faq" },
                { label: "Scholarships",  href: "/scholarships" },
                { label: "Contact",       href: "/contact" },
                { label: "Student login", href: "/login" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-white/90 hover:text-accent hover:underline underline-offset-4 no-underline transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </AnimateIn>

          {/* ── Col 4: Contact ──────────────────────────────────────── */}
          <AnimateIn delay={0.15}>
            <h3 className="text-white text-[11px] font-bold uppercase tracking-widest mb-4">Contact</h3>
            <ul className="space-y-3 text-sm list-none">
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-start gap-2.5 text-white/90 hover:text-accent hover:underline underline-offset-4 no-underline transition-colors"
                >
                  <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {contact.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="flex items-start gap-2.5 text-white/90 hover:text-accent hover:underline underline-offset-4 no-underline transition-colors"
                >
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-white/90 hover:text-accent hover:underline underline-offset-4 no-underline transition-colors"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2.5 text-white/75">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-snug">{contact.address}</span>
                </span>
              </li>
            </ul>
          </AnimateIn>

        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      {/*
        pb-[88px] on mobile keeps the copyright row clear of the 52 px
        WhatsApp FAB (16 px bottom + 52 px button + 20 px gap = 88 px).
        On sm+ the FAB sits at bottom-4 and the bar needs normal padding.
      */}
      <div className="bg-[#0A5A4E]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-[88px] sm:pb-6 text-center">
          <p className="text-[16px] text-white/88 font-normal mb-4">
            &copy; {new Date().getFullYear()} MUSAWO / Allied Doctors and Friends of Uganda (ADFA). All rights reserved.
          </p>
          <nav aria-label="Policy links">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 list-none text-[15px]">
              {[
                { label: "About",          href: "/about" },
                { label: "FAQ",            href: "/faq" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy",  href: "/refund" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-white/65 hover:text-white hover:underline underline-offset-4 no-underline transition-colors">
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
