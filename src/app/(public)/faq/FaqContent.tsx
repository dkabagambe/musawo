"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "What do I need to study?",
    a: "A smartphone or a laptop. All materials are read or watched inside the platform only, no downloads needed.",
  },
  {
    q: "Are the classes really hands-on?",
    a: "Yes: online classes and physical practical sessions in our skills lab.",
  },
  {
    q: "Who can apply?",
    a: "Each course has its own eligibility criteria. Check the course page for details.",
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

export default function FaqContent({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="space-y-3 mb-12">
        {FAQS.map((item) => (
          <AccordionItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="bg-primary rounded-2xl p-8 text-center text-white mt-8">
        <p className="font-bold text-lg mb-2">Still have questions?</p>
        <p className="text-white/70 text-sm mb-5">Our admissions team is on WhatsApp every day, 8 am to 5 pm.</p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-white font-bold px-6 py-2.5 rounded-xl no-underline transition-colors shadow-cta text-sm"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
