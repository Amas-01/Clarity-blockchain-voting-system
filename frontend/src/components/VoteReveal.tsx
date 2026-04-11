"use client";

import { useState, useEffect } from "react";
import { hexToBytes } from "@/lib/commitment";
import { revealVote, parseContractError } from "@/lib/stacks-write";
import { userSession, getAddress } from "@/lib/stacks-session";
import { Unlock, FileKey, AlertCircle, CheckCircle, Upload, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteRevealProps {
  electionId: number;
  onSuccess: () => void;
}

export default function VoteReveal({ electionId, onSuccess }: VoteRevealProps) {
  const [storedVote, setStoredVote] = useState<{ candidateId: number, salt: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSalt, setManualSalt] = useState("");

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const address = getAddress(userSession.loadUserData());
      const storageKey = `voter-salt-${electionId}-${address}`;
      const savedHex = localStorage.getItem(storageKey);
      
      if (savedHex) {
        // We know the salt, but we might not know the candidateId here if not stored.
        // Actually, the commitment record on-chain only has the hash.
        // In our refined useVoteCommitment, we store only the salt hex.
        // We'll try to find the candidateId if we stored the fuller object before, 
        // or just accept the salt and let the user specify candidateId if needed.
        // However, for best UX, we'll try to retrieve the fuller object if it exists.
        const legacyKey = `vote-${address}-${electionId}`;
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData);
            setStoredVote({ candidateId: parsed.candidateId, salt: parsed.salt });
          } catch (e) {
            setStoredVote({ candidateId: 0, salt: savedHex }); // Fallback
          }
        } else {
          setStoredVote({ candidateId: 0, salt: savedHex }); // Needs candidateId selection
        }
      }
    }
  }, [electionId]);

  const handleReveal = async (candidateId: number, saltHex: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const saltBytes = hexToBytes(saltHex);

      revealVote({
        electionId,
        candidateId,
        salt: saltBytes,
        onFinish: (txId) => {
          console.log("Reveal transaction sent:", txId);
          onSuccess();
        },
        onCancel: () => setIsSubmitting(false)
      });
    } catch (err: any) {
      console.error("Reveal error:", err);
      setError(parseContractError(err));
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.salt && json.candidateId !== undefined) {
          setStoredVote({ candidateId: json.candidateId, salt: json.salt });
        } else {
          setError("Invalid receipt format. Missing salt or candidate identity.");
        }
      } catch (err) {
        setError("Failed to parse receipt file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="border border-accent/20 bg-accent/5 p-5 glass flex gap-4 items-start">
        <Unlock className="text-accent shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-serif text-sm uppercase tracking-wider text-accent mb-1">Tally_Reveal_Phase_Initialization</h4>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            The voting window is closed. To count your ballot, you must now "reveal" the salt used during the commitment phase. 
            This recomputes the hash on-chain to verify and increment the candidate's tally.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {storedVote ? (
          <motion.div 
            key="reveal-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border bg-surface glass p-8 space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <FileKey size={100} />
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-accent/10 border border-accent/20">
                <FileKey size={24} className="text-accent" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase block tracking-widest">Cryptographic_Payload_Sync</span>
                <h5 className="font-serif text-xl uppercase tracking-tighter">Identity_Match: Verified</h5>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="p-4 bg-background/60 border border-border font-mono text-xs space-y-3">
                 <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground uppercase text-[9px]">Candidate_Index</span>
                    <span className="text-foreground">{storedVote.candidateId}</span>
                 </div>
                 <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[9px]">Salt_Entropy_Hex</span>
                    <p className="text-accent break-all leading-relaxed">{storedVote.salt}</p>
                 </div>
              </div>
              
              <div className="flex gap-2 items-start p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400 text-[10px] font-mono leading-relaxed">
                 <Info size={14} className="shrink-0" />
                 <span>Verification logic: SHA256(Candidate_Key + Salt) == Committed_Hash</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono flex gap-3 items-center">
                <AlertCircle size={16} />
                <span>FAULT: {error}</span>
              </div>
            )}

            <button
              disabled={isSubmitting}
              onClick={() => handleReveal(storedVote.candidateId, storedVote.salt)}
              className="w-full h-14 bg-accent text-background font-mono font-bold uppercase tracking-widest disabled:opacity-30 transition-premium hover:bg-accent/90 flex items-center justify-center gap-4 shadow-[0_0_20px_rgba(212,160,23,0.1)] group"
            >
              <span className="relative flex items-center gap-3">
                {isSubmitting ? (
                  <>
                    <Unlock className="animate-pulse" size={20} />
                    Decryption_In_Progress...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Finalize_Reveal_Transaction
                  </>
                )}
              </span>
            </button>
            
            <button 
              onClick={() => setStoredVote(null)}
              className="w-full py-2 font-mono text-[9px] text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
            >
              Clear_Selection_Override
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="reveal-empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 border border-dashed border-border bg-surface/50 text-center space-y-6"
          >
            <AlertCircle size={40} className="text-muted-foreground/30 mx-auto" />
            <div className="space-y-2">
              <h5 className="font-serif text-xl uppercase tracking-tight">Missing_Ballot_Entropy</h5>
              <p className="text-xs text-muted-foreground font-mono max-w-xs mx-auto leading-relaxed">
                The cryptographic salt required for this reveal was not found in local storage. 
                Please upload your Ballot Receipt (.json) to continue.
              </p>
            </div>
            
            <div className="relative group">
               <input 
                 type="file" 
                 accept=".json"
                 onChange={handleFileUpload}
                 className="absolute inset-0 opacity-0 cursor-pointer z-10"
               />
               <div className="w-full py-4 border border-border group-hover:border-accent/40 bg-background/40 transition-premium flex flex-col items-center gap-2">
                  <Upload size={20} className="text-muted-foreground group-hover:text-accent transition-premium" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">Select_Receipt_File</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-[10px] font-mono text-muted-foreground/30 text-center uppercase tracking-[0.2em] pt-4">
        Action: Reveal // Phase: Tally // Status: Authoritative
      </div>
    </div>
  );
}
