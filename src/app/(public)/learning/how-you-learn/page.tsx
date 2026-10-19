import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import FeatureBlock from "@/components/public/FeatureBlock";
import { getContactInfo } from "@/lib/contact";
import {
  Smartphone, BookOpen, Video, MessageCircle,
  Download, Clock, Globe, Shield,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How You Will Learn",
  description: "Musawo Training Center's mobile-first online learning approach - study anywhere, anytime.",
};

const LEARNING_NAV = [
  { label: "How you will learn",     href: "/learning/how-you-learn" },
  { label: "Live classes",           href: "/learning/live-classes" },
  { label: "Exams and certificates", href: "/learning/exams" },
  { label: "Free resources",         href: "/resources" },
];

const FEATURES = [
  {
    icon: Smartphone,
    heading: "Study on your phone",
    body: "All course content is optimised for mobile. A basic Android phone with 2G internet is enough to watch lessons and read notes.",
  },
  {
    icon: Clock,
    heading: "Learn at your own pace",
    body: "Pre-recorded video lessons are available 24 hours a day. Study early in the morning, during lunch, or late at night.",
  },
  {
    icon: Video,
    heading: "Twice-weekly live classes",
    body: "Join scheduled video sessions with your tutor and fellow students to ask questions and practise skills.",
  },
  {
    icon: BookOpen,
    heading: "Structured modules",
    body: "Each course is divided into clear blocks with video lessons, reading notes, quizzes, and assignments.",
  },
  {
    icon: Download,
    heading: "Downloadable notes",
    body: "Every lesson has downloadable PDF notes so you can study offline when you do not have internet access.",
  },
  {
    icon: MessageCircle,
    heading: "Discussion forum",
    body: "Ask questions, share experiences, and support your fellow students in the course forum.",
  },
  {
    icon: Globe,
    heading: "Study from anywhere in Uganda",
    body: "There is no need to relocate. Except for practical days at our skills lab, everything is done online.",
  },
  {
    icon: Shield,
    heading: "Tutor support",
    body: "Your tutor responds to questions within one working day. WhatsApp support is also available during office hours.",
  },
];

const WHAT_TO_EXPECT = [
  {
    week: "Weeks 1 to 3",
    title: "Foundation",
    body: "Introduction to the healthcare environment, basic anatomy, patient rights, and infection control.",
  },
  {
    week: "Weeks 4 to 6",
    title: "Core skills",
    body: "Personal care assistance, mobility support, vital signs monitoring, and medication awareness.",
  },
  {
    week: "Weeks 7 to 9",
    title: "Clinical practice",
    body: "Practical days at the skills lab under qualified clinical supervisors. Apply classroom learning with real patients.",
  },
  {
    week: "Weeks 10 to 12",
    title: "Examination preparation",
    body: "Revision, mock examinations, and the final assessment. Successful students receive their digital certificate.",
  },
];

export default async function HowYouLearnPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/training-session.webp"
        imageAlt="Musawo Training Center student learning on a mobile phone"
        title="How You Will Learn"
        description="Our courses are designed for Ugandans with busy lives. Study on your phone, at your own pace, from anywhere."
        breadcrumbs={[
          { label: "Learning", href: "/learning/how-you-learn" },
          { label: "How you will learn" },
        ]}
        boxSide="left"
        objectPosition="center right"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Learning" items={LEARNING_NAV} />

          <div className="flex-1 min-w-0">

            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Mobile-first learning</p>
              <h2
                className="mt-2 mb-4 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                Quality training designed for real life
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                We know you have family responsibilities, work, and limited internet. Every part of our learning system is designed around that reality.
              </p>
            </AnimateIn>

            {/* Feature grid */}
            <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-14">
              {FEATURES.map((f) => (
                <div
                  key={f.heading}
                  className="bg-white rounded-2xl border border-border p-6 hover:shadow-card-hover transition-shadow"
                >
                  <FeatureBlock icon={f.icon} heading={f.heading} body={f.body} />
                </div>
              ))}
            </StaggerGrid>

            {/* Typical week */}
            <AnimateIn>
              <h2
                className="font-bold text-primary mb-6"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                What a typical week looks like
              </h2>
              <div className="bg-[#F1F7F5] rounded-2xl border border-border overflow-hidden">
                {[
                  { day: "Monday", tasks: ["Watch 2 to 3 pre-recorded video lessons (30 to 45 min total)", "Read the lesson notes PDF"] },
                  { day: "Tuesday/Thursday", tasks: ["Attend the 60-minute live class with your tutor (7 pm to 8 pm EAT)", "Complete the lesson quiz"] },
                  { day: "Wednesday", tasks: ["Work on the week's written assignment (30 to 60 min)"] },
                  { day: "Friday", tasks: ["Review notes and post any questions in the forum", "Watch optional revision videos"] },
                  { day: "Weekend", tasks: ["Catch up on anything missed during the week", "Practical day at clinic (scheduled once every 3 weeks)"] },
                ].map(({ day, tasks }) => (
                  <div key={day} className="px-6 py-4 border-b border-border last:border-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                    <span className="flex-shrink-0 font-bold text-primary text-sm w-40">{day}</span>
                    <ul className="list-none space-y-1">
                      {tasks.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-accent mt-0.5 flex-shrink-0">+</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AnimateIn>

            {/* CNA course journey */}
            <AnimateIn className="mt-14">
              <h2
                className="font-bold text-primary mb-6"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Course journey (CNA, 12 weeks)
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {WHAT_TO_EXPECT.map(({ week, title, body }) => (
                  <div key={week} className="bg-white rounded-2xl border border-border p-6">
                    <p className="text-xs font-extrabold text-accent/60 tracking-widest mb-2">{week}</p>
                    <h3 className="font-bold text-primary text-sm mb-2">{title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Ready to start learning?"
        subheading="Enrol today and study from wherever you are in Uganda."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
