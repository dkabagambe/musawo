import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import PageHero from "@/components/public/PageHero";
import ContactBand from "@/components/public/ContactBand";
import { getContactInfo } from "@/lib/contact";
import ApplyForm from "./ApplyForm";

export const metadata: Metadata = {
  title: "Apply Now | Musawo Training Center",
  description:
    "Apply for a healthcare training course at Musawo Training Center. November 2026 intake. Hybrid and online classes with 70% hands-on practicals.",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const preselectedSlug = typeof searchParams.course === "string" ? searchParams.course : undefined;

  const [courses, intakeLabel, contact] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, category: true, durationMonths: true },
      orderBy: { createdAt: "asc" },
    }),
    getSetting("intake.currentLabel", "November 2026"),
    getContactInfo(),
  ]);

  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/training-session.webp"
        imageAlt="Healthcare training session at Musawo Training Center skills lab"
        title="Apply Now"
        description={`Submit your application for the ${intakeLabel} intake. Our Academic Registrar will review your application and send you a secure account link within 3 to 5 working days.`}
        breadcrumbs={[{ label: "Apply" }]}
        boxSide="right"
        objectPosition="center"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Important note */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-8">
          <h2 className="text-base font-bold text-primary mb-2">How applications work</h2>
          <ol className="space-y-2 text-sm text-gray-700 list-none">
            {[
              "Fill in and submit this form. You will receive a confirmation email.",
              "The Academic Registrar reviews your application.",
              "If accepted, the Registrar creates your student account and emails you a secure login link (valid for 7 days).",
              "You confirm your details, set a password and agree to the data consent policy.",
              "Once confirmed, you can log in and complete your enrolment with payment.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <ApplyForm
          courses={courses}
          intakeLabel={intakeLabel}
          preselectedSlug={preselectedSlug}
        />
      </section>

      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
