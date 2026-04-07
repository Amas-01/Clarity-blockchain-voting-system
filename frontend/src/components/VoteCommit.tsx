"use client";

import { useState } from "react";
import { CandidateDetails } from "@/lib/stacks-read";
import { generateRandomSalt, generateCommitment, bytesToHex } from "@/lib/commitment";
import { castVote } from "@/lib/stacks-write";
import { userSession, getAddress } from "@/lib/stacks-session";
import { Shield, Fingerprint, Lock, CheckCircle2 } from "lucide-react";

interface VoteCommitProps {
  electionId: number;
  candidates: CandidateDetails[];
  onSuccess: () => void;
}

export default function VoteCommit({ electionId, candidates, onSuccess }: VoteCommitProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCommit = async () => {
    if (selectedCandidate === null) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // In this phase, we assume we have the candidateKey 
      // (Mocking it for now as a 32-byte buffer if not provided by contract)
      const candidateKey = new Uint8Array(32).fill(selectedCandidate); 

      // 2. Generate Salt
      const salt = generateRandomSalt();
      
      // 3. Compute Hash
      const voteHash = await generateCommitment(candidateKey, salt);

      // 4. Store choice and salt locally for the reveal phase
      const userData = userSession.loadUserData();
      const address = getAddress(userData);
      const storageKey = `vote-${address}-${electionId}`;
      
      localStorage.setItem(storageKey, JSON.stringify({
        candidateId: selectedCandidate,
        salt: bytesToHex(salt),
        candidateKey: bytesToHex(candidateKey)
      }));

      // 5. Trigger Transaction
      castVote({
        electionId,
        candidateId: selectedCandidate,
        voteHash,
        onFinish: (txId) => {
          console.log("Transaction sent:", txId);
          onSuccess();
        },
        onCancel: () => setIsSubmitting(false)
      });

    } catch (err: any) {
      console.error("Commit error:", err);
      setError(err.message || "Failed to prepare vote commitment");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="border border-accent/20 bg-accent/5 p-4 rounded-sm flex gap-4 items-start">
        <Shield className="text-accent shrink-0 mt-1" size={20} />
        <div>
          <h4 className="font-serif text-sm uppercase tracking-wider text-accent mb-1">Commitment_Phase_Active</h4>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            Choose your candidate. Your vote will be cryptographically hashed with a unique 256-bit salt. 
            Only the hash is sent to the blockchain. You MUST keep this browser data to reveal your vote later.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            onClick={() => setSelectedCandidate(candidate.id)}
            className={`flex items-center justify-between p-4 border transition-all text-left group ${
              selectedCandidate === candidate.id 
                ? "border-accent bg-accent/10 accent-glow" 
                : "border-border hover:border-accent/40 bg-background/40"
            }`}
          >
            <div className="flex items-center gap-4">
               <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                 selectedCandidate === candidate.id ? "border-accent" : "border-muted-foreground/30"
               }`}>
                 {selectedCandidate === candidate.id && <div className="w-2 h-2 bg-accent rounded-full" />}
               </div>
               <div>
                  <h5 className={`font-serif text-lg ${selectedCandidate === candidate.id ? "text-accent" : ""}`}>
                    {candidate.name}
                  </h5>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">Candidate_ID: {candidate.id}</p>
               </div>
            </div>
            {selectedCandidate === candidate.id && <CheckCircle2 size={18} className="text-accent" />}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono">
          ERROR: {error}
        </div>
      )}

      <button
        disabled={selectedCandidate === null || isSubmitting}
        onClick={handleCommit}
        className="w-full h-12 bg-accent text-black font-mono font-bold uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all hover:bg-accent/90 flex items-center justify-center gap-3 active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <Fingerprint className="animate-pulse" size={20} />
            Encrypting_Ballot...
          </>
        ) : (
          <>
            <Lock size={18} />
            Cast_Hashed_Commitment
          </>
        )}
      </button>

      <div className="text-[10px] font-mono text-muted-foreground/60 text-center leading-loose">
        PROTOCOL_ACTION: CAST_VOTE // REQUIRE_SALT: TRUE // PRIVACY_LEVEL: MAXIMUM
      </div>
    </div>
  );
}
