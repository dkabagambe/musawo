import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { Video, Clock, Users, Wifi, Calendar, Repeat } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Classes",
  description: "Twice-weekly live video classes with your tutor at Musawo Training Center.",
};

const LEARNING_NAV = [
  { label: "How you will learn",     href: "/learning/how-you-learn" },
  { label: "Live classes",           href: "/learning/live-classes" },
  { label: "Exams and certificates", href: "/learning/exams" },
  { label: "Free resources",         href: "/resources" },
];

const FEATURES = [
  { icon: Clock,    heading: "7 pm to 8 pm EAT",   body: "Evening time so working students can join after their day." },
  { icon: Video,    heading: "Video conferencing",  body: "Join from your phone or computer using a link we send by email and SMS." },
  { icon: Users,    heading: "Small groups",        body: "Maximum 20 students per cohort so you get real attention from your tutor." },
  { icon: Repeat,   heading: "Recorded sessions",   body: "Every live class is recorded and available in your course portal within 24 hours." },
  { icon: Wifi,     heading: "Low bandwidth",       body: "Classes run smoothly on 3G. Audio-only mode available for very slow connections." },
  { icon: Calendar, heading: "Scheduled in advance", body: "Full timetable published at the start of each intake so you can plan ahead." },
];

const SCHEDULE = [
  { course: "Certified Nursing Care Assistant",  schedule: "Tuesday and Thursday, 7 pm to 8 pm EAT", frequency: "2 per week, 48 sessions" },
  { course: "Basic Nursing Care Assistant",      schedule: "Monday and Wednesday, 7 pm to 8 pm EAT", frequency: "2 per week, 32 sessions" },
  { course: "Child Care and Safety Management",  schedule: "Wednesday, 7 pm to 8 pm EAT",            frequency: "1 per week, 12 sessions" },
];

export default async function LiveClassesPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/training-session.webp"
        imageAlt="Live video class at Musawo Training Center"
        title="Live Classes"
        description="Join twice-weekly live video sessions with your tutor. Ask questions, practise skills, and connect with fellow students."
        breadcrumbs={[
          { label: "Learning", href: "/learning/how-you-learn" },
          { label: "Live classes" },
        ]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Learning" items={LEARNING_NAV} />

          <div className="flex-1 min-w-0">
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Interactive learning</p>
              <h2
                className="mt-2 mb-4 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                Live video classes with your tutor
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Online learning does not mean learning alone. Our live classes bring the classroom to you, wherever you are in Uganda.
              </p>
            </AnimateIn>

            {/* Feature grid */}
            <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
              {FEATURES.map(({ icon: Icon, heading, body }) => (
                <div key={heading} className="bg-white rounded-2xl border border-border p-5">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-1">{heading}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </StaggerGrid>

            {/* Class schedule */}
            <AnimateIn>
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Class schedule by course
              </h2>
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <table className="table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Course</th>
                      <th className="text-left">Schedule</th>
                      <th className="text-left">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCHEDULE.map(({ course, schedule, frequency }) => (
                      <tr key={course}>
                        <td className="font-medium text-primary">{course}</td>
                        <td>{schedule}</td>
                        <td className="text-gray-500">{frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimateIn>

            {/* What happens in a live class */}
            <AnimateIn className="mt-12">
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                What happens in a live class
              </h2>
              <div className="space-y-3">
                {[
                  { n: "0 to 10 min",   text: "Your tutor opens the session with a short recap of the previous lesson and any common questions." },
                  { n: "10 to 40 min",  text: "New content is taught using slides, demonstrations, and real clinical case examples." },
                  { n: "40 to 55 min",  text: "Students ask questions. Your tutor answers individually and demonstrates skills on request." },
                  { n: "55 to 60 min",  text: "Summary and preview of the next lesson. Assignment instructions if applicable." },
                ].map(({ n, text }) => (
                  <div key={n} className="flex gap-4 bg-[#F1F7F5] rounded-xl border border-border px-5 py-3.5">
                    <span className="flex-shrink-0 text-xs font-bold text-accent/70 tracking-wide w-24">{n}</span>
                    <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </AnimateIn>

            {/* Missed a class */}
            <AnimateIn className="mt-10">
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
                <h3 className="font-bold text-primary mb-2">Missed a class?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Every live class is recorded and uploaded to your course portal within 24 hours. You can watch at any time. We recommend watching missed sessions before the next live class so you stay up to date.
                </p>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Join the next cohort."
        subheading="Small groups, expert tutors, evening classes that fit around your life."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
