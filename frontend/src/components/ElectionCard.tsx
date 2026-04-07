"use client";

import PhaseBadge from "./PhaseBadge";
import { PHASE_DESCRIPTIONS } from "@/lib/constants";
import { phaseBadgeStyle } from "@/lib/format";

interface ElectionCardProps {
  id: number;
  name: string;
  description: string;
  phase: number;
  onClick?: () => void;
}

/**
 * Election summary card with dark civic design.
 */
export default function ElectionCard({ id, name, description, phase, onClick }: ElectionCardProps) {
  // Extract border color from the badge style (the text-XXX part usually matches the border)
  const styling = phaseBadgeStyle(phase);
  const borderClass = styling.split(" ").find(c => c.startsWith("text-")) || "text-amber-400";
  const bgBorderClass = borderClass.replace("text-", "bg-");

  return (
    <div
      onClick={onClick}
      className={`relative group border border-border bg-surface p-6 transition-all duration-500 overflow-hidden ${
        onClick ? "cursor-pointer hover:shadow-[0_8px_32px_rgba(212,160,23,0.1)] hover:-translate-y-1" : ""
      }`}
    >
      {/* Phase-colored Accent Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bgBorderClass}`} />
      
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-serif text-2xl uppercase tracking-tight group-hover:text-accent transition-colors leading-none">
          {name}
        </h3>
        <PhaseBadge phase={phase} />
      </div>

      <p className="font-mono text-sm text-muted-foreground mb-12 line-clamp-2 leading-relaxed">
        {description}
      </p>

      <div className="flex justify-between items-end">
        <span className="font-mono text-[10px] text-muted-foreground uppercase opacity-60">
          Election #0{id}
        </span>
        <div className="w-8 h-[1px] bg-border group-hover:w-16 group-hover:bg-accent transition-all duration-700" />
      </div>
    </div>
  );
}
