"use client";

import { Trophy, CheckCircle2 } from "lucide-react";

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
    <div
      onClick={onClick}
      className={`relative border p-6 transition-all duration-300 group ${
        isSelected ? "border-[#D4A017] bg-[#D4A017]/5 shadow-[0_4px_24px_rgba(212,160,23,0.15)]" : "border-border bg-surface"
      } ${
        isWinner ? "ring-2 ring-[#D4A017]/40" : ""
      } ${
        onClick ? "cursor-pointer hover:border-[#D4A017]/40" : ""
      }`}
    >
      {isWinner && (
        <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-[#0A0C0F] border border-[#D4A017] px-3 py-1 rounded-full z-10 animate-bounce">
           <Trophy size={14} className="text-[#D4A017]" />
           <span className="font-mono text-[10px] text-[#D4A017] uppercase tracking-widest font-bold">Winner</span>
        </div>
      )}

      {isSelected && !isWinner && (
        <div className="absolute top-4 right-4">
           <CheckCircle2 size={24} className="text-[#D4A017]" />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-4">
           <span className="font-mono text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
             {id}
           </span>
           <h3 className="font-serif text-2xl uppercase tracking-tighter leading-none group-hover:text-accent transition-colors">
             {name}
           </h3>
        </div>
        
        <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-lg">
          {description}
        </p>

        <div className="pt-4 border-t border-border flex justify-between items-center">
           {votes !== undefined ? (
             <span className="font-mono text-sm text-accent font-bold uppercase tracking-tight">
                {votes.toLocaleString()} VOTES_TALLIED
             </span>
           ) : (
             <span className="font-mono text-[10px] text-muted-foreground italic uppercase opacity-50 tracking-tighter">
                Votes_Hidden_During_Window
             </span>
           )}
           <div className="w-12 h-[1px] bg-border group-hover:w-20 group-hover:bg-accent transition-all duration-1000" />
        </div>
      </div>
    </div>
  );
}
