"use client";

import { useState, useEffect } from "react";
import { hexToUint8Array } from "@/lib/crypto-utils";
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  getNetwork,
  userSession,
  stacksBufferCV
} from "@/lib/stacks";
import { uintCV } from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { Unlock, FileKey, AlertTriangle, CheckCircle } from "lucide-react";

interface VoteRevealProps {
  electionId: number;
  onSuccess: () => void;
}

export default function VoteReveal({ electionId, onSuccess }: VoteRevealProps) {
  const [storedVote, setStoredVote] = useState<{ candidateId: number, salt: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const address = userSession.loadUserData().profile.stxAddress.testnet;
      const storageKey = `vote-${address}-${electionId}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        setStoredVote(JSON.parse(data));
      }
    }
  }, [electionId]);

  const handleReveal = async () => {
    if (!storedVote) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const network = getNetwork();
      const saltBytes = hexToUint8Array(storedVote.salt);

      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "reveal-vote",
        functionArgs: [
          uintCV(electionId),
          uintCV(storedVote.candidateId),
          stacksBufferCV(saltBytes)
        ],
        network,
        onFinish: (data) => {
          console.log("Reveal transaction sent:", data.txId);
          onSuccess();
        },
        onCancel: () => {
          setIsSubmitting(false);
        }
      });
    } catch (err: any) {
      console.error("Reveal error:", err);
      setError(err.message || "Failed to reveal vote");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="border border-blue-400/20 bg-blue-400/5 p-4 rounded-sm flex gap-4 items-start">
        <Unlock className="text-blue-400 shrink-0 mt-1" size={20} />
        <div>
          <h4 className="font-serif text-sm uppercase tracking-wider text-blue-400 mb-1">Reveal_Phase_Active</h4>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            The voting period has ended. It is now time to reveal your ballot. 
            The system has retrieved your stored salt. Confirm below to decrypt and tally your vote.
          </p>
        </div>
      </div>

      {storedVote ? (
        <div className="border border-border bg-background/40 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-sm">
                <FileKey size={20} className="text-accent" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase block tracking-widest">Encrypted_Payload_Detected</span>
                <span className="text-sm font-mono text-foreground tracking-tight">CANDIDATE_ID: {storedVote.candidateId}</span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 uppercase">Valid_Salt</div>
          </div>

          <div className="p-3 bg-black/40 border border-border text-[10px] font-mono text-muted-foreground break-all leading-relaxed">
            SALT_HEX: {storedVote.salt}
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <button
            disabled={isSubmitting}
            onClick={handleReveal}
            className="w-full h-12 bg-blue-500 text-black font-mono font-bold uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all hover:bg-blue-400 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Unlock className="animate-pulse" size={18} />
                Revealing_Ballot...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Confirm_Reveal_Transaction
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-8 border border-dashed border-red-900/30 bg-red-900/5 text-center space-y-4">
          <AlertTriangle size={32} className="text-red-500 mx-auto" />
          <div>
            <h5 className="font-serif text-lg text-red-400 uppercase tracking-tight">No_Stashed_Vote_Found</h5>
            <p className="text-xs text-muted-foreground font-mono mt-2 max-w-xs mx-auto">
              We couldn't find the salt required to reveal your vote for this election in your browser's local storage.
            </p>
          </div>
        </div>
      )}

      <div className="text-[10px] font-mono text-muted-foreground/60 text-center leading-loose">
        PROTOCOL_ACTION: REVEAL_SALT // TALLY_WINDOW: OPEN // INTEGRITY: VERIFIED
      </div>
    </div>
  );
}
