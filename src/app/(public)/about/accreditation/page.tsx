import { notFound } from "next/navigation";
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import { CheckCircle, FileCheck } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const text = await getSetting("site.accreditationText", "");
  if (!text) return { robots: "noindex" };
  return {
    title: "Accreditation",
    description: text,
  };
}

const ABOUT_NAV = [
  { label: "About MTC",     href: "/about" },
  { label: "Accreditation", href: "/about/accreditation" },
  { label: "Our trainers",  href: "/about/trainers" },
  { label: "FAQ",           href: "/faq" },
];

export default async function AccreditationPage() {
  const [contact, accreditationText] = await Promise.all([
    getContactInfo(),
    getSetting("site.accreditationText", ""),
  ]);

  // Hide this page entirely until the accreditationText setting is filled
  if (!accreditationText) {
    notFound();
  }

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center accreditation documents"
        title="Accreditation"
        description={accreditationText}
        breadcrumbs={[
          { label: "About", href: "/about" },
          { label: "Accreditation" },
        ]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="About" items={ABOUT_NAV} />

          <div className="flex-1 min-w-0">
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Quality assurance</p>
              <h2
                className="mt-2 mb-4 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                {accreditationText}
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Musawo Training Center is not only a digital platform. We are a training institution with a decade of clinical service in Uganda.
              </p>
            </AnimateIn>

            <AnimateIn>
              <div className="bg-white border border-border rounded-2xl px-6 py-6 flex items-start gap-4 mb-8">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-sm mb-2">{accreditationText}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This training programme has met the requirements set out by the relevant regulatory body. For verification, contact us at info@mtc.ac.ug.
                  </p>
                </div>
              </div>
            </AnimateIn>

            <AnimateIn>
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Certificate verification
              </h2>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Every Musawo certificate includes a unique verification code and QR code. Employers can verify authenticity online at any time. If you are an employer and need to verify a certificate, visit the verification portal or contact us at info@mtc.ac.ug.
                  </p>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>

      <CTABand
        heading="Train with us."
        subheading="Digital certificate with QR verification on completion."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
