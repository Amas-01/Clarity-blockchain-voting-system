"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useActiveElections } from "@/hooks/useActiveElections";
import { useElection } from "@/hooks/useElection";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import ElectionCard from "@/components/ElectionCard";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, ArrowRight, Activity, ShieldCheck, Database } from "lucide-react";

/**
 * ElectionCardWrapper: Fetches individual election data and renders the ElectionCard.
 */
function ElectionCardWrapper({ id }: { id: number }) {
  const router = useRouter();
  const { election, loading, refresh } = useElection(id);

  if (loading) {
    return (
      <div className="h-[280px] border border-border bg-surface/20 animate-pulse glass" />
    );
  }

  if (!election) {
    return (
      <div className="h-[280px] border border-dashed border-red-500/20 bg-red-500/5 p-8 flex flex-col justify-center items-center text-center space-y-4">
         <Activity size={32} className="text-red-500/40" />
         <div className="space-y-1">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-red-400 font-bold">Sync_Failure</h4>
            <p className="font-mono text-[9px] text-muted-foreground uppercase opacity-60">Record_ID_{id} inaccessable</p>
         </div>
         <button 
           onClick={() => refresh()}
           className="px-4 py-2 border border-border bg-surface hover:border-accent transition-colors font-mono text-[8px] uppercase tracking-widest"
         >
           Retry_Fetch
         </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ElectionCard 
        id={election.id}
        name={election.name}
        description={election.description}
        phase={election.phase}
      />
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const { electionIds, loading, error } = useActiveElections();

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      
      {/* HERO SECTION / DECORATIVE HEADER */}
      <section className="w-full bg-surface border-b border-border py-12">
         <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-start gap-8">
            {[
              "SECURED BY STACKS",
              "COMMIT-REVEAL SCHEME",
              "FULLY ON-CHAIN"
            ].map((chip) => (
              <div key={chip} className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(212,160,23,0.6)]" />
                 <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono font-medium">
                    {chip}
                 </span>
              </div>
            ))}
         </div>
      </section>

      <PageShell 
        title="On-Chain Elections" 
        subtitle="Commit-reveal voting secured by the Stacks blockchain"
      >
        <div className="space-y-16">
          
          {/* ELECTION LIST SECTION */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
               <div className="flex items-center gap-3">
                  <Activity size={18} className="text-accent" />
                  <h2 className="font-serif text-2xl uppercase tracking-tighter">Active Elections</h2>
               </div>
               {electionIds.length > 0 && (
                 <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-40">
                    REGISTRY_COUNT: {electionIds.length.toString().padStart(2, '0')}
                 </span>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                     <div key={i} className="h-[280px] border border-border bg-surface/20 animate-pulse glass" />
                   ))
                ) : error ? (
                   <div className="col-span-full p-12 border border-red-500/20 bg-red-500/5 text-center text-red-400 font-mono text-xs uppercase tracking-widest">
                      {error}
                   </div>
                ) : electionIds.length > 0 ? (
                   electionIds.map((id) => (
                     <ElectionCardWrapper key={id} id={id} />
                   ))
                ) : (
                  <div className="col-span-full py-32 border border-dashed border-border bg-surface/5 flex flex-col items-center justify-center text-center space-y-8">
                     <div className="relative">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/30">
                           <path d="M19 5H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
                           <path d="M12 11V3" />
                           <path d="M7 11V7" />
                           <path d="M17 11V7" />
                        </svg>
                        <div className="absolute inset-0 bg-accent/5 blur-2xl rounded-full" />
                     </div>
                     <div className="space-y-2">
                        <p className="font-serif text-2xl uppercase tracking-tighter text-foreground">No active elections found.</p>
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-60">
                           Are you an admin? Create an election in the Admin Dashboard.
                        </p>
                     </div>
                     <button 
                        onClick={() => router.push("/admin")}
                        className="group flex items-center gap-3 px-8 py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-premium text-[10px] uppercase font-bold tracking-[0.2em]"
                     >
                        Go to Admin Dashboard
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* PROTOCOL PILLARS Overlay */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-border/50">
             {[
               { icon: ShieldCheck, label: "SECURE", text: "Clarity smart contracts ensure immutable protocol rules." },
               { icon: Database, label: "ON-CHAIN", text: "All votes and tallies are recorded publicly on Stacks." },
               { icon: Activity, label: "VERIFIED", text: "Commit-reveal scheme prevents tactical voting bias." }
             ].map((pillar) => (
               <div key={pillar.label} className="space-y-3">
                  <div className="flex items-center gap-3">
                     <pillar.icon size={16} className="text-accent" />
                     <h4 className="font-serif text-lg uppercase tracking-tight">{pillar.label}</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase leading-relaxed opacity-60">
                     {pillar.text}
                  </p>
               </div>
             ))}
          </section>

        </div>
      </PageShell>
    </div>
  );
}
