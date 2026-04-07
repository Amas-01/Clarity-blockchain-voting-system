"use client";

import { useState } from "react";
import { AlertCircle, Copy, Check } from "lucide-react";

interface SaltDisplayProps {
  saltHex: string;
  voteHashHex: string;
}

/**
 * Critical warning for voters to save their salt.
 */
export default function SaltDisplay({ saltHex, voteHashHex }: SaltDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(saltHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-red-500/50 bg-red-500/5 p-6 space-y-6 rounded-sm animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="flex items-start gap-4">
        <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
        <div className="space-y-1">
           <h4 className="font-serif text-lg text-red-500 uppercase tracking-tighter decoration-red-500/30 underline-offset-4">
             ⚠ Save Your Vote Key — Cannot Be Recovered
           </h4>
           <p className="text-xs text-muted-foreground font-mono leading-relaxed">
             You must provide this key during the Tally phase to have your vote counted. 
             If you lose it, your vote cannot be revealed and your privacy remains locked forever.
           </p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-red-500/20">
        <div className="space-y-1.5">
           <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-60">Your Secret Salt:</label>
           <div className="p-3 bg-red-950/20 border border-red-900/40 font-mono text-xs text-[#D4A017] break-all group relative">
              {saltHex}
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-60">Vote Commitment Hash:</label>
           <div className="p-3 bg-surface/40 border border-border font-mono text-[10px] text-muted-foreground break-all">
              {voteHashHex}
           </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full h-12 flex items-center justify-center gap-3 bg-[#D4A017] hover:bg-[#D4A017]/90 text-black font-mono font-bold uppercase tracking-widest transition-all text-xs active:scale-95"
        >
          {copied ? (
            <>
              <Check size={18} /> COPIED_TO_CLIPBOARD
            </>
          ) : (
            <>
              <Copy size={18} /> COPY_SALT_TO_CLIPBOARD
            </>
          )}
        </button>
      </div>
    </div>
  );
}
