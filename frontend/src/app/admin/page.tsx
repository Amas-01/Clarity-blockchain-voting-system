"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import useAdminElection from "@/hooks/useAdminElection";
import { useElection } from "@/hooks/useElection";
import { useCurrentBlockHeight } from "@/hooks/useCurrentBlockHeight";
import { 
  createElection, 
  addCandidate, 
  startVotingPhase, 
  startTallyPhase, 
  completeElection,
  parseContractError
} from "@/lib/stacks-write";
import { sha256String, bytesToHex } from "@/lib/commitment";

// Components
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import BlockHeightInfo from "@/components/BlockHeightInfo";
import CandidateCard from "@/components/CandidateCard";
import WalletButton from "@/components/WalletButton";
import ElectionTimeline from "@/components/ElectionTimeline";
import { 
  PlusCircle, 
  UserPlus, 
  Layers, 
  CheckCircle2, 
  Info,
  AlertCircle,
  Clock,
  Settings,
  Shield,
  Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPage() {
  const { isConnected, address } = useWallet();
  const { electionId, loading: adminLoading, refresh: refreshAdmin } = useAdminElection();
  const { height: currentBlockHeight } = useCurrentBlockHeight();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SECTION: Create Election States
  const [electionName, setElectionName] = useState("");
  const [electionDesc, setElectionDesc] = useState("");
  const [regDeadline, setRegDeadline] = useState<number>(0);
  const [votingDeadline, setVotingDeadline] = useState<number>(0);
  const [tallyDeadline, setTallyDeadline] = useState<number>(0);

  // SECTION: Add Candidate States
  const [candName, setCandName] = useState("");
  const [candDesc, setCandDesc] = useState("");
  const [candSeed, setCandSeed] = useState("");
  const [candKeyPreview, setCandKeyPreview] = useState("");

  const { 
    election, 
    candidates, 
    loading: electionLoading, 
    refresh: refreshElection 
  } = useElection(electionId ?? undefined);

  useEffect(() => {
    if (candSeed) {
      sha256String(candSeed).then(bytes => {
        setCandKeyPreview(bytesToHex(bytes));
      });
    } else {
      setCandKeyPreview("");
    }
  }, [candSeed]);

  const validationError = useMemo(() => {
    if (!currentBlockHeight) return null;
    if (regDeadline > 0 && regDeadline <= currentBlockHeight) return "Registration deadline must be in the future.";
    if (votingDeadline > 0 && votingDeadline <= regDeadline) return "Voting period must follow registration.";
    if (tallyDeadline > 0 && tallyDeadline <= votingDeadline) return "Tally period must follow voting.";
    return null;
  }, [currentBlockHeight, regDeadline, votingDeadline, tallyDeadline]);

  const masterRefresh = () => {
    refreshAdmin();
    refreshElection();
  };

  const handleCreateElection = () => {
    if (validationError || !electionName) return;
    setIsSubmitting(true);
    setError(null);
    
    createElection({
      name: electionName,
      description: electionDesc,
      regDeadline,
      votingDeadline,
      tallyDeadline,
      onFinish: (id) => {
        console.log("Election created:", id);
        setTimeout(() => { masterRefresh(); setIsSubmitting(false); }, 4000);
      },
      onCancel: () => setIsSubmitting(false)
    });
  };

  const handleAddCandidate = async () => {
    if (!electionId || !candName || !candSeed) return;
    setIsSubmitting(true);
    setError(null);
    
    try {
      const candidateKey = await sha256String(candSeed);
      addCandidate({
        electionId,
        candidateName: candName,
        candidateDescription: candDesc,
        candidateKey,
        onFinish: (id) => {
          console.log("Candidate added:", id);
          setCandName("");
          setCandDesc("");
          setCandSeed("");
          setTimeout(() => { refreshElection(); setIsSubmitting(false); }, 4000);
        },
        onCancel: () => setIsSubmitting(false)
      });
    } catch (e) {
      setError("Cryptographic operation failed.");
      setIsSubmitting(false);
    }
  };

  const handlePhaseAdvance = (fn: any) => {
    if (!electionId) return;
    setIsSubmitting(true);
    fn({
      electionId,
      onFinish: (id: string) => {
        console.log("Phase advanced:", id);
        setTimeout(() => { refreshElection(); setIsSubmitting(false); }, 4000);
      },
      onCancel: () => setIsSubmitting(false)
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono">
        <Navbar />
        <PageShell title="ADMIN_ACCESS_REQUIRED" subtitle="Authentication mandatory for protocol management.">
          <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-in fade-in">
            <Shield size={64} className="text-muted-foreground/20" />
            <div className="text-center space-y-2">
               <p className="font-serif text-xl uppercase tracking-widest text-muted-foreground">Session_Unauthorized</p>
               <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">Connect administrative wallet to proceed</p>
            </div>
            <WalletButton />
          </div>
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <PageShell title="Command_Center" subtitle="Authorized participation and electoral oversight.">
        
        <AnimatePresence mode="wait">
          {adminLoading || (electionId !== null && electionLoading) ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p className="font-mono text-[9px] uppercase tracking-[0.5em] text-muted-foreground">Synchronizing_Protocol_State...</p>
            </motion.div>
          ) : (!electionId || isNaN(electionId)) ? (
            /* CREATE ELECTION VIEW */
            <motion.div 
              key="create-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              <section className="bg-surface border border-border glass p-10 space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <PlusCircle size={100} />
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-accent/10 border border-accent/20">
                    <PlusCircle size={24} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl uppercase tracking-tighter">Protocol_Genesis: Election</h3>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest opacity-60">Define immutable parameters</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase text-muted-foreground font-bold tracking-widest">Public_Label</label>
                        <input 
                          value={electionName}
                          onChange={(e) => setElectionName(e.target.value)}
                          placeholder="Governance_Council_2026"
                          className="w-full bg-background border border-border px-5 py-4 font-mono text-sm uppercase tracking-tighter focus:border-accent outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase text-muted-foreground font-bold tracking-widest">Context_Description</label>
                        <textarea 
                          value={electionDesc}
                          onChange={(e) => setElectionDesc(e.target.value)}
                          placeholder="Purpose and constraints of the ballot..."
                          className="w-full bg-background border border-border px-5 py-4 font-mono text-sm h-32 outline-none focus:border-accent transition-colors"
                        />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="p-5 border border-border bg-background/40 font-mono text-[10px] space-y-4">
                         <div className="flex justify-between items-center text-accent">
                            <Clock size={14} />
                            <span className="uppercase font-bold tracking-widest">Temporal_Constraints</span>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-1">
                               <label className="opacity-50 uppercase">Registration_End_Block</label>
                               <input type="number" value={regDeadline || ""} onChange={e => setRegDeadline(Number(e.target.value))} className="w-full bg-surface-dark border border-border p-2" />
                            </div>
                            <div className="space-y-1">
                               <label className="opacity-50 uppercase">Voting_End_Block</label>
                               <input type="number" value={votingDeadline || ""} onChange={e => setVotingDeadline(Number(e.target.value))} className="w-full bg-surface-dark border border-border p-2" />
                            </div>
                            <div className="space-y-1">
                               <label className="opacity-50 uppercase">Tally_Window_Closure</label>
                               <input type="number" value={tallyDeadline || ""} onChange={e => setTallyDeadline(Number(e.target.value))} className="w-full bg-surface-dark border border-border p-2" />
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20">
                         <Fingerprint size={16} className="text-accent" />
                         <span className="font-mono text-[9px] uppercase tracking-widest text-accent">Height: {currentBlockHeight || "SYNCING..."}</span>
                      </div>
                   </div>
                </div>

                {validationError && (
                  <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/40 text-red-400 font-mono text-[10px]">
                    <AlertCircle size={16} />
                    <span className="uppercase tracking-tighter">Constraint_Violation: {validationError}</span>
                  </div>
                )}

                <button 
                  onClick={handleCreateElection}
                  disabled={isSubmitting || !!validationError || !electionName}
                  className="w-full py-5 bg-accent text-background font-mono font-bold uppercase tracking-[0.3em] hover:bg-accent/90 disabled:opacity-30 transition-premium shadow-[0_0_30px_rgba(212,160,23,0.1)] relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isSubmitting ? "Broadcasting_Transaction..." : "Initialize_Election_Node"}
                  </span>
                </button>
              </section>
            </motion.div>
          ) : (
            /* MANAGE ELECTION VIEW */
            <motion.div 
              key="manage-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-16"
            >
              {/* Header Stats */}
              <header className="flex flex-col lg:flex-row justify-between items-start gap-12 border-b border-border pb-12">
                 <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center gap-4">
                       <h2 className="font-serif text-4xl uppercase tracking-tighter">{election?.name}</h2>
                       <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
                          EID_{electionId ?? "---"}
                       </div>
                    </div>
                    <ElectionTimeline currentPhase={election?.phase ?? 0} />
                    <p className="font-mono text-sm text-muted-foreground leading-relaxed italic opacity-80 max-w-xl">
                       {election?.description}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                    {[
                      { label: "Voters_Enrolled", value: candidates.length },
                      { label: "Active_Phase", value: election?.phase !== undefined ? PHASE_LABELS[election.phase].toUpperCase() : "SYNCING" }
                    ].map(stat => (
                      <div key={stat.label} className="p-6 bg-surface border border-border glass text-center space-y-2 min-w-[160px]">
                         <span className="block text-[9px] uppercase text-muted-foreground tracking-widest font-mono font-bold">{stat.label}</span>
                         <span className="block text-2xl font-serif text-accent">{stat.value}</span>
                      </div>
                    ))}
                 </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 {/* Left Column: Management Tools */}
                 <div className="lg:col-span-4 space-y-12">
                    {/* Phase Controls */}
                    <section className="bg-surface border border-border glass p-8 space-y-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Settings size={60} />
                       </div>
                       <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent border-b border-border/50 pb-4 flex items-center gap-2">
                          <Settings size={14} /> Authority_Overrides
                       </h3>
                       
                       <div className="space-y-4">
                          {election?.phase === 0 && (
                            <button 
                              onClick={() => handlePhaseAdvance(startVotingPhase)}
                              disabled={isSubmitting || (currentBlockHeight || 0) < (election?.regDeadline ?? 0)}
                              className="w-full py-4 bg-accent text-background font-mono font-bold uppercase text-[10px] tracking-widest hover:bg-accent/90 disabled:opacity-20 transition-premium"
                            >
                               Start_Voting_Phase
                            </button>
                          )}
                          {election?.phase === 1 && (
                            <button 
                              onClick={() => handlePhaseAdvance(startTallyPhase)}
                              disabled={isSubmitting || (currentBlockHeight || 0) < (election?.votingDeadline ?? 0)}
                              className="w-full py-4 bg-orange-500 text-background font-mono font-bold uppercase text-[10px] tracking-widest hover:bg-orange-600 disabled:opacity-20 transition-premium"
                            >
                               Start_Tally_Phase
                            </button>
                          )}
                          {election?.phase === 2 && (
                            <button 
                              onClick={() => handlePhaseAdvance(completeElection)}
                              disabled={isSubmitting || (currentBlockHeight || 0) < (election?.tallyDeadline ?? 0)}
                              className="w-full py-4 bg-green-500 text-background font-mono font-bold uppercase text-[10px] tracking-widest hover:bg-green-600 disabled:opacity-20 transition-premium"
                            >
                               Finalize_Election
                            </button>
                          )}
                          
                          <p className="text-[9px] font-mono text-muted-foreground text-center uppercase tracking-widest opacity-40">
                             Block: {currentBlockHeight} / Sync: OK
                          </p>
                       </div>
                    </section>

                    {/* Candidate Entry */}
                    {election?.phase === 0 && (
                      <section className="bg-surface border border-border glass p-8 space-y-8">
                         <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent border-b border-border/50 pb-4 flex items-center gap-2">
                            <UserPlus size={14} /> Provision_Candidate
                         </h3>
                         <div className="space-y-5">
                            <div className="space-y-1">
                               <label className="text-[8px] uppercase text-muted-foreground tracking-widest">Name_Label</label>
                               <input value={candName} onChange={e => setCandName(e.target.value)} className="w-full bg-background border border-border p-3 text-sm focus:border-accent outline-none" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] uppercase text-muted-foreground tracking-widest">Entropy_Seed</label>
                               <input value={candSeed} onChange={e => setCandSeed(e.target.value)} className="w-full bg-background border border-border p-3 text-sm focus:border-accent outline-none font-mono" />
                            </div>
                            {candKeyPreview && (
                               <div className="p-3 bg-black/40 border border-border font-mono text-[8px] break-all text-accent/60 uppercase">
                                  Hashed_Key: {candKeyPreview}
                               </div>
                            )}
                            <button onClick={handleAddCandidate} disabled={isSubmitting || !candName || !candSeed} className="w-full py-3 border border-accent text-accent font-mono font-bold uppercase text-[10px] tracking-widest hover:bg-accent/5 transition-premium">
                               {isSubmitting ? "Processing..." : "Commit_Enrollment"}
                            </button>
                         </div>
                      </section>
                    )}
                 </div>

                 {/* Right Column: Candidate Grid */}
                 <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center gap-4">
                       <Layers size={18} className="text-muted-foreground/40" />
                       <h3 className="font-serif text-2xl uppercase tracking-tighter">Identity_Archives</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {candidates.map(c => (
                         <CandidateCard key={c.id} id={c.id} name={c.name} description={c.description} votes={c.votes} />
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {error && (
           <div className="fixed bottom-8 right-8 p-4 bg-red-950/80 border border-red-900/50 text-red-400 font-mono text-xs flex gap-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-8 z-50 max-w-md">
              <AlertCircle size={18} />
              <span>{error}</span>
           </div>
        )}
      </PageShell>
    </div>
  );
}
