"use client";

import { useState } from "react";
import { Candidate } from "@/hooks/use-election";
import { generateSalt, computeVoteHash, uint8ArrayToHex } from "@/lib/crypto-utils";
import { 
  fetchMapValue, 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  getNetwork,
  userSession,
  stacksBufferCV
} from "@/lib/stacks";
import { 
  uintCV, 
  serializeCV, 
  hexToCV,
  cvToHex
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { Shield, Fingerprint, Lock, CheckCircle2 } from "lucide-react";

interface VoteCommitProps {
  electionId: number;
  candidates: Candidate[];
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
      // 1. Fetch the candidate-key from the raw map
      // Map key: { election-id: uint, candidate-id: uint }
      const keyCV = {
        election_id: uintCV(electionId),
        candidate_id: uintCV(selectedCandidate),
      };
      
      // Need to serialize the key for the Hiro API map_value endpoint
      // The API expects a hex-serialized CV
      const response = await fetchMapValue("candidates", keyCV);
      
      if (!response.data) {
        throw new Error("Could not retrieve candidate security key");
      }

      // The response data is a hex string of the Clarity value (tuple)
      const candDataCV = hexToCV(response.data.slice(2)); // slice 0x
      // candDataCV is a tuple { name, description, key, votes }
      const candidateKeyBuff = (candDataCV as any).value.key.buffer; 

      // 2. Generate Salt
      const salt = generateSalt();
      
      // 3. Compute Hash
      const voteHash = await computeVoteHash(candidateKeyBuff, salt);

      // 4. Store choice and salt locally for the reveal phase
      const storageKey = `vote-${userSession.loadUserData().profile.stxAddress.testnet}-${electionId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        candidateId: selectedCandidate,
        salt: uint8ArrayToHex(salt)
      }));

      // 5. Trigger Transaction
      const network = getNetwork();
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "cast-vote",
        functionArgs: [
          uintCV(electionId),
          uintCV(selectedCandidate),
          stacksBufferCV(voteHash)
        ],
        network,
        onFinish: (data) => {
          console.log("Transaction sent:", data.txId);
          onSuccess();
        },
        onCancel: () => {
          setIsSubmitting(false);
        }
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
