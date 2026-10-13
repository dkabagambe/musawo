import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import WhatsAppFab from "@/components/public/WhatsAppFab";

export default async function PublicFooter() {
  const [contact, siteName] = await Promise.all([
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  return (
    <footer className="bg-primary-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5 no-underline">
              {/* White badge with dark logo — readable on the dark footer */}
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
                <p className="font-extrabold text-white text-sm">{siteName}</p>
                <p className="text-white/40 text-xs">Allied Doctors and Friends of Uganda</p>
              </div>
            </Link>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs mb-5">
              {contact.tagline}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors"
                aria-label="Musawo on Instagram"
              >
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={contact.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-accent rounded-lg flex items-center justify-center no-underline transition-colors"
                aria-label="Musawo on TikTok"
              >
                {/* TikTok icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z"/>
                </svg>
              </a>
              <a
                href="https://musawo.ug"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/70 no-underline transition-colors ml-1"
              >
                Visit musawo.ug ↗
              </a>
            </div>
          </div>

          {/* Courses */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Courses</h3>
            <ul className="space-y-2.5 text-sm text-white/55 list-none">
              <li><Link href="/courses/cna" className="hover:text-white no-underline transition-colors">Certified Nursing Care Assistant</Link></li>
              <li><Link href="/courses/basic-nursing-care" className="hover:text-white no-underline transition-colors">Basic Nursing Care Assistant</Link></li>
              <li><Link href="/courses/child-care-safety" className="hover:text-white no-underline transition-colors">Child Care &amp; Safety</Link></li>
              <li><Link href="/resources" className="hover:text-white no-underline transition-colors">Free Resources</Link></li>
              <li><Link href="/scholarships" className="hover:text-white no-underline transition-colors">Scholarships</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-white/55 list-none">
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-white no-underline transition-colors flex items-start gap-2">
                  <span className="mt-0.5" aria-hidden="true">✉</span> {contact.email}
                </a>
              </li>
              <li>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white no-underline transition-colors flex items-start gap-2">
                  <span className="mt-0.5" aria-hidden="true">📞</span> {contact.phone}
                </a>
              </li>
              <li>
                <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white no-underline transition-colors flex items-start gap-2">
                  <span className="mt-0.5" aria-hidden="true">💬</span> WhatsApp
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0" aria-hidden="true">📍</span>
                  <span>{contact.address}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/35">
          <p>© {new Date().getFullYear()} MUSAWO / Allied Doctors and Friends of Uganda (ADFA). All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/about"    className="hover:text-white/60 no-underline transition-colors">About</Link>
            <Link href="/faq"      className="hover:text-white/60 no-underline transition-colors">FAQ</Link>
            <Link href="/privacy"  className="hover:text-white/60 no-underline transition-colors">Privacy</Link>
            <Link href="/terms"    className="hover:text-white/60 no-underline transition-colors">Terms</Link>
            <Link href="/refund"   className="hover:text-white/60 no-underline transition-colors">Refunds</Link>
            <Link href="/login"    className="hover:text-white/60 no-underline transition-colors">Student login</Link>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp FAB — client component (hides during mobile nav) */}
      <WhatsAppFab href={contact.whatsappUrl} />
    </footer>
  );
}
