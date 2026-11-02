"use client";

import { m, useReducedMotion } from "framer-motion";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function StaggerGrid({ children, className, delay = 0 }: StaggerGridProps) {
  const reduced = useReducedMotion();

  // No animation on reduced-motion: render static grid, content immediately visible.
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px", amount: 0.1 }}
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
        : (
          <m.div variants={itemVariants} suppressHydrationWarning>
            {children}
          </m.div>
        )}
    </m.div>
  );
}
