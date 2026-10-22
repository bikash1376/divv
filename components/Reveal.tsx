"use client"
import React from "react";
import { motion } from "motion/react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// One shared scroll-in for the sections under the hero: each fades and lifts a
// little as it enters the viewport, once, so they arrive one after another.
// Sections keep their own natural height — no per-section viewport sizing.
const Reveal = ({
  children,
  className,
  id,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) => (
  <motion.section
    id={id}
    className={className}
    style={style}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.6, ease: EASE_OUT }}
  >
    {children}
  </motion.section>
);

export default Reveal;
