'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'Do the courses come with a certificate?',
    a: 'Yes. Every Musawo Training Center course ends with a digital certificate that has a unique ID and QR code. Employers can scan the QR code to verify it online instantly.' },
  { q: 'How do I pay?',
    a: 'You can pay with MTN Mobile Money, Airtel Money, or a bank transfer. Flexible instalment payment plans are available so you can spread the cost across the course.' },
  { q: 'Can I study on a basic smartphone?',
    a: 'Yes. The platform is designed for mobile connections. Content loads fast and lesson notes can be downloaded for offline reading.' },
  { q: 'How long does each course take?',
    a: 'Courses run from 1 month to 3 months. Basic Life Support and Advanced Life Support are 1 month. Babysitting and Childcare is 2 months. All nursing care and mental health courses are 3 months.' },
  { q: 'Are the classes really hands-on?',
    a: 'Yes. 70% of each course is hands-on practicals in our skills lab in Kampala. The remaining 30% is online classes and self-study that you can do on your phone from anywhere.' },
  { q: 'Who teaches the courses?',
    a: 'All courses are taught by qualified doctors, nurses and clinicians. Content is reviewed and approved by the Principal before it is published.' },
  { q: 'Who can apply?',
    a: 'Most courses are open to all, including PLE leavers, S.4 and S.6 leavers, working carers, teachers and community workers. Medical Home Care and Advanced Life Support require a professional nursing, midwifery or clinical officer qualification.' },
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
