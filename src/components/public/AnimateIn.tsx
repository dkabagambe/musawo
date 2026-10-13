'use client';

import { LazyMotion, domAnimation, m } from 'framer-motion';

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimateIn({ children, delay = 0, className }: AnimateInProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        className={className}
        suppressHydrationWarning
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
