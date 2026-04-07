"use client";

import { useEffect, useState } from "react";
import { fetchCallReadOnlyFunction, cvToJSON } from "@stacks/transactions";
import { getNetwork, CONTRACT_ADDRESS, CONTRACT_NAME } from "@/lib/stacks";
import Link from "next/link";
import { ChevronRight, Calendar, User, Info } from "lucide-react";

export interface ElectionSummary {
  id: number;
  name: string;
  description: string;
  phase: number;
}

export default function ElectionList() {
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      if (!CONTRACT_ADDRESS) {
        setLoading(false);
        return;
      }
      try {
        const network = getNetwork();
        const result = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "get-all-active-elections",
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        });
        const ids = cvToJSON(result).value as any[];
        
        const summaries: ElectionSummary[] = [];
        for (const id of ids) {
          const detailsResult = await fetchCallReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: "get-election-details",
            functionArgs: [id],
            network,
            senderAddress: CONTRACT_ADDRESS,
          });
          const details = cvToJSON(detailsResult).value.value;
          summaries.push({
            id: Number(id.value),
            name: details.name.value,
            description: details.description.value,
            phase: Number(details.phase.value),
          });
        }
        setElections(summaries);
      } catch (e) {
        console.error("Error fetching elections:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  const getPhaseName = (phase: number) => {
    switch (phase) {
      case 0: return "Registration";
      case 1: return "Voting";
      case 2: return "Tallying";
      case 3: return "Completed";
      default: return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 glass rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-2xl border-dashed border-2 border-border/50">
        <div className="max-w-xs mx-auto">
          <Info className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-serif mb-2">
            {!CONTRACT_ADDRESS ? "Configuration Required" : "No Active Elections"}
          </h3>
          <p className="text-sm text-foreground/40 font-mono">
            {!CONTRACT_ADDRESS 
              ? "Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment to synchronize with the blockchain." 
              : "There are currently no active elections to display."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {elections.map((election) => (
        <Link 
          key={election.id} 
          href={`/election/${election.id}`}
          className="group block glass p-6 rounded-2xl hover:border-accent transition-all hover:accent-glow"
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <span className="px-2 py-1 bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono uppercase tracking-widest rounded">
                Phase {election.phase}: {getPhaseName(election.phase)}
              </span>
              <span className="text-[10px] font-mono text-foreground/30">
                EID #{election.id.toString().padStart(3, '0')}
              </span>
            </div>
            
            <h3 className="text-xl font-serif mb-2 group-hover:text-accent transition-colors">
              {election.name}
            </h3>
            
            <p className="text-sm text-foreground/60 line-clamp-2 mb-6 flex-grow font-mono leading-relaxed">
              {election.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-foreground/40 font-mono text-[10px] uppercase tracking-wider">
                <User className="w-3 h-3" />
                Voter Access
              </div>
              <ChevronRight className="w-4 h-4 text-accent/50 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
