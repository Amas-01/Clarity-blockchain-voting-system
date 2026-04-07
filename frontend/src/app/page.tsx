"use client";

import { useElections } from "@/hooks/use-elections";
import ElectionCard from "@/components/Header"; // Wait, I imported Header by mistake? No, ElectionCard is missing in my thought probably.
// Checking imports.
import ElectionCardComponent from "@/components/ElectionCard";
import { Vote, ShieldCheck, Database } from "lucide-react";

export default function Home() {
  const { elections, loading } = useElections();

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-16 border-l-4 border-accent pl-8 py-4 bg-accent/5">
        <h1 className="text-5xl font-serif mb-4 tracking-tighter uppercase">
          Digital_Civic_Foundation
        </h1>
        <p className="text-xl text-muted-foreground font-mono max-w-2xl leading-relaxed">
          The official repository for secure, commit-reveal elections on the Stacks blockchain. 
          Encrypted ballots. Verified outcomes. Distributed trust.
        </p>
        
        <div className="flex flex-wrap gap-8 mt-12">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-accent" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Encrypted_Ballots</span>
          </div>
          <div className="flex items-center gap-3">
            <Database size={20} className="text-accent" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Clarity_Verified</span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-8 border-b border-border pb-4">
          <h2 className="text-2xl font-serif uppercase tracking-tight">Active_Elections</h2>
          <span className="text-xs font-mono text-muted-foreground">COUNT: {elections.length}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 border border-border bg-border/20 animate-pulse" />
            ))}
          </div>
        ) : elections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map((election) => (
              <ElectionCardComponent key={election.id} election={election} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-border rounded-lg">
            <p className="font-mono text-muted-foreground uppercase tracking-widest">No_Active_Elections_Found</p>
          </div>
        )}
      </section>

      <footer className="mt-24 pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
         <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-foreground rounded-[1px]" />
            <span className="font-serif text-sm">STX_VOTING_PROTOCOL</span>
         </div>
         <p className="text-[10px] font-mono tracking-widest uppercase">
            Built on Stacks // Clarity 3 Ready // ©2026
         </p>
      </footer>
    </div>
  );
}
