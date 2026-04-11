"use client";

import PhaseBadge from "./PhaseBadge";
import { PHASE_DESCRIPTIONS } from "@/lib/constants";
import { phaseBadgeStyle } from "@/lib/format";
import { motion } from "framer-motion";
import { ChevronRight, Database, Shield } from "lucide-react";
import Link from "next/link";

interface ElectionCardProps {
  id: number;
  name: string;
  description: string;
  phase: number;
}

/**
 * Election summary card with dark civic design and premium animations.
 */
export default function ElectionCard({ id, name, description, phase }: ElectionCardProps) {
  return (
    <Link href={`/election/${id}`}>
      <motion.div
        whileHover={{ y: -5 }}
        className="group relative border border-border bg-surface p-8 transition-premium glass overflow-hidden flex flex-col h-full min-h-[300px]"
      >
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-[50px] -mr-12 -mt-12 group-hover:bg-accent/10 transition-premium" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
           <div className="p-2 border border-border bg-background group-hover:border-accent/40 transition-premium">
              <Shield size={16} className="text-muted-foreground group-hover:text-accent transition-premium" />
           </div>
           <PhaseBadge phase={phase} />
        </div>

        <div className="space-y-4 flex-grow relative z-10">
          <h3 className="font-serif text-3xl uppercase tracking-tighter group-hover:text-accent transition-premium leading-tight text-balance">
            {name}
          </h3>
          <p className="font-mono text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-80 group-hover:opacity-100 transition-premium">
            {description}
          </p>
        </div>

        <div className="mt-auto pt-10 flex items-end justify-between relative z-10">
           <div className="space-y-1">
              <span className="block font-mono text-[9px] text-muted-foreground uppercase tracking-[0.2em] opacity-40">Identity_Reference</span>
              <span className="block font-mono text-[10px] text-foreground font-bold">NODE_0{id} // ADDR_0x...{id}</span>
           </div>
           
           <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-premium">
              <span>View_Ballot</span>
              <ChevronRight size={14} />
           </div>
        </div>

        {/* Bottom border progress accent */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-accent/20 w-0 group-hover:w-full transition-all duration-700 ease-out" />
      </motion.div>
    </Link>
  );
}
