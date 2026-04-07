"use client";

import { useElections } from "@/hooks/use-elections";
import ElectionCard from "@/components/ElectionCard";
import PageShell from "@/components/PageShell";
import { Vote, ShieldCheck, Database, LayoutGrid } from "lucide-react";

/**
 * Dashboard assembly for all active elections.
 */
export default function Home() {
  const { elections, loading } = useElections();

  return (
    <PageShell 
      title="Elections Dashboard"
      subtitle="View and participate in ongoing secure ballot initiatives on the Stacks blockchain."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          // Skeleton Grids
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 border border-border bg-surface/20 animate-pulse" />
          ))
        ) : elections.length > 0 ? (
          elections.map((election) => (
            <ElectionCard 
              key={election.id} 
              id={election.id}
              name={election.name}
              description={election.description}
              phase={election.phase}
            />
          ))
        ) : (
          <div className="col-span-full py-24 border border-dashed border-border flex flex-col items-center justify-center opacity-40">
             <LayoutGrid size={48} className="mb-4" />
             <p className="font-mono text-sm uppercase tracking-widest text-center">
               No_Active_Elections_Found // SYNC_COMPLETED
             </p>
          </div>
        )}
      </div>

      <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-border">
         <div className="space-y-3">
            <h4 className="font-serif text-lg uppercase tracking-tight text-accent">Distributed_Trust</h4>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Every vote is a cryptographically hashed commitment secured by the Clarity smart contract language.
            </p>
         </div>
         <div className="space-y-3">
            <h4 className="font-serif text-lg uppercase tracking-tight text-accent">Commit-Reveal_Protocol</h4>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Your ballot remains secret until the reveal phase. Only you possess the cryptographic salt needed to count your vote.
            </p>
         </div>
         <div className="space-y-3">
            <h4 className="font-serif text-lg uppercase tracking-tight text-accent">Verified_Outcomes</h4>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Once the reveal window closes, results are tallied automatically on-chain, ensuring absolute transparency.
            </p>
         </div>
      </section>
    </PageShell>
  );
}
