import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { GraduationCap, Clock, BookOpen, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Trainers",
  description: "Meet the qualified clinical educators at Musawo Training Center.",
};

const ABOUT_NAV = [
  { label: "About MTC",     href: "/about" },
  { label: "Accreditation", href: "/about/accreditation" },
  { label: "Our trainers",  href: "/about/trainers" },
  { label: "FAQ",           href: "/faq" },
];

const TRAINER_QUALITIES = [
  { icon: GraduationCap, heading: "Clinically qualified",    body: "All tutors hold recognised nursing or healthcare qualifications and have supervised clinical experience in Uganda." },
  { icon: Clock,         heading: "Active practitioners",    body: "Our tutors continue to practice clinically so their teaching reflects current real-world conditions in Ugandan healthcare." },
  { icon: BookOpen,      heading: "Trained educators",       body: "In addition to their clinical qualifications, our tutors complete a facilitator training programme before leading any live class." },
  { icon: Users,         heading: "Accessible and responsive", body: "Tutors respond to student questions within one working day and are available on WhatsApp during office hours for urgent queries." },
];

const TUTOR_COMMITMENT = [
  "Mark all assignments within 5 working days.",
  "Lead all scheduled live classes on time.",
  "Respond to forum posts within one working day.",
  "Provide constructive written feedback on all submissions.",
  "Notify students in advance if a live class must be rescheduled.",
  "Support practical days at the skills lab with on-site supervision.",
];

export default async function TrainersPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/musawo-staff.webp"
        imageAlt="Musawo Training Center clinical educators and trainers"
        title="Our Trainers"
        description="Qualified, practicing healthcare professionals who teach from real clinical experience."
        breadcrumbs={[
          { label: "About", href: "/about" },
          { label: "Our trainers" },
        ]}
        boxSide="left"
        objectPosition="center right"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="About" items={ABOUT_NAV} />

          <div className="flex-1 min-w-0">
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Clinical educators</p>
              <h2
                className="mt-2 mb-4 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                Taught by people who do the work
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Every course at MTC is taught by a qualified healthcare professional with direct clinical experience in Uganda. You learn from someone who faces the same challenges as the patients your future patients will be.
              </p>
            </AnimateIn>

            <StaggerGrid className="grid sm:grid-cols-2 gap-5 mb-14">
              {TRAINER_QUALITIES.map(({ icon: Icon, heading, body }) => (
                <div key={heading} className="bg-white rounded-2xl border border-border p-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">{heading}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </StaggerGrid>

            {/* Tutor commitment */}
            <AnimateIn>
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Our tutor commitment to you
              </h2>
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8">
                <ul className="space-y-3 list-none">
                  {TUTOR_COMMITMENT.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0 mt-1.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            {/* ADFA connection */}
            <AnimateIn className="mt-10">
              <div className="bg-primary text-white rounded-2xl p-6 sm:p-8">
                <h3 className="font-bold text-white mb-3">Part of the ADFA clinical team</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-4">
                  Our tutors are part of the broader Allied Doctors and Friends of Uganda (ADFA) clinical network. They participate in outreach events, community health drives, and the skills lab, giving them continuous exposure to the healthcare challenges your future patients face.
                </p>
                <a
                  href="https://musawo.ug"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-semibold text-sm no-underline transition-colors"
                >
                  Learn more about ADFA at musawo.ug
                </a>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Learn from real healthcare professionals."
        subheading="Our tutors practice what they teach, every day."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
