"use client";

import * as m from "motion/react-m";
import type { HTMLMotionProps } from "motion/react";

type FadeInProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/** Fades and lifts content into view once. Honours prefers-reduced-motion via MotionConfig. */
export function FadeIn({ delay = 0, y = 12, ...props }: FadeInProps) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    />
  );
}
