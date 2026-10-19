'use client';

import { m } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function StaggerGrid({ children, className, delay = 0 }: StaggerGridProps) {
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ delay }}
      className={className}
      suppressHydrationWarning
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <m.div key={i} variants={itemVariants} suppressHydrationWarning>
              {child}
            </m.div>
          ))
        : <m.div variants={itemVariants} suppressHydrationWarning>{children}</m.div>}
    </m.div>
  );
}
