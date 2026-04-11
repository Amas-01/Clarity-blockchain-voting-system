"use client";

import { Trophy, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface CandidateCardProps {
  id: number;
  name: string;
  description: string;
  votes?: number;
  isWinner?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Visual representation of a candidate for voting or results.
 */
export default function CandidateCard({ 
  id, 
  name, 
  description, 
  votes, 
  isWinner, 
  isSelected, 
  onClick 
}: CandidateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`relative border p-6 transition-all duration-300 group overflow-hidden ${
        isSelected 
          ? "border-accent bg-surface/80 shadow-[0_0_30px_rgba(212,160,23,0.1)]" 
          : "border-border bg-surface hover:border-accent/30"
      } ${
        isWinner ? "ring-1 ring-accent/30" : ""
      } ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Background Accent Gradient */}
      {isSelected && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
      )}

      {isWinner && (
        <div className="absolute top-0 right-0">
          <div className="bg-accent text-background font-mono text-[9px] font-bold px-3 py-1 uppercase tracking-tighter">
            Winner
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-4">
           <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-sm">
                ID_{id.toString().padStart(2, '0')}
              </span>
              <h3 className="font-serif text-2xl uppercase tracking-tighter leading-tight group-hover:text-accent transition-premium">
                {name}
              </h3>
           </div>
           
           {onClick && (
             <div className="shrink-0 pt-1">
               {isSelected ? (
                 <CheckCircle2 size={20} className="text-accent" />
               ) : (
                 <Circle size={20} className="text-border group-hover:text-accent/40" />
               )}
             </div>
           )}
        </div>
        
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="pt-5 border-t border-border flex justify-between items-center">
           {votes !== undefined ? (
             <div className="flex flex-col">
               <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Total_Ballots</span>
               <span className="font-mono text-xl text-accent font-bold lining-nums">
                  {votes.toLocaleString()}
               </span>
             </div>
           ) : (
             <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest italic">
                Ballot_Status: Encrypted
             </span>
           )}
           
           {isWinner && (
             <Trophy size={20} className="text-accent opacity-50" />
           )}
        </div>
      </div>
    </motion.div>
  );
}
