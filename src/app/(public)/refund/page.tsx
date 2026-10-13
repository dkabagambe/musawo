import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Musawo Training Center's refund and cancellation policy for course enrolments.",
};

const LAST_UPDATED = "1 October 2026";

const SCENARIOS = [
  {
    icon: CheckCircle,
    iconClass: "text-success",
    bgClass: "bg-success/10",
    title: "Full refund",
    condition: "Withdrawal before the course start date",
    detail: "If you cancel your enrolment at least 24 hours before the course start date, you are entitled to a full refund of all fees paid.",
  },
  {
    icon: Clock,
    iconClass: "text-warning",
    bgClass: "bg-warning/10",
    title: "Partial refund",
    condition: "Withdrawal within the first two weeks",
    detail: "If you withdraw within the first two weeks of the course start date, you may be eligible for a 50% refund of the total course fee, minus any payment processing charges.",
  },
  {
    icon: XCircle,
    iconClass: "text-danger",
    bgClass: "bg-danger/10",
    title: "No refund",
    condition: "Withdrawal after two weeks",
    detail: "After the first two weeks of the course, no refund is available. You will retain access to the course content for the remainder of your access period.",
  },
];

export default function RefundPage() {
  return (
    <div className="bg-surface">
      <PageHero
        title="Refund Policy"
        description="Our fair and transparent policy for course cancellations and refunds."
        breadcrumbs={[{ label: "Refund Policy" }]}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          {SCENARIOS.map(({ icon: Icon, iconClass, bgClass, title, condition, detail }) => (
            <div key={title} className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-primary text-sm mb-1">{title}</p>
                <p className="text-xs font-semibold text-gray-500 mb-2">{condition}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed policy */}
        <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

          <PolicySection title="Instalment plans">
            <p>
              If you are on an instalment plan and choose to withdraw, refunds apply only to amounts already paid and are calculated
              based on the timing of your withdrawal as described above. Outstanding instalments are cancelled upon confirmed withdrawal —
              you will not be charged future instalments after your withdrawal is processed.
            </p>
          </PolicySection>

          <PolicySection title="Technical issues">
            <p>
              If you are unable to access the Platform due to a technical issue on our side and we cannot resolve it within 7 days,
              you are entitled to a full refund regardless of how far into the course you are. Please contact us within 48 hours of
              experiencing the issue to be eligible under this provision.
            </p>
          </PolicySection>

          <PolicySection title="Course cancellation by MTC">
            <p>
              In the rare event that Musawo Training Center cancels a course before its start date, you will receive a full refund
              within 14 working days. We will notify you by email and SMS as soon as possible.
            </p>
          </PolicySection>

          <PolicySection title="Scholarships">
            <p>
              Scholarship and subsidised places are non-refundable and non-transferable. If a scholarship recipient withdraws,
              the scholarship is forfeited and cannot be reapplied to a future intake.
            </p>
          </PolicySection>

          <PolicySection title="How to request a refund">
            <p>To request a refund:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Email <a href="mailto:info@musawo.ug" className="text-accent hover:underline no-underline">info@musawo.ug</a> with the subject line <strong>&ldquo;Refund Request — [Your Full Name]&rdquo;</strong>.</li>
              <li>Include your student ID or the email address used to register, the course name, and the reason for withdrawal.</li>
              <li>We will acknowledge your request within 1 business day and process eligible refunds within 7–14 working days.</li>
            </ol>
            <p className="mt-3">
              Refunds are returned to the original payment method. Mobile money refunds are typically processed within 3–5 working days
              after approval; bank transfers may take up to 14 working days.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              For any questions about this policy, contact our admissions team:
            </p>
            <address className="not-italic mt-2">
              <a href="mailto:info@musawo.ug" className="text-accent no-underline hover:underline">info@musawo.ug</a>
              {" "}·{" "}
              <a href="https://wa.me/256785423523" target="_blank" rel="noopener noreferrer" className="text-accent no-underline hover:underline">WhatsApp</a>
            </address>
          </PolicySection>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link href="/terms"   className="text-accent no-underline hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="text-accent no-underline hover:underline">Privacy Policy</Link>
          <Link href="/contact" className="text-accent no-underline hover:underline">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-primary mb-2">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
