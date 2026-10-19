import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { getSetting } from "@/lib/settings";
import { Smartphone, Building2, CheckCircle, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Options",
  description: "Pay for your Musawo Training Center course with MTN MoMo, Airtel Money or bank transfer.",
};

const ADMISSIONS_NAV = [
  { label: "How to enrol",         href: "/admissions/how-to-enrol" },
  { label: "Fees and instalments", href: "/admissions/fees" },
  { label: "Payment options",      href: "/admissions/payment-options" },
];

export default async function PaymentOptionsPage() {
  const [contact, mtnCode, airtelMerchantId, bankName, bankAccount, bankBranch] = await Promise.all([
    getContactInfo(),
    getSetting("payment.mtnMomoCode",        "582962"),
    getSetting("payment.airtelMerchantId",   "4363108"),
    getSetting("payment.bankName",           "Centenary Bank Uganda"),
    getSetting("payment.bankAccountNumber",  "3100 4423 5678"),
    getSetting("payment.bankBranch",         "Kampala Road Branch"),
  ]);

  const METHODS = [
    {
      icon: Smartphone,
      color: "bg-yellow-50 border-yellow-200",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-700",
      badge: "Most popular",
      badgeColor: "bg-yellow-100 text-yellow-800",
      title: "MTN MoMo",
      steps: [
        `Dial *165*3# on your MTN line, or open the MoMo app.`,
        `Select Pay Bill, then enter code: ${mtnCode}.`,
        "Enter the exact amount shown on your invoice.",
        "Enter your MoMo PIN and confirm.",
        "Keep the SMS confirmation -- you may be asked to share it.",
      ],
      note: `MTN MoMo merchant code: ${mtnCode}. Dial *165*3# or scan the QR code at our office.`,
    },
    {
      icon: Smartphone,
      color: "bg-red-50 border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      badge: "Available",
      badgeColor: "bg-red-50 text-red-700",
      title: "Airtel Money",
      steps: [
        `Dial *185*9# on your Airtel line.`,
        `Select Pay Merchant, then enter merchant ID: ${airtelMerchantId}.`,
        "Enter the exact amount shown on your invoice.",
        "Enter your Airtel Money PIN and confirm.",
        "Keep the SMS confirmation -- you may be asked to share it.",
      ],
      note: `Airtel Money merchant ID: ${airtelMerchantId}. Dial *185*9# or use Airtel Money Pay.`,
    },
    {
      icon: Building2,
      color: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      badge: "Available",
      badgeColor: "bg-blue-50 text-blue-700",
      title: "Bank transfer",
      steps: [
        `Bank: ${bankName}`,
        `Account number: ${bankAccount}`,
        `Branch: ${bankBranch}`,
        "Account name: Musawo Training Center",
        "Use your full name and course as the payment reference.",
        `Email the transfer receipt to admissions@mtc.ac.ug or send on WhatsApp.`,
        "Allow 1 to 2 working days for confirmation.",
      ],
      note: "Bank transfers are verified manually. Please share your receipt so we can confirm quickly.",
    },
  ];

  return (
    <div>
      <PageHero
        image="/assets/training-session.webp"
        imageAlt="Mobile money payment for Musawo Training Center course fees"
        title="Payment Options"
        description="Pay with MTN MoMo, Airtel Money or bank transfer. No card needed. Your place is confirmed as soon as payment is received."
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
              <p className="section-eyebrow">Simple and secure</p>
              <h2 className="mt-2 mb-3 font-bold text-balance" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}>
                How to pay for your course
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                We accept MTN MoMo, Airtel Money and bank transfer. No card needed. All fees are in Uganda Shillings.
              </p>
            </AnimateIn>

            <StaggerGrid className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6">
              {METHODS.map(({ icon: Icon, color, iconBg, iconColor, badge, badgeColor, title, steps, note }) => (
                <div key={title} className={`rounded-2xl border p-6 flex flex-col ${color}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
                      {badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary text-base mb-4">{title}</h3>
                  <ol className="space-y-2.5 list-none flex-1">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="text-accent font-extrabold flex-shrink-0 tracking-widest w-5">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex items-start gap-2 bg-white/70 rounded-xl p-3">
                    <AlertCircle className="w-3.5 h-3.5 text-primary/60 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-xs text-gray-600 leading-relaxed">{note}</p>
                  </div>
                </div>
              ))}
            </StaggerGrid>

            {/* Quick reference codes box */}
            <AnimateIn className="mt-8">
              <div className="bg-primary text-white rounded-2xl p-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">MTN MoMo</p>
                  <p className="text-3xl font-extrabold text-accent tracking-widest">{mtnCode}</p>
                  <p className="text-white/70 text-sm mt-1">Dial *165*3# then Pay Bill</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Airtel Money Merchant</p>
                  <p className="text-3xl font-extrabold text-accent tracking-widest">{airtelMerchantId}</p>
                  <p className="text-white/70 text-sm mt-1">Dial *185*9# then Pay Merchant</p>
                </div>
              </div>
            </AnimateIn>

            <AnimateIn className="mt-8">
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6 sm:p-8">
                <h3 className="font-bold text-primary mb-4">Important notes</h3>
                <ul className="space-y-3 list-none">
                  {[
                    "Always pay the exact amount shown on your invoice. Short payments will not unlock course access.",
                    "Your place is confirmed once payment is received and verified.",
                    "If you pay by mobile money and do not receive confirmation within 15 minutes, contact us on WhatsApp at 0709 184 468.",
                    "Receipts are sent to your registered email address. Check spam if you do not receive one.",
                    "Refund requests are handled under our Refund Policy -- see the link in the footer.",
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
        subheading="MTN MoMo code 582962 or Airtel Money merchant 4363108. No bank account needed."
        primaryLabel="Apply now"
        primaryHref="/apply"
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
