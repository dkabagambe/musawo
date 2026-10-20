import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { getContactInfo } from "@/lib/contact";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions governing your use of the Musawo Training Center learning platform.",
};

const LAST_UPDATED = "1 October 2026";

export default async function TermsPage() {
  const contact = await getContactInfo();
  return (
    <div className="bg-surface">
      <PageHero
        title="Terms of Service"
        description="The terms and conditions governing your use of the Musawo Training Center platform."
        breadcrumbs={[{ label: "Terms of Service" }]}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10">

            <TermsSection title="1. Acceptance of terms">
              <p>
                By accessing or using the Musawo Training Center platform (&ldquo;Platform&rdquo;) at{" "}
                <strong>www.musawo.ug</strong>, you agree to be bound by these Terms of Service.
                If you do not agree, please do not use the Platform.
              </p>
              <p>
                The Platform is operated by Allied Doctors and Friends of Uganda (ADFA), trading as Musawo Training Center
                (&ldquo;MTC&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), Plot 5 ADFA Building, Luggala Trading Center, Lubaga Division, Kampala, Uganda.
              </p>
            </TermsSection>

            <TermsSection title="2. Eligibility">
              <p>
                You must be at least 16 years old to create an account. By registering, you confirm that the information you provide is accurate,
                complete, and up to date. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </TermsSection>

            <TermsSection title="3. Enrolment and access">
              <p>
                Access to paid course content is granted upon receipt of full payment or the required instalment deposit.
                Your access is personal and non-transferable. You may not share your login credentials or provide access to any other person.
              </p>
              <p>
                Course access remains active for the duration of the course plus six (6) months from the original enrolment date,
                unless otherwise stated on the course page.
              </p>
            </TermsSection>

            <TermsSection title="4. Fees and payment">
              <p>
                All fees are displayed in Ugandan Shillings (UGX) and are inclusive of any applicable taxes. Payments may be made via
                MTN Mobile Money, Airtel Money, bank card, or bank transfer through our authorised payment processors.
              </p>
              <p>
                Where an instalment plan is selected, subsequent instalments must be paid by the due dates shown in your student dashboard.
                Late payment will restrict access to course content until the outstanding amount is settled.
              </p>
              <p>
                For refund terms, please see our <Link href="/refund" className="text-accent no-underline hover:underline">Refund Policy</Link>.
              </p>
            </TermsSection>

            <TermsSection title="5. Acceptable use">
              <p>You agree not to:</p>
              <ul>
                <li>Copy, redistribute, or resell any course content, videos, or materials without written permission from MTC.</li>
                <li>Use the Platform to harass, abuse, or harm other students or staff.</li>
                <li>Attempt to circumvent any security, access control, or digital rights management measures.</li>
                <li>Use automated tools (bots, scrapers) to access or collect data from the Platform.</li>
                <li>Upload or transmit malicious code, spam, or unlawful content.</li>
                <li>Impersonate any person or misrepresent your identity or affiliation.</li>
              </ul>
              <p>
                Violation of these rules may result in immediate suspension or termination of your account without refund.
              </p>
            </TermsSection>

            <TermsSection title="6. Intellectual property">
              <p>
                All course content, including videos, notes, assessments, images, and software - is the intellectual property of MTC or its licensors
                and is protected by Ugandan and international copyright law. You are granted a limited, non-exclusive, non-transferable licence to
                access and view the content solely for your own personal, non-commercial study.
              </p>
            </TermsSection>

            <TermsSection title="7. Certificates">
              <p>
                A certificate of completion is issued when you satisfy all assessment requirements for a course. Certificates include a unique ID and
                QR code for verification. MTC reserves the right to revoke a certificate where there is evidence of academic dishonesty.
              </p>
              <p>
                MTC will notify students if the status of any course changes in a way that affects certificates already issued.
              </p>
            </TermsSection>

            <TermsSection title="8. Limitation of liability">
              <p>
                To the maximum extent permitted by law, MTC is not liable for any indirect, incidental, or consequential loss arising from your use of
                the Platform, including loss of data, loss of income, or failure to obtain employment after certification.
              </p>
              <p>
                MTC&apos;s total liability for any claim arising from these Terms shall not exceed the fees you paid for the relevant course.
              </p>
            </TermsSection>

            <TermsSection title="10. Platform availability">
              <p>
                We aim for high availability but do not guarantee uninterrupted access to the Platform. We may perform scheduled maintenance with advance
                notice posted on the Platform. We are not liable for any loss caused by downtime.
              </p>
            </TermsSection>

            <TermsSection title="11. Governing law">
              <p>
                These Terms are governed by the laws of the Republic of Uganda. Any disputes shall be subject to the exclusive jurisdiction of the courts of Uganda.
              </p>
            </TermsSection>

            <TermsSection title="12. Changes to these terms">
              <p>
                We may update these Terms from time to time. Continued use of the Platform after the updated Terms are posted constitutes acceptance
                of the new Terms. We will notify registered students by email of any material changes.
              </p>
            </TermsSection>

            <TermsSection title="13. Contact">
              <p>For questions about these Terms, contact us at:</p>
              <address className="not-italic text-gray-600 text-sm leading-relaxed mt-2">
                Musawo Training Center - ADFA<br />
                Plot 5, ADFA Building, Luggala Trading Center, Lubaga Division<br />
                Kampala, Uganda<br />
                <a href={`mailto:${contact.email}`} className="text-accent no-underline hover:underline">{contact.email}</a>
              </address>
            </TermsSection>

          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-accent no-underline hover:underline">Privacy Policy</Link>
            <Link href="/refund"  className="text-accent no-underline hover:underline">Refund Policy</Link>
            <Link href="/contact" className="text-accent no-underline hover:underline">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-primary mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
