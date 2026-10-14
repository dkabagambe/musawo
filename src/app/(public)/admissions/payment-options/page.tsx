import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { Smartphone, Building2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Options",
  description: "Pay for your Musawo Training Center course with MTN MoMo, Airtel Money, bank transfer, or card.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Scholarships",         href: "/scholarships" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

const METHODS = [
  {
    icon: Smartphone,
    title: "MTN MoMo",
    badge: "Most popular",
    badgeColor: "bg-yellow-100 text-yellow-800",
    steps: [
      "Dial *165# on your MTN line.",
      "Select Transfer Money, then To Other Number.",
      'Enter the Musawo payment number shown at checkout.',
      "Enter the exact amount shown on your invoice.",
      "Enter your MoMo PIN to confirm.",
      "You will receive an SMS confirmation. Forward it to info@musawo.ug.",
    ],
    note: "Payments are confirmed automatically within 5 minutes.",
  },
  {
    icon: Smartphone,
    title: "Airtel Money",
    badge: "Available",
    badgeColor: "bg-red-50 text-red-700",
    steps: [
      "Dial *185# on your Airtel line.",
      "Select Send Money, then To Other Network.",
      "Enter the Musawo payment number shown at checkout.",
      "Enter the exact amount shown on your invoice.",
      "Enter your Airtel Money PIN to confirm.",
      "Forward the confirmation SMS to info@musawo.ug.",
    ],
    note: "Cross-network transfers may take up to 10 minutes.",
  },
  {
    icon: Building2,
    title: "Bank transfer",
    badge: "Available",
    badgeColor: "bg-blue-50 text-blue-700",
    steps: [
      "Request our bank account details by emailing info@musawo.ug or asking on WhatsApp.",
      "Transfer the exact invoice amount. Include your full name and course in the reference.",
      "Email the transfer receipt to info@musawo.ug.",
      "Allow 1 to 2 working days for confirmation.",
    ],
    note: "Bank transfers are confirmed manually by our accounts team.",
  },
  {
    icon: CreditCard,
    title: "Card or online",
    badge: "Available",
    badgeColor: "bg-primary/10 text-primary",
    steps: [
      "At checkout, select Pay by card.",
      "You will be redirected to our secure payment gateway (Pesapal or Flutterwave).",
      "Enter your card details and complete the payment.",
      "Your enrolment is confirmed instantly on payment success.",
    ],
    note: "We accept Visa, Mastercard, and most prepaid cards issued in Uganda.",
  },
];

export default async function PaymentOptionsPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/images/hero-about.webp"
        imageAlt="Mobile money payment for Musawo Training Center course"
        title="Payment Options"
        description="Pay with MTN MoMo, Airtel Money, bank transfer, or card. All payments are secure and confirmed within minutes."
        breadcrumbs={[
          { label: "Admissions", href: "/admissions/how-to-enrol" },
          { label: "Payment options" },
        ]}
        boxSide="right"
        objectPosition="left center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Admissions" items={ADMISSIONS_NAV} />

          <div className="flex-1 min-w-0">
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Secure payments</p>
              <h2
                className="mt-2 mb-3 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                How to pay for your course
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Choose the method that works best for you. All payments go through our secure checkout or directly to our registered accounts.
              </p>
            </AnimateIn>

            <StaggerGrid className="grid sm:grid-cols-2 gap-6">
              {METHODS.map(({ icon: Icon, title, badge, badgeColor, steps, note }) => (
                <div
                  key={title}
                  className="bg-white rounded-2xl border border-border p-6 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
                      {badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary text-base mb-4">{title}</h3>
                  <ol className="space-y-2 list-none flex-1">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
                        <span className="text-accent font-extrabold flex-shrink-0 tracking-widest" style={{ minWidth: "1.2rem" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {note && (
                    <div className="mt-4 flex items-start gap-2 bg-surface rounded-xl p-3">
                      <AlertCircle className="w-3.5 h-3.5 text-primary/60 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs text-gray-500 leading-relaxed">{note}</p>
                    </div>
                  )}
                </div>
              ))}
            </StaggerGrid>

            {/* Important notes */}
            <AnimateIn className="mt-10">
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8">
                <h3 className="font-bold text-primary mb-4">Important notes</h3>
                <ul className="space-y-3 list-none">
                  {[
                    "Always use the exact amount shown on your invoice. Short payments will not unlock course access.",
                    "Your place is not confirmed until payment is received and verified by our team.",
                    "If you pay by mobile money and do not receive confirmation within 15 minutes, contact us on WhatsApp.",
                    "Receipts are sent to your registered email address. Check your spam folder if you do not see it.",
                    "Refund requests are handled under our Refund Policy. See the link in the footer.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Pay in minutes, start learning today."
        subheading="MTN MoMo or Airtel Money - no bank account needed."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
