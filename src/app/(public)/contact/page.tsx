import PageHero from "@/components/public/PageHero";
import { Mail, Phone, MapPin, ArrowRight, MessageCircle, Navigation } from "lucide-react";
import { getContactInfo } from "@/lib/contact";
import AnimateIn from "@/components/public/AnimateIn";
import ContactForm from "./ContactForm";
import ClinicMap from "./ClinicMap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Musawo Training Center — course enquiries, payments, scholarships and more.",
};

export default async function ContactPage() {
  const contact = await getContactInfo();

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-contact.webp"
        imageAlt="Musawo Training Center Lungujja clinic and offices"
        title="Contact Us"
        description="Questions about courses, payments, or admissions? Our team is ready to help."
        breadcrumbs={[{ label: "Contact" }]}
        boxSide="left"
        objectPosition="center right"
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16" aria-label="Contact information and form">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* Contact cards */}
          <AnimateIn>
            <h2 className="text-2xl font-bold text-primary mb-6">Get in touch</h2>
            <div className="space-y-4 mb-8">
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-accent/40 hover:shadow-card-hover no-underline transition-all group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm">Email us</p>
                  <p className="text-gray-500 text-sm mt-0.5">{contact.email}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent ml-auto transition-colors" aria-hidden="true" />
              </a>

              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-accent/40 hover:shadow-card-hover no-underline transition-all group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm">Call us</p>
                  <p className="text-gray-500 text-sm mt-0.5">{contact.phone}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent ml-auto transition-colors" aria-hidden="true" />
              </a>

              <a
                href={contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border hover:border-green-400/40 hover:shadow-card-hover no-underline transition-all group"
              >
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm">WhatsApp</p>
                  <p className="text-gray-500 text-sm mt-0.5">Fastest response</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 ml-auto transition-colors" aria-hidden="true" />
              </a>

              <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border">
                <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm">Visit us</p>
                  <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{contact.address}</p>
                </div>
              </div>
            </div>

            {/* Map */}
            <ClinicMap address={contact.address} />
          </AnimateIn>

          {/* Form */}
          <AnimateIn delay={0.1}>
            <h2 className="text-2xl font-bold text-primary mb-6">Send us a message</h2>
            <ContactForm />
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
