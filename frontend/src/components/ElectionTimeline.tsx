"use client";

import { Check, Circle, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface ElectionTimelineProps {
  currentPhase: number;
}

const PHASES = [
  { id: 0, label: "Registration", description: "Candidate entry & Voter enroll" },
  { id: 1, label: "Voting", description: "Salted commitments cast" },
  { id: 2, label: "Tally", description: "Cryptographic reveal window" },
  { id: 3, label: "Completed", description: "Finalized immutable ledger" },
];

export default function ElectionTimeline({ currentPhase }: ElectionTimelineProps) {
  return (
    <div className="py-8">
      <div className="relative flex justify-between">
        {/* Background Line */}
        <div className="absolute top-5 left-0 w-full h-[1px] bg-border z-0" />
        
        {/* Active Progress Line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentPhase / (PHASES.length - 1)) * 100}%` }}
          className="absolute top-5 left-0 h-[1px] bg-accent z-0"
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {PHASES.map((phase, index) => {
          const isCompleted = currentPhase > phase.id;
          const isActive = currentPhase === phase.id;
          const isPending = currentPhase < phase.id;

          return (
            <div key={phase.id} className="relative z-10 flex flex-col items-center group">
              {/* Node */}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  isCompleted 
                    ? "bg-accent border-accent text-background" 
                    : isActive 
                      ? "bg-background border-accent text-accent shadow-[0_0_15px_rgba(212,160,23,0.3)]" 
                      : "bg-background border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check size={18} />
                ) : isActive ? (
                  <Activity size={18} className="animate-pulse" />
                ) : (
                  <span className="font-mono text-xs">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className="mt-4 text-center max-w-[100px]">
                <h5 className={`font-mono text-[10px] uppercase tracking-widest font-bold ${
                  isActive ? "text-accent" : isPending ? "text-muted-foreground/40" : "text-muted-foreground"
                }`}>
                  {phase.label}
                </h5>
                <p className={`hidden md:block font-mono text-[8px] mt-1 leading-tight uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isActive ? "text-accent/60" : "text-muted-foreground/20"
                }`}>
                  {phase.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
