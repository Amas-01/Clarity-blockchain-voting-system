"use client";

import Link from "next/link";
import { Election } from "@/hooks/use-election";
import { ChevronRight, Calendar, User, Clock } from "lucide-react";

interface ElectionCardProps {
  election: Election;
}

const PHASE_LABELS = ["Registration", "Voting", "Tallying", "Completed"];
const PHASE_COLORS = [
  "text-green-400 bg-green-400/10",
  "text-amber-400 bg-amber-400/10",
  "text-blue-400 bg-blue-400/10",
  "text-gray-400 bg-gray-400/10",
];

export default function ElectionCard({ election }: ElectionCardProps) {
  return (
    <Link 
      href={`/election/${election.id}`}
      className="group block border border-border p-6 hover:border-accent/40 transition-all hover:accent-glow bg-background/40"
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider ${PHASE_COLORS[election.phase]}`}>
            {PHASE_LABELS[election.phase]}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">ID: #{election.id}</span>
        </div>

        <h3 className="text-xl font-serif mb-2 group-hover:text-accent transition-colors">
          {election.name}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
          {election.description}
        </p>

        <div className="space-y-2 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <User size={14} className="text-accent/60" />
            <span>Admin: {election.admin.slice(0, 6)}...{election.admin.slice(-4)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Clock size={14} className="text-accent/60" />
            <span>Ends at: {election.votingDeadline}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 text-[10px] font-mono text-accent uppercase tracking-[0.2em] font-bold group-hover:translate-x-1 transition-transform">
          View_Election <ChevronRight size={14} />
        </div>
      </div>
    </Link>
  );
}
