"use client";

import { motion } from "framer-motion";

/**
 * One heading treatment for every section on the public site, so they read as a
 * single, considered piece rather than six slightly different takes.
 *
 * The elevation over the old ad-hoc headings is deliberate and small: a
 * letter-spaced eyebrow flanked by a short rule, a tight display title, and an
 * optional highlight rendered in Playfair *italic* — a serif accent against the
 * bold sans that lends the editorial feel of the reference site without giving
 * up Anis's energy or its red.
 */
export default function SectionHeading({
  eyebrow,
  title,
  highlight,
  subtitle,
  align = "center",
  tone = "dark",
}: {
  eyebrow: string;
  title: string;
  /** Rendered after the title, in Playfair italic + brand red. */
  highlight?: string;
  subtitle?: string;
  align?: "center" | "left";
  /** "light" for use on dark backgrounds. */
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";
  const alignments =
    align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col ${alignments} ${align === "center" ? "mx-auto" : ""}`}
    >
      <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary-red-ui">
        <span className="h-px w-6 bg-primary-red-ui/50" aria-hidden />
        {eyebrow}
        {align === "center" && <span className="h-px w-6 bg-primary-red-ui/50" aria-hidden />}
      </span>

      <h2
        className={`mt-4 font-heading font-extrabold tracking-tight text-[clamp(1.9rem,1.3rem+2.4vw,3.25rem)] leading-[1.05] ${
          isLight ? "text-white" : "text-neutral-black"
        }`}
      >
        {title}
        {highlight && (
          <>
            {" "}
            <span className="display-font italic font-medium text-primary-red">{highlight}</span>
          </>
        )}
      </h2>

      {subtitle && (
        <p
          className={`mt-4 max-w-2xl text-base leading-relaxed ${
            isLight ? "text-white/70" : "text-neutral-gray"
          }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
