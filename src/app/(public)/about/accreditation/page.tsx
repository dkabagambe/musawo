import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { CheckCircle, Shield, Award, FileCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accreditation",
  description: "Musawo Training Center is accredited by Uganda's Ministry of Health and Ministry of Education and Sports.",
};

const ABOUT_NAV = [
  { label: "About MTC",     href: "/about" },
  { label: "Accreditation", href: "/about/accreditation" },
  { label: "Our trainers",  href: "/about/trainers" },
  { label: "FAQ",           href: "/faq" },
];

const ACCREDITATIONS = [
  {
    icon: Shield,
    body: "Uganda Ministry of Health",
    sub: "Our nursing care programmes are approved by the Ministry of Health for community health worker training.",
    badge: "MOH Approved",
  },
  {
    icon: Award,
    body: "Ministry of Education and Sports",
    sub: "MTC is a registered training institution under the Ministry of Education and Sports, Business, Technical and Vocational Education Division.",
    badge: "MoES Registered",
  },
  {
    icon: FileCheck,
    body: "ADFA Community Mandate",
    sub: "As a division of Allied Doctors and Friends of Uganda (ADFA), our training programmes are embedded in a decade of community health service.",
    badge: "Est. 2018",
  },
];

const WHAT_ACCREDITATION_MEANS = [
  "Employers in Uganda recognise our certificates as meeting national healthcare training standards.",
  "Our curriculum is reviewed and approved by Ministry of Health technical officers.",
  "Our clinical supervisors and tutors meet the qualification requirements set by the licensing bodies.",
  "The Musawo Training Center is subject to periodic inspection and performance review.",
  "Our certificates include a unique verification code accepted by healthcare employers.",
];

export default async function AccreditationPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Musawo Training Center accreditation documents"
        title="Accreditation"
        description="Our courses are fully accredited by Uganda's Ministry of Health and Ministry of Education and Sports."
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
                Nationally recognised and government approved
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Musawo Training Center is not just a digital platform. We are a licensed, accredited institution with ten years of clinical service in Uganda.
              </p>
            </AnimateIn>

            <StaggerGrid className="grid sm:grid-cols-3 gap-5 mb-14">
              {ACCREDITATIONS.map(({ icon: Icon, body, sub, badge }) => (
                <div key={body} className="bg-white rounded-2xl border border-border p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">
                      {badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">{body}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{sub}</p>
                </div>
              ))}
            </StaggerGrid>

            <AnimateIn>
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                What accreditation means for you
              </h2>
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8">
                <ul className="space-y-4 list-none">
                  {WHAT_ACCREDITATION_MEANS.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            <AnimateIn className="mt-10">
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h3 className="font-bold text-primary mb-2">Certificate verification</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Every Musawo certificate includes a unique verification code and QR code. Employers can verify authenticity online at any time. If you are an employer and need to verify a certificate, visit the verification portal or contact us at info@musawo.ug.
                </p>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Train with a fully accredited institution."
        subheading="Our certificates are recognised by healthcare employers across Uganda."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
