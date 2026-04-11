"use client";

import { truncateHash } from "@/lib/format";
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface TransactionStatusProps {
  txId: string | null;
  status: "idle" | "pending" | "success" | "error";
  errorMessage?: string | null;
}

/**
 * Display for monitoring transaction status.
 */
export default function TransactionStatus({ txId, status, errorMessage }: TransactionStatusProps) {
  if (status === "idle") return null;

  const network = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const explorerUrl = txId 
    ? `https://explorer.hiro.so/txid/${txId}${network === "testnet" ? "?chain=testnet" : ""}`
    : null;

  return (
    <div className="border border-border bg-surface p-4 space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex items-center gap-3">
        {status === "pending" && (
          <Loader2 className="text-accent animate-spin" size={20} />
        )}
        {status === "success" && (
          <CheckCircle2 className="text-green-500" size={20} />
        )}
        {status === "error" && (
          <XCircle className="text-red-500" size={20} />
        )}
        
        <span className="font-mono text-xs uppercase tracking-widest font-bold">
          {status === "pending" && "Transaction_Awaiting_Node..."}
          {status === "success" && "Transaction_Confirmed"}
          {status === "error" && "Transaction_Transmission_Failure"}
        </span>
      </div>

      {(status === "pending" || status === "success") && txId && (
        <div className="border-t border-border pt-3">
           <a 
             href={explorerUrl!} 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center justify-between group hover:text-accent transition-colors"
           >
              <span className="font-mono text-[10px] text-muted-foreground uppercase">Hashed_TX: {truncateHash(txId)}</span>
              <ExternalLink size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
           </a>
        </div>
      )}

      {status === "error" && (
        <div className="p-2 bg-red-950/20 text-red-400 font-mono text-[10px] uppercase border border-red-900/10">
           {errorMessage || "UNEXPECTED_PROTOCOL_ERROR"}
        </div>
      )}
    </div>
  );
}
