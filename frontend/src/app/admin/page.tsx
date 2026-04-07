"use client";

import { useAdmin } from "@/hooks/use-admin";
import { createElection, addCandidate, startVotingPhase, startTallyPhase, completeElection } from "@/lib/stacks-write";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import PhaseBadge from "@/components/PhaseBadge";
import TransactionStatus from "@/components/TransactionStatus";
import { PlusCircle, UserPlus, RefreshCw, Layers, ShieldCheck, ChevronRight, CheckCircle2 } from "lucide-react";

/**
 * Admin Dashboard for the electoral authority.
 */
export default function AdminPage() {
  const { adminElection, loading, refresh } = useAdmin();
  const elections = adminElection ? [adminElection] : [];
  
  // Transaction states
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Feature selection
  const [activeElectionId, setActiveElectionId] = useState<number | null>(null);

  const handleCreateElection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setTxStatus("pending");
    
    createElection({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      regDeadline: Number(formData.get("regDeadline")),
      votingDeadline: Number(formData.get("votingDeadline")),
      tallyDeadline: Number(formData.get("tallyDeadline")),
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        refresh();
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleAddCandidate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeElectionId) return;
    const formData = new FormData(e.currentTarget);
    setTxStatus("pending");

    addCandidate({
      electionId: activeElectionId,
      candidateName: formData.get("candName") as string,
      candidateDescription: formData.get("candDesc") as string,
      candidateKey: new Uint8Array(33), // Placeholder for protocol-required key
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        refresh();
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  return (
    <PageShell title="Admin Command Center" subtitle="Execute protocol-level controls over the election lifecycle. Requires high-privilege credentials.">
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 items-start">
        
        {/* Left: Control Panels */}
        <div className="space-y-12">
            <section className="border border-border bg-surface p-6 space-y-6">
                <h3 className="font-mono text-sm uppercase tracking-widest text-[#D4A017] border-b border-border pb-3 flex items-center gap-2">
                   <PlusCircle size={16} /> New_Election_Genesis
                </h3>
                <form onSubmit={handleCreateElection} className="space-y-4">
                    <input name="name" required placeholder="Election Title" className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm uppercase tracking-tighter autofill:bg-surface-dark" />
                    <textarea name="description" required placeholder="Objective / Rules Description" className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm h-24" />
                    <div className="grid grid-cols-3 gap-2">
                        <input name="regDeadline" type="number" required placeholder="Reg Block" className="bg-surface-dark border border-border px-2 py-3 font-mono text-[10px]" title="Registration Block Deadline" />
                        <input name="votingDeadline" type="number" required placeholder="Vote Block" className="bg-surface-dark border border-border px-2 py-3 font-mono text-[10px]" title="Voting Block Deadline" />
                        <input name="tallyDeadline" type="number" required placeholder="Tally Block" className="bg-surface-dark border border-border px-2 py-3 font-mono text-[10px]" title="Tally Block Deadline" />
                    </div>
                    <button type="submit" disabled={txStatus === "pending"} className="w-full py-3 bg-[#D4A017] text-black font-mono font-bold uppercase text-xs tracking-widest hover:bg-[#D4A017]/90 active:scale-95 disabled:grayscale">
                       Deploy_Ballot_Contract
                    </button>
                </form>
            </section>

            <section className="border border-border bg-surface p-6 space-y-6">
                <h3 className="font-mono text-sm uppercase tracking-widest text-[#D4A017] border-b border-border pb-3 flex items-center gap-2">
                   <UserPlus size={16} /> Provision_Candidates
                </h3>
                {!activeElectionId ? (
                   <p className="font-mono text-[10px] text-muted-foreground uppercase text-center py-8 italic opacity-40">Select_Election_From_Archive...</p>
                ) : (
                   <form onSubmit={handleAddCandidate} className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <input name="candName" required placeholder="Candidate Identity" className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm uppercase tracking-tighter" />
                      <textarea name="candDesc" required placeholder="Campaign Statement" className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm h-20" />
                      <button type="submit" disabled={txStatus === "pending"} className="w-full py-3 border border-[#D4A017] text-[#D4A017] font-mono font-bold uppercase text-xs tracking-widest hover:bg-[#D4A017]/10 active:scale-95 disabled:opacity-40">
                         Register_Candidate
                      </button>
                   </form>
                )}
            </section>

            <TransactionStatus status={txStatus} txId={txId} errorMessage={errorMessage} />
        </div>

        {/* Right: Active Ledgers */}
        <div className="space-y-8">
            <h3 className="font-serif text-2xl uppercase tracking-tighter flex items-center gap-3">
               <Layers className="text-muted-foreground" size={24} /> Election_Management_Archive
            </h3>
            
            <div className="grid gap-4">
                {loading ? (
                   Array.from({length: 4}).map((_, i) => <div key={i} className="h-20 border border-border bg-surface/20 animate-pulse" />)
                ) : (
                   elections.map((election) => (
                      <div 
                        key={election.id}
                        onClick={() => setActiveElectionId(election.id)}
                        className={`group border p-4 transition-all duration-300 relative ${
                          activeElectionId === election.id ? "border-[#D4A017] bg-[#D4A017]/5" : "border-border bg-surface hover:border-muted-foreground/40 cursor-pointer"
                        }`}
                      >
                         <div className="flex justify-between items-center">
                            <div className="space-y-1">
                               <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">ID_{election.id}</span>
                                  <h4 className="font-serif text-lg font-bold uppercase tracking-tight">{election.name}</h4>
                               </div>
                               <PhaseBadge phase={election.phase} />
                            </div>
                            
                            <div className="flex items-center gap-3">
                               {election.phase === 0 && (
                                   <button onClick={(e) => { e.stopPropagation(); startVotingPhase({electionId: election.id, onFinish: () => refresh(), onCancel: () => {}}); }} className="p-2 border border-border hover:border-accent group/btn transition-colors">
                                     <RefreshCw size={14} className="group-hover/btn:rotate-90 transition-transform"/>
                                  </button>
                               )}
                               {election.phase === 1 && (
                                   <button onClick={(e) => { e.stopPropagation(); startTallyPhase({electionId: election.id, onFinish: () => refresh(), onCancel: () => {}}); }} className="p-2 border border-border hover:border-accent">
                                     <ChevronRight size={14} />
                                  </button>
                               )}
                               {election.phase === 2 && (
                                   <button onClick={(e) => { e.stopPropagation(); completeElection({electionId: election.id, onFinish: () => refresh(), onCancel: () => {}}); }} className="p-2 border border-border hover:border-accent">
                                     <CheckCircle2 size={14} className="text-green-500" />
                                  </button>
                               )}
                               {election.phase === 3 && <ShieldCheck className="text-accent/40" size={18} />}
                            </div>
                         </div>
                      </div>
                   ))
                )}
            </div>
        </div>

      </div>
    </PageShell>
  );
}
