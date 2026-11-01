"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full gap-4 px-6 py-4 text-left font-semibold text-primary text-sm hover:bg-surface/60 transition-colors"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <m.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
          suppressHydrationWarning
        >
          <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
            suppressHydrationWarning
          >
            <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-border pt-4">
              {a}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomeFaq() {
  return (
    <div className="space-y-3">
      {FAQS.map((faq) => (
        <FaqItem key={faq.q} q={faq.q} a={faq.a} />
      ))}
    </div>
  );
}
