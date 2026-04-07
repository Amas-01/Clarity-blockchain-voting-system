"use client";

import { useCurrentBlockHeight } from "@/hooks/useCurrentBlockHeight";
import { blockHeightToEstimate } from "@/lib/format";

interface BlockHeightInfoProps {
  label: string;
  targetBlock: number;
}

/**
 * Display for target block height with time estimation.
 */
export default function BlockHeightInfo({ label, targetBlock }: BlockHeightInfoProps) {
  const { height, loading } = useCurrentBlockHeight();

  return (
    <div className="flex items-center gap-2 font-mono text-xs py-1 transition-all duration-500">
      <span className="text-muted-foreground uppercase opacity-70 border-l border-border pl-3">
        {label}
      </span>
      <span className="text-accent font-bold tracking-widest px-2 py-0.5 bg-accent/5 rounded-sm">
        #{targetBlock}
      </span>
      {loading ? (
        <div className="h-4 w-24 bg-surface/50 animate-pulse rounded-sm" />
      ) : (
        <span className="text-muted-foreground italic text-[10px] opacity-60">
          ({blockHeightToEstimate(targetBlock, height!)})
        </span>
      )}
    </div>
  );
}
