import PageHero from "@/components/public/PageHero";
import { Mail, Phone, Instagram } from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import AnimateIn from "@/components/public/AnimateIn";
import ContactForm from "./ContactForm";
import ClinicMap from "./ClinicMap";
import type { Metadata } from "next";
export const revalidate = 3600;

/* TikTok icon (not in Lucide) */
const TikTokIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.16 8.16 0 004.77 1.52V7.6a4.85 4.85 0 01-1-.91z" />
  </svg>
);

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Musawo Training Center - course enquiries, payments, admissions and more.",
};

export default async function ContactPage() {
  const [contact, latitude, longitude] = await Promise.all([
    getContactInfo(), getSetting("site.mapLat", "0.3251859"), getSetting("site.mapLng", "32.539685"),
  ]);

  return (
    <div className="bg-surface">
      {/* Hero Image */}
      <PageHero
        image="/assets/images/hero-classroom-session-1.jpg"
        imageAlt="Musawo Training Center skills lab and offices"
        title="Contact Us"
        description="Questions about courses, payments, or admissions? Our team is ready to help."
        breadcrumbs={[{ label: "Contact" }]}
        boxSide="left"
        objectPosition="center right"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">

        {/* Social Media Links */}
        <AnimateIn>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">Follow Us</h2>
            <div className="flex items-center justify-center gap-4">
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 bg-white hover:bg-accent/10 border border-border hover:border-accent rounded-xl flex items-center justify-center no-underline transition-all group"
                aria-label="Musawo on Instagram"
              >
                <Instagram className="w-6 h-6 text-gray-600 group-hover:text-accent transition-colors" aria-hidden="true" />
              </a>
              <a
                href={contact.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 bg-white hover:bg-accent/10 border border-border hover:border-accent rounded-xl flex items-center justify-center no-underline transition-all group"
                aria-label="Musawo on TikTok"
              >
                <div className="text-gray-600 group-hover:text-accent transition-colors">
                  <TikTokIcon />
                </div>
              </a>
            </div>
          </div>
        </AnimateIn>

        {/* Phone Numbers and Email */}
        <AnimateIn>
          <div className="bg-white rounded-2xl border border-border p-8">
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Get in Touch</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary text-base mb-2">Email Address</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-gray-600 hover:text-accent text-base no-underline transition-colors block"
                  >
                    {contact.email}
                  </a>
                  <a
                    href={`mailto:${contact.admissionsEmail}`}
                    className="text-gray-600 hover:text-accent text-base no-underline transition-colors block"
                  >
                    {contact.admissionsEmail}
                  </a>
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary text-base mb-2">Phone Numbers</p>
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="text-gray-600 hover:text-accent text-base no-underline transition-colors block"
                  >
                    {contact.phone}
                  </a>
                  {contact.phone2 && (
                    <a
                      href={`tel:${contact.phone2.replace(/\s/g, "")}`}
                      className="text-gray-600 hover:text-accent text-base no-underline transition-colors block"
                    >
                      {contact.phone2}
                    </a>
                  )}
                  {contact.phone3 && (
                    <a
                      href={`tel:${contact.phone3.replace(/\s/g, "")}`}
                      className="text-gray-600 hover:text-accent text-base no-underline transition-colors block"
                    >
                      {contact.phone3}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Contact Form */}
        <AnimateIn delay={0.1}>
          <div className="bg-white rounded-2xl border border-border p-8">
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Send Us a Message</h2>
            <ContactForm />
          </div>
        </AnimateIn>

        {/* Map at the bottom */}
        <AnimateIn delay={0.2}>
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Visit Our Location</h2>
            <p className="text-center text-gray-600 mb-6">{contact.address}</p>
            <ClinicMap address={contact.address} latitude={Number(latitude)} longitude={Number(longitude)} />
          </div>
        </AnimateIn>

      </div>
    </div>
  );
}
