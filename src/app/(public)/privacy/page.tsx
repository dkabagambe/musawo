import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { getContactInfo } from "@/lib/contact";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Musawo Training Center collects, uses and protects your personal information.",
};

const LAST_UPDATED = "1 October 2026";

export default async function PrivacyPage() {
  const contact = await getContactInfo();
  return (
    <div className="bg-surface">
      <PageHero
        title="Privacy Policy"
        description="How we collect, use, and protect your personal information."
        breadcrumbs={[{ label: "Privacy Policy" }]}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10">

            <PolicySection title="1. Who we are">
              <p>
                Musawo Training Center (&ldquo;MTC&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a division of Allied Doctors and Friends of Uganda (ADFA),
                Plot 5 ADFA Building, Luggala Trading Center, Lubaga Division, Kampala, Uganda. We operate the online learning platform at{" "}
                <strong>www.musawo.ug</strong> (the &ldquo;Platform&rdquo;).
              </p>
              <p>
                We are committed to protecting the personal information of our students, visitors, and partners.
                This policy explains what data we collect, why we collect it, and how we protect it.
              </p>
            </PolicySection>

            <PolicySection title="2. Information we collect">
              <p>We collect the following categories of personal data:</p>
              <ul>
                <li><strong>Account data</strong>: name, email address, phone number, and password (stored as a secure hash) when you register.</li>
                <li><strong>Payment data</strong>: mobile money number, transaction reference, and payment status. We do not store full card numbers; payments are processed by Pesapal or Flutterwave.</li>
                <li><strong>Learning data</strong>: course progress, lesson completion, quiz scores, and certificate records.</li>
                <li><strong>Communications</strong>: messages you send via our contact form, WhatsApp, or email.</li>
                <li><strong>Technical data</strong>: IP address, browser type, device type, and pages visited, collected automatically via server logs and cookies.</li>
              </ul>
            </PolicySection>

            <PolicySection title="3. How we use your information">
              <p>We use your personal data to:</p>
              <ul>
                <li>Create and manage your student account.</li>
                <li>Process enrolments and payments.</li>
                <li>Deliver course content, track progress, and issue certificates.</li>
                <li>Send transactional emails and SMS (enrolment confirmations, payment receipts, exam reminders).</li>
                <li>Respond to enquiries submitted via our contact form or WhatsApp.</li>
                <li>Improve the Platform through aggregated, anonymised analytics.</li>
                <li>Comply with our legal obligations under Ugandan law.</li>
              </ul>
              <p>
                We do <strong>not</strong> sell or rent your personal data to third parties.
              </p>
            </PolicySection>

            <PolicySection title="4. Legal basis for processing">
              <p>We process personal data on the following grounds:</p>
              <ul>
                <li><strong>Contract performance</strong>: processing necessary to deliver the courses you have enrolled in.</li>
                <li><strong>Legitimate interests</strong>: platform security, fraud prevention, and service improvement.</li>
                <li><strong>Consent</strong>: where you have opted in to marketing communications.</li>
                <li><strong>Legal obligation</strong>: where required by Ugandan law or regulatory bodies.</li>
              </ul>
            </PolicySection>

            <PolicySection title="5. Cookies">
              <p>
                We use essential cookies to keep you logged in and to remember your session preferences. We do not use third-party advertising cookies.
                You can disable cookies in your browser settings, but some platform features (such as staying logged in) will not work without them.
              </p>
            </PolicySection>

            <PolicySection title="6. Data sharing">
              <p>We share personal data only with:</p>
              <ul>
                <li><strong>Payment processors</strong>: Pesapal Ltd and Flutterwave Inc, for the purpose of processing your payments.</li>
                <li><strong>Communication providers</strong>: Resend (email) and Africa&apos;s Talking (SMS), for sending transactional messages.</li>
                <li><strong>Video hosting</strong>: Bunny.net, for streaming course videos securely.</li>
                <li><strong>Cloud storage</strong>: Cloudflare R2, for storing course files and resources.</li>
                <li><strong>Regulatory bodies</strong>: Government bodies in Uganda, where required by law or for compliance purposes.</li>
              </ul>
              <p>
                All third-party processors are contractually required to protect your data and to use it only for the stated purpose.
              </p>
            </PolicySection>

            <PolicySection title="7. Data retention">
              <p>
                We retain your account data for as long as your account is active. If you request deletion of your account, we will remove your personal
                information within 30 days, except where we are required to keep it for legal or regulatory reasons (for example, payment records for tax purposes).
              </p>
              <p>
                Certificate records are retained indefinitely to allow future verification of your qualification.
              </p>
            </PolicySection>

            <PolicySection title="8. Security">
              <p>
                We protect your data using industry-standard measures including TLS encryption in transit, encrypted storage, hashed passwords,
                and access controls that limit who within MTC can view your personal information. We conduct regular security reviews.
              </p>
            </PolicySection>

            <PolicySection title="9. Your rights">
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access</strong>: request a copy of the personal data we hold about you.</li>
                <li><strong>Correction</strong>: ask us to correct inaccurate data.</li>
                <li><strong>Deletion</strong>: request that we delete your account and personal data.</li>
                <li><strong>Portability</strong>: receive your data in a structured, machine-readable format.</li>
                <li><strong>Objection</strong>: object to processing based on legitimate interests.</li>
                <li><strong>Withdraw consent</strong>: where processing is based on consent, withdraw it at any time.</li>
              </ul>
              <p>
                To exercise any of these rights, email us at{" "}
                <a href={`mailto:${contact.email}`} className="text-accent no-underline hover:underline">{contact.email}</a>.
              </p>
            </PolicySection>

            <PolicySection title="10. Changes to this policy">
              <p>
                We may update this policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at the top of this page
                and, where the changes are significant, notify you by email.
              </p>
            </PolicySection>

            <PolicySection title="11. Contact us">
              <p>
                For any questions about this Privacy Policy, please contact:
              </p>
              <address className="not-italic text-gray-600 text-sm leading-relaxed mt-2">
                Musawo Training Center - ADFA<br />
                Plot 5, ADFA Building, Luggala Trading Center, Lubaga Division<br />
                Kampala, Uganda<br />
                <a href={`mailto:${contact.email}`} className="text-accent no-underline hover:underline">{contact.email}</a>
              </address>
            </PolicySection>

          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
            <Link href="/terms"  className="text-accent no-underline hover:underline">Terms of Service</Link>
            <Link href="/refund" className="text-accent no-underline hover:underline">Refund Policy</Link>
            <Link href="/contact" className="text-accent no-underline hover:underline">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-primary mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
