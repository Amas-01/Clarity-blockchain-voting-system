"use client";

import { useParams } from "next/navigation";
import { useElection } from "@/hooks/use-election";
import { registerVoter, castVote, revealVote } from "@/lib/stacks-write";
import { generateRandomSalt, generateCommitment, bytesToHex, hexToBytes } from "@/lib/commitment";
import { userSession, getAddress } from "@/lib/stacks-session";
import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import CandidateCard from "@/components/CandidateCard";
import SaltDisplay from "@/components/SaltDisplay";
import TransactionStatus from "@/components/TransactionStatus";
import BlockHeightInfo from "@/components/BlockHeightInfo";
import { ShieldCheck, Info, CheckCircle2, AlertCircle, Fingerprint, LucideIcon } from "lucide-react";

/**
 * Detailed election view with phase-aware participation module.
 */
export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = Number(params.id);
  const { election, candidates, isRegistered, hasVoted, loading, refresh } = useElection(electionId);
  
  // State for interactions
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  
  // Voting data (salt generation)
  const [saltInfo, setSaltInfo] = useState<{ saltHex: string; hashHex: string } | null>(null);

  const handleRegister = () => {
    setTxStatus("pending");
    registerVoter({
      electionId,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        refresh();
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleCommit = async () => {
    if (selectedCandidate === null) return;
    setTxStatus("pending");
    
    try {
      // 1. Generate salt and commitment
      const candidateKey = new Uint8Array(32).fill(selectedCandidate);
      const salt = generateRandomSalt();
      const voteHash = await generateCommitment(candidateKey, salt);
      
      const saltHex = bytesToHex(salt);
      const hashHex = bytesToHex(voteHash);

      // 2. Persist locally for reveal phase
      const address = getAddress(userSession.loadUserData());
      localStorage.setItem(`vote-${address}-${electionId}`, JSON.stringify({
        candidateId: selectedCandidate,
        salt: saltHex
      }));

      // 3. Trigger Transaction
      castVote({
        electionId,
        candidateId: selectedCandidate,
        voteHash,
        onFinish: (id) => {
          setTxId(id);
          setTxStatus("success");
          setSaltInfo({ saltHex, hashHex });
          refresh();
        },
        onCancel: () => setTxStatus("idle")
      });
    } catch (e: any) {
      setErrorMessage(e.message);
      setTxStatus("error");
    }
  };

  const handleReveal = () => {
    const address = getAddress(userSession.loadUserData());
    const stored = localStorage.getItem(`vote-${address}-${electionId}`);
    if (!stored) {
      setErrorMessage("NO_SALT_FOUND_IN_STORAGE");
      setTxStatus("error");
      return;
    }

    const { candidateId, salt } = JSON.parse(stored);
    setTxStatus("pending");

    revealVote({
      electionId,
      candidateId,
      salt: hexToBytes(salt),
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        refresh();
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
         <div className="w-8 h-8 border-t-2 border-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!election) return null;

  return (
    <PageShell title={election.name} subtitle={election.description}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">
        
        {/* Left: Candidates ballot view */}
        <div className="space-y-12">
            <section className="space-y-8">
               <div className="flex items-center gap-4 border-b border-border pb-4">
                  <h2 className="font-serif text-2xl uppercase tracking-tighter">Election_Ballot</h2>
               </div>
               <div className="grid gap-6">
                  {candidates.map((candidate) => (
                    <CandidateCard 
                      key={candidate.id}
                      id={candidate.id}
                      name={candidate.name}
                      description={candidate.description}
                      votes={election.phase === 3 ? candidate.votes : undefined}
                      isWinner={election.phase === 3 && candidate.id === candidates.sort((a,b) => b.votes - a.votes)[0]?.id}
                      isSelected={selectedCandidate === candidate.id}
                      onClick={election.phase === 1 && isRegistered && !hasVoted ? () => setSelectedCandidate(candidate.id) : undefined}
                    />
                  ))}
               </div>
            </section>
        </div>

        {/* Right: Interaction and Block Deadlines */}
        <div className="space-y-8 sticky top-24">
            <section className="border border-border bg-surface/40 p-6 space-y-6">
                <h4 className="font-mono text-sm uppercase tracking-widest text-accent border-b border-border pb-3">Lifecycle_Node</h4>
                <div className="space-y-4">
                   <BlockHeightInfo label="Registration closes" targetBlock={election.regDeadline} />
                   <BlockHeightInfo label="Commit Window ends" targetBlock={election.votingDeadline} />
                   <BlockHeightInfo label="Reveal Window ends" targetBlock={election.tallyDeadline} />
                </div>
            </section>

            <section className="border border-border bg-surface p-6 space-y-6 accent-glow">
                <h4 className="font-mono text-sm uppercase tracking-widest border-b border-border pb-3">Participation_Terminal</h4>
                
                {/* Registration Phase */}
                {election.phase === 0 && (
                   <div className="space-y-4">
                      {isRegistered ? (
                         <div className="p-4 bg-accent/10 border border-accent/20 flex gap-4 text-accent animate-in zoom-in-95">
                            <CheckCircle2 size={24} className="shrink-0" />
                            <p className="font-mono text-xs uppercase font-bold leading-tight">Identity_Verified // Registered</p>
                         </div>
                      ) : (
                         <button 
                           onClick={handleRegister}
                           disabled={txStatus === "pending"}
                           className="w-full h-12 bg-accent text-black font-mono font-bold uppercase tracking-widest transition-all hover:bg-accent/80 active:scale-95 disabled:grayscale"
                         >
                            {txStatus === "pending" ? "SYNCING..." : "REGISTER_TOKEN"}
                         </button>
                      )}
                   </div>
                )}

                {/* Commit Phase */}
                {election.phase === 1 && (
                   <div className="space-y-6">
                      {!isRegistered ? (
                         <div className="p-4 border border-red-900/40 bg-red-950/20 text-red-500 font-mono text-[10px] uppercase flex gap-3">
                            <AlertCircle size={16} /> Not registered for this ballot session.
                         </div>
                      ) : hasVoted ? (
                         <div className="space-y-6">
                            <div className="p-4 bg-accent/10 border border-accent/20 flex gap-4 text-accent animate-in zoom-in-95">
                               <ShieldCheck size={24} className="shrink-0" />
                               <p className="font-mono text-xs uppercase font-bold leading-tight">Commitment_Provisioned // Locked</p>
                            </div>
                            {saltInfo && <SaltDisplay saltHex={saltInfo.saltHex} voteHashHex={saltInfo.hashHex} />}
                         </div>
                      ) : (
                         <div className="space-y-4">
                            <p className="font-mono text-[10px] text-muted-foreground uppercase leading-relaxed text-center opacity-60">
                               Choose a candidate above and lock your encrypted commitment.
                            </p>
                            <button 
                              onClick={handleCommit}
                              disabled={selectedCandidate === null || txStatus === "pending"}
                              className="w-full h-12 border border-accent text-accent font-mono font-bold uppercase tracking-widest transition-all hover:bg-accent/10 active:scale-95 disabled:grayscale disabled:opacity-40"
                            >
                               {txStatus === "pending" ? "LOCKING..." : "CAST_COMMITMENT"}
                            </button>
                         </div>
                      )}
                   </div>
                )}

                {/* Reveal Phase */}
                {election.phase === 2 && (
                   <div className="space-y-6">
                      {!hasVoted ? (
                        <div className="p-4 border border-border bg-border/5 text-muted-foreground font-mono text-[10px] uppercase flex gap-3 italic">
                           <Info size={16} /> No commitment detected for this address.
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <p className="font-mono text-[10px] text-muted-foreground uppercase leading-relaxed text-center opacity-60">
                              Submit your secret salt to verify and count your ballot.
                           </p>
                           <button 
                             onClick={handleReveal}
                             disabled={txStatus === "pending"}
                             className="w-full h-12 bg-accent text-black font-mono font-bold uppercase tracking-widest transition-all hover:bg-accent/80 active:scale-95 disabled:grayscale"
                           >
                              {txStatus === "pending" ? "DECRYPTING..." : "REVEAL_BALLOT"}
                           </button>
                        </div>
                      )}
                   </div>
                )}

                {/* Final Stats */}
                <TransactionStatus status={txStatus} txId={txId} errorMessage={errorMessage} />
            </section>
        </div>

      </div>
    </PageShell>
  );
}
