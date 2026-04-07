"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { 
  useWallet 
} from "@/hooks/useWallet";
import { 
  useElection 
} from "@/hooks/useElection";
import { 
  useVoterStatus 
} from "@/hooks/useVoterStatus";
import { 
  useCurrentBlockHeight 
} from "@/hooks/useCurrentBlockHeight";
import { 
  useVoteCommitment 
} from "@/hooks/useVoteCommitment";

import { 
  registerVoter, 
  castVote, 
  revealVote 
} from "@/lib/stacks-write";
import { 
  PHASE_REGISTER, 
  PHASE_VOTING, 
  PHASE_TALLY, 
  PHASE_COMPLETED,
  PHASE_DESCRIPTIONS 
} from "@/lib/constants";
import { 
  sha256String, 
  hexToBytes, 
  bytesToHex 
} from "@/lib/commitment";

// Components
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import PhaseBadge from "@/components/PhaseBadge";
import CandidateCard from "@/components/CandidateCard";
import BlockHeightInfo from "@/components/BlockHeightInfo";
import SaltDisplay from "@/components/SaltDisplay";
import TransactionStatus from "@/components/TransactionStatus";
import WalletButton from "@/components/WalletButton";
import { 
  ShieldCheck, 
  Info, 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Trophy
} from "lucide-react";

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = parseInt(params.id as string, 10);

  const { isConnected, address } = useWallet();
  const { height: currentBlockHeight } = useCurrentBlockHeight();
  
  const { 
    election, 
    candidates, 
    loading: electionLoading, 
    refresh: refreshElection 
  } = useElection(electionId);
  
  const { 
    isRegistered, 
    hasVoted, 
    loading: voterLoading, 
    refresh: refreshVoter 
  } = useVoterStatus(electionId);
  
  const commitment = useVoteCommitment();

  // LOCAL STATE
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  
  const [candidateKeySeed, setCandidateKeySeed] = useState("");
  const [revealSaltHex, setRevealSaltHex] = useState("");
  const [revealCandidateId, setRevealCandidateId] = useState<number | null>(null);

  // Derived
  const masterLoading = electionLoading || voterLoading;
  const phaseDescription = election ? PHASE_DESCRIPTIONS[election.phase] : "";

  // HANDLERS
  const handleRegister = () => {
    setTxStatus("pending");
    setTxId(null);
    setTxError(null);
    
    registerVoter({
      electionId,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setTimeout(() => { refreshVoter(); refreshElection(); }, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleGenerateCommitment = async () => {
    if (selectedCandidateId === null || !candidateKeySeed) return;
    
    try {
      const candidateKey = await sha256String(candidateKeySeed);
      await commitment.generateNewCommitment(selectedCandidateId, candidateKey);
    } catch (e: any) {
      console.error("Commitment generation error:", e);
      setTxError(e.message || "Failed to generate commitment.");
      setTxStatus("error");
    }
  };

  const handleCastVote = () => {
    if (selectedCandidateId === null || !commitment.voteHash) return;
    
    setTxStatus("pending");
    setTxId(null);
    setTxError(null);
    
    castVote({
      electionId,
      candidateId: selectedCandidateId,
      voteHash: commitment.voteHash,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        // Persist salt locally for reveal phase later
        if (address && commitment.saltHex) {
           localStorage.setItem(`vote-${address}-${electionId}`, JSON.stringify({
             candidateId: selectedCandidateId,
             salt: commitment.saltHex
           }));
        }
        setTimeout(() => { refreshVoter(); refreshElection(); }, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleRevealVote = async () => {
    if (revealCandidateId === null || !revealSaltHex || !candidateKeySeed) return;
    
    setTxStatus("pending");
    setTxId(null);
    setTxError(null);
    
    try {
      const saltBytes = hexToBytes(revealSaltHex);
      
      revealVote({
        electionId,
        candidateId: revealCandidateId,
        salt: saltBytes,
        onFinish: (id) => {
          setTxId(id);
          setTxStatus("success");
          setTimeout(() => { refreshVoter(); refreshElection(); }, 2000);
        },
        onCancel: () => setTxStatus("idle")
      });
    } catch (e: any) {
      console.error("Reveal error:", e);
      setTxError(e.message || "Reveal failed. Ensure salt and candidate are correct.");
      setTxStatus("error");
    }
  };

  // --- RENDERING ---

  return (
    <>
      <Navbar />
      <PageShell 
        title={election?.name ?? "Loading..."} 
        subtitle={election?.description}
      >
        
        {/* SECTION A: Election Header */}
        <div className="space-y-8 animate-in fade-in duration-800">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between border-b border-border pb-8">
             <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-4">
                   {election && <PhaseBadge phase={election.phase} />}
                   <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground opacity-60">
                      // Ballot_Node_Active / EID_{electionId}
                   </h2>
                </div>
                <p className="font-mono text-sm text-accent uppercase leading-relaxed tracking-tight">
                   {phaseDescription}
                </p>
             </div>
             
             {election && (
               <div className="space-y-1 bg-surface-dark/50 p-4 border border-border">
                  <BlockHeightInfo label="Registration" targetBlock={election.regDeadline} />
                  <BlockHeightInfo label="Voting" targetBlock={election.votingDeadline} />
                  <BlockHeightInfo label="Tallying" targetBlock={election.tallyDeadline} />
               </div>
             )}
          </div>

          {/* SECTION B: Candidate Grid */}
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl uppercase tracking-tighter flex items-center gap-2">
                   <ShieldCheck className="text-muted-foreground" size={20} /> Identity_Archive
                </h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {masterLoading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-40 border border-dotted border-border animate-pulse bg-surface/30 px-6 py-4 flex flex-col justify-between" />
                   ))
                ) : (
                   candidates.map(candidate => (
                     <CandidateCard 
                        key={candidate.id}
                        id={candidate.id}
                        name={candidate.name}
                        description={candidate.description}
                        votes={(election?.phase === PHASE_TALLY || election?.phase === PHASE_COMPLETED) ? candidate.votes : undefined}
                        isSelected={selectedCandidateId === candidate.id}
                        isWinner={election?.phase === PHASE_COMPLETED && candidate.votes > 0} // In real app, check winner ID from contract
                        onClick={election?.phase === PHASE_VOTING ? () => setSelectedCandidateId(candidate.id) : undefined}
                     />
                   ))
                )}
             </div>
          </div>

          {/* SECTION C: Voter Action Panel */}
          <div className="pt-12 border-t border-border mt-12">
             {!isConnected ? (
                <div className="bg-surface p-8 border border-border flex flex-grow-0 flex-col items-center justify-center space-y-6 text-center animate-in slide-in-from-bottom-4">
                   <Fingerprint size={48} className="text-muted-foreground/30" />
                   <div className="space-y-2">
                      <p className="font-serif text-xl uppercase tracking-tight">Unauthenticated_Access</p>
                      <p className="font-mono text-xs text-muted-foreground">Connect your wallet to participate in this election.</p>
                   </div>
                   <WalletButton />
                </div>
             ) : masterLoading ? (
                <div className="h-40 bg-surface border border-border animate-pulse flex items-center justify-center font-mono text-[10px] uppercase opacity-30">
                   Synchronizing_Identity...
                </div>
             ) : (
                <div className="max-w-2xl mx-auto space-y-12">
                   
                   {/* CASE: Registration Phase */}
                   {election?.phase === PHASE_REGISTER && (
                      <div className="space-y-6">
                         {!isRegistered ? (
                            <div className="bg-amber-500/5 border border-amber-500/20 p-8 space-y-6 text-center">
                               <Info size={32} className="mx-auto text-amber-500" />
                               <div className="space-y-2">
                                  <h4 className="font-serif text-2xl uppercase tracking-tighter">Registration Required</h4>
                                  <p className="font-mono text-xs text-muted-foreground opacity-80 uppercase leading-relaxed tracking-widest">
                                     Join the ballot roll for this election session.
                                  </p>
                               </div>
                               <button 
                                  onClick={handleRegister}
                                  disabled={txStatus === "pending"}
                                  className="w-full py-4 bg-accent text-black font-mono font-bold uppercase text-sm tracking-[0.3em] hover:bg-accent/90 transition-all disabled:opacity-30"
                               >
                                  Register to Vote
                               </button>
                               <p className="font-mono text-[10px] text-muted-foreground uppercase opacity-40">
                                  Registration open until block #{election.regDeadline}
                               </p>
                            </div>
                         ) : (
                            <div className="bg-surface p-8 border border-border flex flex-col items-center gap-4">
                               <CheckCircle2 size={32} className="text-accent" />
                               <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider text-center max-w-sm italic opacity-80">
                                  You are registered. Voting opens when the admin advances to the voting phase.
                               </p>
                            </div>
                         )}
                      </div>
                   )}

                   {/* CASE: Voting Phase */}
                   {election?.phase === PHASE_VOTING && (
                      <div className="space-y-8">
                         {!isRegistered ? (
                            <div className="bg-red-500/5 p-8 border border-red-500/20 flex items-center gap-4">
                               <AlertCircle className="text-red-500" />
                               <p className="font-mono text-xs text-red-500 uppercase tracking-widest">Registration Closed. You are not authorized to participate.</p>
                            </div>
                         ) : hasVoted ? (
                            <div className="bg-green-500/5 p-8 border border-green-500/20 flex flex-col items-center gap-4 text-center">
                               <CheckCircle2 size={32} className="text-green-500" />
                               <p className="font-mono text-sm uppercase text-green-500/80 leading-relaxed tracking-wider">
                                  Your vote commitment has been submitted.<br/>Return during the Tally phase to reveal your vote.
                               </p>
                            </div>
                         ) : (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                               {selectedCandidateId === null ? (
                                  <div className="bg-surface p-12 border border-dashed border-border flex flex-col items-center gap-4 opacity-50">
                                     <HelpCircle size={32} className="text-muted-foreground" />
                                     <p className="font-serif text-lg uppercase tracking-tight">Select a candidate above to vote.</p>
                                  </div>
                               ) : (
                                  <div className="space-y-8 bg-surface p-8 border border-border shadow-[0_0_50px_rgba(212,160,23,0.05)]">
                                     <div className="flex items-center justify-between border-b border-border pb-4">
                                        <h4 className="font-serif text-xl uppercase tracking-tighter">Intent: Cast_Ballot</h4>
                                        <span className="font-mono text-xs text-accent uppercase font-bold tracking-widest">
                                           Selected: {candidates.find(c => c.id === selectedCandidateId)?.name}
                                        </span>
                                     </div>

                                     <div className="space-y-4">
                                        <div className="space-y-2">
                                           <label className="font-mono text-[10px] uppercase opacity-50 block tracking-widest">Candidate Key Seed (provided by admin)</label>
                                           <input 
                                              value={candidateKeySeed}
                                              onChange={(e) => setCandidateKeySeed(e.target.value)}
                                              placeholder="E.g. genesis-block-secret"
                                              className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm tracking-tighter"
                                           />
                                           <p className="font-mono text-[10px] text-muted-foreground opacity-70 leading-relaxed">
                                              The admin publishes a seed string per candidate. Enter the seed for your selected candidate to generate your commitment.
                                           </p>
                                        </div>

                                        {!commitment.voteHash ? (
                                           <button 
                                              onClick={handleGenerateCommitment}
                                              className="w-full py-4 border border-accent text-accent font-mono font-bold uppercase text-xs tracking-widest hover:bg-accent/5"
                                           >
                                              Generate Vote Commitment
                                           </button>
                                        ) : (
                                           <div className="space-y-8 pt-4">
                                              <SaltDisplay 
                                                 saltHex={commitment.saltHex!} 
                                                 voteHashHex={commitment.voteHashHex!} 
                                              />
                                              
                                              <div className="space-y-4">
                                                 <div className="flex items-center gap-3 bg-red-500/10 p-4 border border-red-500/30 text-red-500">
                                                    <AlertCircle size={20} />
                                                    <p className="font-serif text-sm font-bold uppercase tracking-tighter">Save your salt now. It is required to reveal.</p>
                                                 </div>
                                                 <button 
                                                    onClick={handleCastVote}
                                                    disabled={txStatus === "pending"}
                                                    className="w-full py-5 bg-accent text-black font-mono font-bold uppercase text-sm tracking-[0.4em] hover:bg-accent/90 disabled:opacity-40"
                                                 >
                                                    Cast Vote
                                                 </button>
                                              </div>
                                           </div>
                                        )}
                                     </div>
                                  </div>
                               )}
                            </div>
                         )}
                      </div>
                   )}

                   {/* CASE: Tally Reveal Phase */}
                   {election?.phase === PHASE_TALLY && (
                      <div className="space-y-8 animate-in fade-in">
                         {isRegistered && hasVoted ? (
                            <div className="space-y-8 bg-surface p-8 border border-border">
                               <div className="border-b border-border pb-4">
                                  <h4 className="font-serif text-xl uppercase tracking-tighter">Action: Reveal_Secret_Ballot</h4>
                                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Provide cryptographic proof to count your vote.</p>
                               </div>

                               <div className="space-y-6">
                                  <div className="space-y-2">
                                     <label className="font-mono text-[10px] uppercase opacity-50">Which candidate did you vote for?</label>
                                     <select 
                                        className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm uppercase tracking-tighter accent-accent"
                                        onChange={(e) => setRevealCandidateId(Number(e.target.value))}
                                        value={revealCandidateId || ""}
                                     >
                                        <option value="">Select Candidate...</option>
                                        {candidates.map(c => (
                                          <option key={c.id} value={c.id}>ID_{c.id} : {c.name}</option>
                                        ))}
                                     </select>
                                  </div>

                                  <div className="space-y-2">
                                     <label className="font-mono text-[10px] uppercase opacity-50">Candidate Key Seed</label>
                                     <input 
                                        value={candidateKeySeed}
                                        onChange={(e) => setCandidateKeySeed(e.target.value)}
                                        placeholder="Admin key seed for the candidate..."
                                        className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm tracking-tighter"
                                     />
                                  </div>

                                  <div className="space-y-2">
                                     <label className="font-mono text-[10px] uppercase opacity-50">Your Secret Salt (64-char hex)</label>
                                     <textarea 
                                        value={revealSaltHex}
                                        onChange={(e) => setRevealSaltHex(e.target.value)}
                                        placeholder="Paste your saved salt hex here..."
                                        className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-xs h-24 tracking-tighter"
                                     />
                                  </div>

                                  <button 
                                     onClick={handleRevealVote}
                                     disabled={txStatus === "pending" || revealCandidateId === null || !revealSaltHex || !candidateKeySeed}
                                     className="w-full py-4 bg-accent text-black font-mono font-bold uppercase text-xs tracking-widest hover:bg-accent/90 disabled:opacity-40"
                                  >
                                     Reveal Vote
                                  </button>
                               </div>
                            </div>
                         ) : (
                            <div className="bg-surface p-12 border border-border flex flex-col items-center gap-4 opacity-50 text-center">
                               <Info size={32} className="text-muted-foreground" />
                               <p className="font-serif text-lg uppercase tracking-tight">You did not cast a vote in this election.</p>
                            </div>
                         )}
                      </div>
                   )}

                   {/* CASE: Completed Phase */}
                   {election?.phase === PHASE_COMPLETED && (
                      <div className="space-y-8 text-center bg-surface p-12 border border-border relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150">
                            <Trophy size={160} />
                         </div>
                         <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                               <p className="font-mono text-xs text-accent uppercase tracking-[0.4em] font-bold">Election Finalized</p>
                               {candidates.some(c => c.votes > 0) ? (
                                 <h4 className="font-serif text-5xl md:text-6xl text-[#E8E6E1] uppercase tracking-tighter leading-none">
                                    {/* Simplified winner calculation for UI demo */}
                                    Winner: {candidates.reduce((prev, curr) => (prev.votes > curr.votes) ? prev : curr).name}
                                 </h4>
                               ) : (
                                  <h4 className="font-serif text-4xl text-muted-foreground uppercase tracking-tighter">No votes were revealed.</h4>
                               )}
                            </div>
                            <div className="h-[1px] w-24 bg-accent mx-auto opacity-40" />
                            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em] italic opacity-60">
                               Immutable Ledger Record / Ballot Session Closed
                            </p>
                         </div>
                      </div>
                   )}

                   <TransactionStatus txId={txId} status={txStatus} errorMessage={txError ?? undefined} />
                </div>
             )}
          </div>

        </div>
      </PageShell>
    </>
  );
}
