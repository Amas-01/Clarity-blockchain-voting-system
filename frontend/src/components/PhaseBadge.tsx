"use client";

import { phaseBadgeStyle } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/constants";

interface PhaseBadgeProps {
  phase: number;
}

/**
 * Standard badge for displaying the current election phase.
 * Handled via Tailwind utility classes for each phase.
 */
export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  const label = PHASE_LABELS[phase] || "Unknown";
  const styling = phaseBadgeStyle(phase);

  return (
    <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-widest font-bold ${styling}`}>
      {label}
    </span>
  );
}
