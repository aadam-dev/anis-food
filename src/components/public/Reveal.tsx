"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * On-scroll reveal used across the public site, so every section enters the same
 * considered way — a short rise and fade, once, as it comes into view. Mirrors
 * the reference site's Reveal so the whole page reads as one piece.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
