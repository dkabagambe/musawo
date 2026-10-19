/**
 * FAQ page - server component wrapper so we can fetch contact info
 * and pass the WhatsApp URL down to the client accordion.
 */
import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import { getContactInfo } from "@/lib/contact";
import FaqContent from "./FaqContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Musawo Training Center courses, payments, and certificates.",
};

export default async function FaqPage() {
  const contact = await getContactInfo();
  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/community-outreach.webp"
        imageAlt="ADFA community outreach event in Uganda"
        title="Frequently Asked Questions"
        description="Everything you need to know about our courses, payments, and certificates."
        breadcrumbs={[{ label: "FAQ" }]}
        boxSide="right"
        objectPosition="left center"
      />
      <FaqContent whatsappUrl={contact.whatsappUrl} />
      <CTABand
        heading="Ready to enrol?"
        subheading="All your questions answered. Join the next intake today."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
