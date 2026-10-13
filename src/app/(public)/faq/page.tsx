"use client";

import PageHero from "@/components/public/PageHero";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    category: "Courses & Learning",
    items: [
      { q: "Are the courses nationally recognised?",    a: "Yes. All Musawo Training Center courses are fully accredited by Uganda's Ministry of Health and Ministry of Education and Sports. Your certificate carries the same weight as any government-recognised qualification." },
      { q: "Can I study on a basic smartphone?",         a: "Yes. The platform is designed for low-data mobile connections. Videos load at low quality by default, lesson notes can be downloaded for offline reading, and the interface works on any Android or iOS device." },
      { q: "How long does each course take?",            a: "Courses range from 6 to 12 weeks. You study at your own pace alongside live online classes twice a week with your tutor." },
      { q: "What happens if I miss a live class?",       a: "All live classes are recorded. You can watch the recording within 48 hours of the class time. Attendance is tracked but missing one or two classes will not block your progress." },
      { q: "Do I need any prior qualifications?",        a: "No prior qualifications are required for our entry-level courses. A basic ability to read and write in English is helpful. Our admissions team is happy to advise if you are unsure." },
    ],
  },
  {
    category: "Payments & Fees",
    items: [
      { q: "How do I pay?",                              a: "You can pay with MTN Mobile Money, Airtel Money, a debit or credit card, or a bank transfer. Instalment payment plans are available on all courses — pay 25% to start, then the remainder in two further instalments." },
      { q: "Are scholarships available?",                a: "Yes. A limited number of subsidised and full scholarship places are allocated each intake for learners who cannot afford the full fee. Apply when you register and our admissions team will follow up." },
      { q: "What is your refund policy?",                a: "If you withdraw before the course start date you are entitled to a full refund. After the start date, a partial refund may be available depending on how much of the course has been completed. See our Refund Policy page for full details." },
      { q: "Can I pay in instalments?",                  a: "Yes. Every course offers an instalment plan. You pay a 25% deposit to confirm your place, then the remainder in two further instalments — each unlocking the next block of course content." },
    ],
  },
  {
    category: "Certificates & Careers",
    items: [
      { q: "What does my certificate look like?",        a: "You receive a digital certificate with a unique ID and QR code that anyone can scan to verify its authenticity. A printable version is also available for download." },
      { q: "Will you help me find work after I graduate?", a: "Yes. Musawo maintains a network of healthcare employers in Kampala and supports graduates with job placement. You also gain access to the alumni community after graduation." },
      { q: "Can I do further study after completing a course?", a: "Yes. Completing a Musawo course gives you a strong foundation for higher nursing qualifications. Our tutors can advise on progression pathways to diploma and degree programs." },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full gap-4 px-6 py-4 text-left font-semibold text-primary text-sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-border pt-4">
          {a}
        </p>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="bg-surface">
      <PageHero
        image="/assets/images/hero-faq-scholarships.webp"
        imageAlt="ADFA community outreach event in Uganda"
        title="Frequently Asked Questions"
        description="Everything you need to know about our courses, payments, and certificates."
        breadcrumbs={[{ label: "FAQ" }]}
        boxSide="right"
        objectPosition="left center"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {FAQS.map((section) => (
          <div key={section.category} className="mb-12">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-accent rounded-full inline-block" aria-hidden="true" />
              {section.category}
            </h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="bg-primary rounded-2xl p-8 text-center text-white mt-8">
          <p className="font-bold text-lg mb-2">Still have questions?</p>
          <p className="text-white/70 text-sm mb-5">Our admissions team is on WhatsApp Monday–Saturday, 8 am–6 pm.</p>
          <a href="https://wa.me/256785423523" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-6 py-2.5 rounded-xl no-underline transition-colors shadow-cta text-sm">
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
