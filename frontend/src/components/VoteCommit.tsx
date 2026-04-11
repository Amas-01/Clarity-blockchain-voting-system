"use client";

import { useState } from "react";
import { CandidateDetails, getCandidateKey } from "@/lib/stacks-read";
import { castVote, parseContractError } from "@/lib/stacks-write";
import { useVoteCommitment } from "@/hooks/useVoteCommitment";
import { userSession, getAddress } from "@/lib/stacks-session";
import { Shield, Fingerprint, Lock, CheckCircle2, ChevronRight, AlertCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteCommitProps {
  electionId: number;
  candidates: CandidateDetails[];
  onSuccess: () => void;
}

export default function VoteCommit({ electionId, candidates, onSuccess }: VoteCommitProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const userData = userSession.loadUserData();
  const address = getAddress(userData);
  
  const { generateNewCommitment, saltHex, voteHashHex } = useVoteCommitment(electionId, address);

  const handleCommit = async () => {
    if (selectedCandidate === null) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Fetch the actual Candidate Key from the contract map
      const candidateKey = await getCandidateKey(electionId, selectedCandidate);
      if (!candidateKey) {
        throw new Error("Failed to retrieve cryptographic candidate key.");
      }

      // 2. Generate Salt & Commitment Hash (Hook handles persistence)
      const { voteHash } = await generateNewCommitment(candidateKey);

      // 3. Trigger Transaction
      castVote({
        electionId,
        candidateId: selectedCandidate,
        voteHash,
        onFinish: (txId) => {
          console.log("Transaction sent:", txId);
          setShowReceipt(true);
          onSuccess();
        },
        onCancel: () => setIsSubmitting(false)
      });

    } catch (err: any) {
      console.error("Commit error:", err);
      setError(parseContractError(err));
      setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    const candidate = candidates.find(c => c.id === selectedCandidate);
    const receipt = {
      electionId,
      voter: address,
      candidateId: selectedCandidate,
      candidateName: candidate?.name,
      salt: saltHex,
      commitmentHash: voteHashHex,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ballot-receipt-${electionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {!showReceipt ? (
          <motion.div 
            key="voter-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="border border-accent/20 bg-accent/5 p-5 glass flex gap-4 items-start">
              <Shield className="text-accent shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-serif text-sm uppercase tracking-wider text-accent mb-1">Encrypted_Ballot_Initialization</h4>
                <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                  Your selection will be masked by a unique 256-bit salt. Only the SHA-256 digest is recorded on-chain. 
                  The salt is stored securely in your browser's local sandbox for the reveal phase.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  disabled={isSubmitting}
                  onClick={() => setSelectedCandidate(candidate.id)}
                  className={`flex items-center justify-between p-5 border transition-premium text-left group relative overflow-hidden ${
                    selectedCandidate === candidate.id 
                      ? "border-accent bg-surface shadow-[0_0_20px_rgba(212,160,23,0.1)]" 
                      : "border-border hover:border-accent/30 bg-background/40"
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10">
                     <div className={`w-5 h-5 border flex items-center justify-center transition-premium ${
                       selectedCandidate === candidate.id ? "border-accent" : "border-border"
                     }`}>
                       {selectedCandidate === candidate.id && <div className="w-2.5 h-2.5 bg-accent" />}
                     </div>
                     <div>
                        <h5 className={`font-serif text-xl uppercase tracking-tighter ${selectedCandidate === candidate.id ? "text-accent" : "text-foreground"}`}>
                          {candidate.name}
                        </h5>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5 opacity-60">
                          Ref: {candidate.id.toString().padStart(2, '0')}
                        </p>
                     </div>
                  </div>
                  <ChevronRight size={18} className={`transition-premium ${selectedCandidate === candidate.id ? "text-accent translate-x-0" : "text-border -translate-x-2 opacity-0"}`} />
                </button>
              ))}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono flex gap-3 items-center"
              >
                <AlertCircle size={16} />
                <span>FAULT_DETECTED: {error}</span>
              </motion.div>
            )}

            <button
              disabled={selectedCandidate === null || isSubmitting}
              onClick={handleCommit}
              className="w-full h-14 bg-accent text-background font-mono font-bold uppercase tracking-widest disabled:opacity-20 disabled:grayscale transition-premium hover:bg-accent/90 flex items-center justify-center gap-4 relative overflow-hidden group shadow-[0_0_20px_rgba(212,160,23,0.2)]"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative flex items-center gap-3">
                {isSubmitting ? (
                  <>
                    <Fingerprint className="animate-pulse" size={20} />
                    Processing_Ballot...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Commit_Ballot_State
                  </>
                )}
              </span>
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="receipt-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
             <div className="border border-accent p-8 bg-surface glass relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Shield size={120} />
                </div>
                
                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                   <div className="w-16 h-16 rounded-full border border-accent flex items-center justify-center mb-2">
                      <CheckCircle2 size={32} className="text-accent" />
                   </div>
                   <h3 className="font-serif text-3xl uppercase tracking-tighter">Commitment_Authorized</h3>
                   <p className="font-mono text-xs text-muted-foreground max-w-xs">
                     Your hashed commitment has been broadcast to the Stacks network.
                   </p>
                </div>

                <div className="space-y-6 border-t border-border pt-6 font-mono text-xs">
                   <div className="space-y-1">
                      <span className="text-muted-foreground uppercase text-[9px]">Voter_Identity</span>
                      <p className="text-accent truncate">{address}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-muted-foreground uppercase text-[9px]">Election_ID</span>
                        <p className="text-foreground">{electionId}</p>
                      </div>
                      <div className="space-y-1">
                         <span className="text-muted-foreground uppercase text-[9px]">Candidate_ID</span>
                         <p className="text-foreground">{selectedCandidate}</p>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-muted-foreground uppercase text-[9px]">Salt_Entropy_Hex</span>
                      <p className="text-foreground break-all bg-background/40 p-2 border border-border">{saltHex}</p>
                   </div>
                </div>

                <button 
                  onClick={downloadReceipt}
                  className="mt-8 w-full border border-accent/20 py-3 font-mono text-[10px] uppercase tracking-widest text-accent hover:bg-accent/10 transition-premium flex items-center justify-center gap-2"
                >
                   <Download size={14} />
                   Download_Ballot_Receipt
                </button>
             </div>

             <div className="text-center">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                  Awaiting_Tally_Phase_Initialization
                </p>
                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                   <div className="w-1/3 h-full bg-accent animate-[loading_2s_ease-in-out_infinite]" />
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      <div className="text-[10px] font-mono text-muted-foreground/40 text-center uppercase tracking-[0.2em] pt-4">
        Protocol: Commit-Reveal // Authority: Stacks_Chain // Integrity: Verified
      </div>
    </div>
  );
}
