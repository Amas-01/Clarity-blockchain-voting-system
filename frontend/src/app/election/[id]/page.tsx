"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useElection } from "@/hooks/useElection";
import { useVoterStatus } from "@/hooks/useVoterStatus";
import { useCurrentBlockHeight } from "@/hooks/useCurrentBlockHeight";
import { useVoteCommitment } from "@/hooks/useVoteCommitment";
import { 
  registerVoter, 
  castVote, 
  revealVote 
} from "@/lib/stacks-write";
import { 
  sha256String, 
  hexToBytes 
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
  PHASE_REGISTER, 
  PHASE_VOTING, 
  PHASE_TALLY, 
  PHASE_COMPLETED,
  PHASE_DESCRIPTIONS 
} from "@/lib/constants";
import { 
  Fingerprint, 
  ShieldCheck, 
  Info, 
  History, 
  Trophy,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    loading: statusLoading,
    refresh: refreshStatus
  } = useVoterStatus(electionId);
  
  const commitment = useVoteCommitment(electionId, address || undefined);

  // LOCAL STATE (as per Phase 6 spec)
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [candidateKeySeed, setCandidateKeySeed] = useState("");
  const [revealSaltHex, setRevealSaltHex] = useState("");
  const [revealCandidateId, setRevealCandidateId] = useState<number | null>(null);

  const loading = electionLoading || statusLoading;

  // HANDLERS
  const onFinish = (tid: string) => {
    setTxId(tid);
    setTxStatus("pending");
    setTimeout(() => {
      refreshElection();
      refreshStatus();
    }, 5000);
  };

  const onCancel = () => {
    setTxStatus("idle");
  };

  const handleRegister = () => {
    setTxStatus("pending");
    registerVoter({ electionId, onFinish, onCancel });
  };

  const handleGenerateCommitment = async () => {
    if (!candidateKeySeed) return;
    try {
      const candidateKey = await sha256String(candidateKeySeed);
      await commitment.generateNewCommitment(candidateKey);
    } catch (e) {
      setTxError("Failed to generate commitment.");
      setTxStatus("error");
    }
  };

  const handleCastVote = () => {
    if (selectedCandidateId === null || !commitment.voteHash) return;
    setTxStatus("pending");
    castVote({
      electionId,
      candidateId: selectedCandidateId,
      voteHash: commitment.voteHash,
      onFinish,
      onCancel
    });
  };

  const handleRevealVote = async () => {
    if (revealCandidateId === null || !revealSaltHex || !candidateKeySeed) return;
    setTxStatus("pending");
    try {
      const saltBytes = hexToBytes(revealSaltHex);
      revealVote({
        electionId,
        candidateId: revealCandidateId,
        salt: saltBytes,
        onFinish,
        onCancel
      });
    } catch (e) {
      setTxError("Invalid salt format. Must be 64-character hex.");
      setTxStatus("error");
    }
  };

  // WINNER LOGIC for Completed Phase
  const winner = useMemo(() => {
    if (election?.phase !== PHASE_COMPLETED || candidates.length === 0) return null;
    const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
    return sorted[0].votes > 0 ? sorted[0] : null;
  }, [election?.phase, candidates]);

  // RENDERING
  if (isNaN(electionId)) return <div>Invalid Election ID</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-48 gap-8"
          >
            <div className="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Retrieving_Ballot_Data...</p>
          </motion.div>
        ) : (
          <PageShell title={election?.name ?? "Election_Archive"} subtitle={election?.description}>
            <div className="space-y-16">
              
              {/* SECTION A: Election Header */}
              <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start border-b border-border pb-12">
                 <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center gap-4">
                       <PhaseBadge phase={election?.phase ?? 0} />
                       <h2 className="font-serif text-3xl uppercase tracking-tighter">{election?.name}</h2>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground leading-relaxed italic opacity-80">
                       {PHASE_DESCRIPTIONS[election?.phase ?? 0]}
                    </p>
                 </div>
                 <div className="lg:col-span-4 space-y-4">
                    <BlockHeightInfo label="Registration" targetBlock={election?.regDeadline ?? 0} currentBlock={currentBlockHeight} />
                    <BlockHeightInfo label="Voting" targetBlock={election?.votingDeadline ?? 0} currentBlock={currentBlockHeight} />
                    <BlockHeightInfo label="Tallying" targetBlock={election?.tallyDeadline ?? 0} currentBlock={currentBlockHeight} />
                 </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* SECTION B: Candidate Grid */}
                <div className="lg:col-span-8 space-y-8">
                   <div className="flex items-center gap-4">
                      <ShieldCheck size={18} className="text-accent" />
                      <h3 className="font-serif text-2xl uppercase tracking-tighter">Identity_Archives</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidates.map(candidate => (
                        <CandidateCard 
                           key={candidate.id}
                           id={candidate.id}
                           name={candidate.name}
                           description={candidate.description}
                           votes={(election?.phase === PHASE_TALLY || election?.phase === PHASE_COMPLETED) ? candidate.votes : undefined}
                           isWinner={election?.phase === PHASE_COMPLETED && winner?.id === candidate.id}
                           isSelected={selectedCandidateId === candidate.id}
                           onClick={election?.phase === PHASE_VOTING && !hasVoted ? () => setSelectedCandidateId(candidate.id) : undefined}
                        />
                      ))}
                   </div>
                </div>

                {/* SECTION C: Voter Action Panel */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
                   <div className="bg-surface border border-border glass p-8 space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                         <Fingerprint size={80} />
                      </div>
                      
                      <div className="flex items-center gap-3 border-b border-border pb-4">
                         <Fingerprint size={20} className="text-accent" />
                         <h4 className="font-serif text-xl uppercase tracking-tighter">Voter_Interface</h4>
                      </div>

                      {!isConnected ? (
                        <div className="space-y-6">
                           <p className="font-mono text-[11px] leading-relaxed uppercase tracking-widest text-muted-foreground">
                              Connect your STX identity to participate in the consensus mechanism.
                           </p>
                           <WalletButton />
                        </div>
                      ) : (
                        <div className="space-y-8">
                           {/* REGISTER PHASE FLOW */}
                           {election?.phase === PHASE_REGISTER && (
                             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                               {!isRegistered ? (
                                 <div className="space-y-6">
                                    <button 
                                       onClick={handleRegister}
                                       disabled={txStatus === "pending"}
                                       className="w-full py-5 bg-accent text-background font-mono font-bold uppercase tracking-[0.2em] hover:bg-accent/90 transition-premium"
                                    >
                                       Register to Vote
                                    </button>
                                    <p className="font-mono text-[9px] text-muted-foreground uppercase text-center tracking-widest">
                                       Registration open until block {election.regDeadline}
                                    </p>
                                 </div>
                               ) : (
                                 <div className="p-6 bg-accent/5 border border-accent/20 flex gap-4 items-start">
                                    <CheckCircle2 size={18} className="text-accent shrink-0" />
                                    <p className="font-mono text-[11px] text-muted-foreground leading-relaxed uppercase tracking-widest">
                                       You are registered. Voting opens when the admin advances to the voting phase.
                                    </p>
                                 </div>
                               )}
                             </div>
                           )}

                           {/* VOTING PHASE FLOW */}
                           {election?.phase === PHASE_VOTING && (
                             <div className="space-y-8 animate-in fade-in duration-700">
                               {isRegistered ? (
                                 !hasVoted ? (
                                   <div className="space-y-8">
                                      {selectedCandidateId === null ? (
                                        <div className="p-6 border border-dashed border-border bg-background/50 flex flex-col items-center gap-4 text-center">
                                           <AlertCircle size={24} className="text-muted-foreground/30" />
                                           <p className="font-mono text-[11px] uppercase tracking-widest opacity-60">Select a candidate above to vote.</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-6">
                                           <div className="p-4 bg-accent/10 border border-accent/20">
                                              <span className="text-[9px] uppercase tracking-widest text-accent font-bold">Selected_Identity</span>
                                              <p className="font-serif text-lg uppercase tracking-tight">{candidates.find(c => c.id === selectedCandidateId)?.name}</p>
                                           </div>
                                           
                                           <div className="space-y-4">
                                              <div className="space-y-2">
                                                 <label className="text-[9px] uppercase text-muted-foreground tracking-widest">Candidate Key Seed (provided by admin)</label>
                                                 <input 
                                                    value={candidateKeySeed}
                                                    onChange={(e) => setCandidateKeySeed(e.target.value)}
                                                    placeholder="Enter seed..."
                                                    className="w-full bg-background border border-border p-4 font-mono text-sm focus:border-accent outline-none"
                                                 />
                                                 <p className="text-[9px] text-muted-foreground/70 leading-relaxed font-mono italic">
                                                    The admin publishes a seed string per candidate. Enter the seed for your selected candidate to generate your commitment.
                                                 </p>
                                              </div>
                                              
                                              {!commitment.voteHash ? (
                                                <button 
                                                   onClick={handleGenerateCommitment}
                                                   disabled={!candidateKeySeed}
                                                   className="w-full py-4 border border-accent text-accent font-mono font-bold uppercase tracking-widest hover:bg-accent/5 transition-premium"
                                                >
                                                   Generate Vote Commitment
                                                </button>
                                              ) : (
                                                <div className="space-y-6">
                                                   <SaltDisplay saltHex={commitment.saltHex || ""} voteHashHex={commitment.voteHashHex || ""} />
                                                   
                                                   <div className="p-4 bg-red-950/20 border border-red-900/40 flex gap-3">
                                                      <Info size={16} className="text-red-400 shrink-0" />
                                                      <p className="text-[10px] text-red-400 font-mono uppercase leading-relaxed tracking-tighter">
                                                         IMPORTANT: Save your salt now. You will need it to reveal your vote during the Tally phase. It is not stored on-chain.
                                                      </p>
                                                   </div>

                                                   <button 
                                                      onClick={handleCastVote}
                                                      className="w-full py-5 bg-accent text-background font-mono font-bold uppercase tracking-[0.2em] hover:bg-accent/90 transition-premium"
                                                   >
                                                      Cast Vote
                                                   </button>
                                                </div>
                                              )}
                                           </div>
                                        </div>
                                      )}
                                   </div>
                                 ) : (
                                   <div className="p-6 bg-green-500/5 border border-green-500/20 flex gap-4 items-start">
                                      <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                      <p className="font-mono text-[11px] text-green-500 leading-relaxed uppercase tracking-widest">
                                         Your vote commitment has been submitted. Return during the Tally phase to reveal your vote.
                                      </p>
                                   </div>
                                 )
                               ) : (
                                 <p className="font-mono text-[11px] text-muted-foreground uppercase text-center">You are not registered for this election.</p>
                               )}
                             </div>
                           )}

                           {/* TALLY PHASE FLOW */}
                           {election?.phase === PHASE_TALLY && (
                             <div className="space-y-8 animate-in fade-in duration-700">
                               {isRegistered && hasVoted ? (
                                 <div className="space-y-6">
                                    <div className="space-y-2">
                                       <label className="text-[9px] uppercase text-muted-foreground tracking-widest">Which candidate did you vote for?</label>
                                       <select 
                                          value={revealCandidateId ?? ""}
                                          onChange={(e) => setRevealCandidateId(Number(e.target.value))}
                                          className="w-full bg-background border border-border p-4 font-mono text-sm focus:border-accent outline-none appearance-none"
                                       >
                                          <option value="">Select Candidate...</option>
                                          {candidates.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} (ID_{c.id})</option>
                                          ))}
                                       </select>
                                    </div>

                                    <div className="space-y-2">
                                       <label className="text-[9px] uppercase text-muted-foreground tracking-widest">Candidate Key Seed</label>
                                       <input 
                                          value={candidateKeySeed}
                                          onChange={(e) => setCandidateKeySeed(e.target.value)}
                                          placeholder="Enter seed used during vote..."
                                          className="w-full bg-background border border-border p-4 font-mono text-sm"
                                       />
                                    </div>

                                    <div className="space-y-2">
                                       <label className="text-[9px] uppercase text-muted-foreground tracking-widest">Your Secret Salt (64-char hex)</label>
                                       <textarea 
                                          value={revealSaltHex}
                                          onChange={(e) => setRevealSaltHex(e.target.value)}
                                          placeholder="Paste saltHex here..."
                                          className="w-full bg-background border border-border p-4 font-mono text-sm h-24"
                                       />
                                    </div>

                                    <button 
                                       onClick={handleRevealVote}
                                       disabled={revealCandidateId === null || !revealSaltHex || !candidateKeySeed}
                                       className="w-full py-5 bg-accent text-background font-mono font-bold uppercase tracking-[0.2em] hover:bg-accent/90 transition-premium"
                                    >
                                       Reveal Vote
                                    </button>
                                 </div>
                               ) : (
                                 <p className="font-mono text-[11px] text-muted-foreground uppercase text-center opacity-60 italic">
                                    {hasVoted ? "System sync in progress..." : "You did not cast a vote in this election."}
                                 </p>
                               )}
                             </div>
                           )}

                           {/* COMPLETED PHASE FLOW */}
                           {election?.phase === PHASE_COMPLETED && (
                             <div className="space-y-8 animate-in slide-in-from-top-4 duration-1000">
                                <div className="p-8 border-2 border-accent/20 bg-accent/5 text-center space-y-4">
                                   <Trophy size={48} className="text-accent mx-auto" />
                                   <div className="space-y-2">
                                      <p className="font-mono text-[9px] uppercase tracking-widest text-accent">Election_Consensus_Reached</p>
                                      {winner ? (
                                        <div className="space-y-1">
                                           <span className="block text-muted-foreground font-mono text-[10px] uppercase">Winner:</span>
                                           <h3 className="font-serif text-4xl uppercase tracking-tighter text-foreground">{winner.name}</h3>
                                        </div>
                                      ) : (
                                        <h3 className="font-serif text-2xl uppercase tracking-tighter text-muted-foreground">No votes were revealed.</h3>
                                      )}
                                   </div>
                                </div>
                                <p className="font-mono text-[10px] text-muted-foreground text-center uppercase tracking-widest opacity-40">Election has been finalized.</p>
                             </div>
                           )}
                        </div>
                      )}

                      {/* SECTION D: Transaction Status */}
                      <div className="pt-4 mt-8 border-t border-border/40">
                         <TransactionStatus txId={txId} status={txStatus} errorMessage={txError} />
                      </div>

                      {/* Client Info Overlay */}
                      <div className="pt-4 flex justify-between font-mono text-[8px] text-muted-foreground uppercase tracking-widest opacity-30 mt-auto">
                         <span className="truncate max-w-[150px]">Address: {address}</span>
                         <span>Relay: Online</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </PageShell>
        )}
      </AnimatePresence>
    </div>
  );
}
