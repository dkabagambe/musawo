'use client';

import { useState } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'Are the courses nationally recognised?',   a: "Yes. All Musawo Training Center courses are fully accredited by Uganda's Ministry of Health and Ministry of Education and Sports." },
  { q: 'How do I pay?',                             a: 'You can pay with MTN Mobile Money, Airtel Money, a bank card, or a bank transfer. Instalment payment plans are available on all courses.' },
  { q: 'Can I study on a basic smartphone?',        a: 'Yes. The platform is designed for low-data mobile connections. Content loads fast, and lesson notes can be downloaded for offline reading.' },
  { q: 'Are scholarships available?',               a: 'Yes. A limited number of subsidised and full scholarship places are allocated each intake. Apply when you register.' },
  { q: 'How long does each course take?',           a: 'Courses range from 6 to 12 weeks. You study at your own pace alongside live classes twice a week.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <LazyMotion features={domAnimation}>
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
              animate={{ height: 'auto', opacity: 1 }}
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
    </LazyMotion>
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
