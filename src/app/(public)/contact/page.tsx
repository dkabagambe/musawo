import Image from "next/image";
import Link from "next/link";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import type { Metadata } from "next";
import { Mail, Phone, MapPin, Instagram, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Contact Us — Musawo Training Center" };

export default async function ContactPage() {
  const [contact, siteName] = await Promise.all([
    getContactInfo(),
    getSetting("site.name", "Musawo Training Center"),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="relative bg-primary text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/assets/images/community-care.jpg" alt="" fill className="object-cover opacity-20" aria-hidden="true" />
          <div className="absolute inset-0 bg-primary/80" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-eyebrow text-accent mb-2">We&apos;re here for you</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Contact Us</h1>
          <p className="text-white/75 max-w-xl mx-auto text-lg">
            Questions about courses, payments, or admissions? Our team is ready to help.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* Contact cards */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Get in touch</h2>
            <div className="space-y-4 mb-8">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-accent/40 hover:shadow-card-hover no-underline transition-all group">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <p className="font-bold text-primary group-hover:text-accent transition-colors">{contact.email}</p>
                </div>
              </a>

              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-accent/40 hover:shadow-card-hover no-underline transition-all group">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Phone &amp; WhatsApp</p>
                  <p className="font-bold text-primary group-hover:text-accent transition-colors">{contact.phone}</p>
                </div>
              </a>

              <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-[#25D366]/40 hover:shadow-card-hover no-underline transition-all group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#25D366" + "20" }}>
                  <svg className="w-5 h-5" style={{ color: "#25D366" }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">WhatsApp</p>
                  <p className="font-bold text-primary group-hover:text-[#25D366] transition-colors">Chat with us now</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="font-semibold text-primary text-sm">{contact.address}</p>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Follow us</p>
              <div className="flex gap-3">
                <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-border hover:border-accent/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary hover:text-accent no-underline transition-all">
                  <Instagram className="w-4 h-4" aria-hidden="true" /> Instagram
                </a>
                <a href={contact.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-border hover:border-accent/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary hover:text-accent no-underline transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z"/></svg>
                  TikTok
                </a>
              </div>
            </div>
          </div>

          {/* Enquiry form */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Send an enquiry</h2>
            <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
              <form action={`mailto:${contact.email}`} method="get" className="space-y-4">
                <div>
                  <label htmlFor="fname" className="label">Your name</label>
                  <input id="fname" name="subject" type="text" className="input" placeholder="Jane Nakato" required />
                </div>
                <div>
                  <label htmlFor="femail" className="label">Email or phone</label>
                  <input id="femail" type="text" className="input" placeholder="jane@example.com or +256…" required />
                </div>
                <div>
                  <label htmlFor="fmessage" className="label">Message</label>
                  <textarea id="fmessage" name="body" rows={5} className="input resize-none" placeholder="Tell us what you need help with…" required />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Send message <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Or contact us directly on WhatsApp for a faster response.
                </p>
              </form>
            </div>

            {/* CTA to enrol */}
            <div className="mt-6 bg-primary rounded-2xl p-6 text-center">
              <p className="text-white font-bold mb-2">Ready to enrol?</p>
              <p className="text-white/70 text-sm mb-4">Skip the form — create your account and choose your course today.</p>
              <Link href="/register" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-6 py-2.5 rounded-xl no-underline transition-colors text-sm">
                Create account <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
