/**
 * Pure formatting utilities for the UI.
 * No imports from other lib files allowed.
 */

/**
 * Returns first {chars} + "..." + last {chars} characters of an address.
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Returns first {chars} + "..." of a hex string.
 */
export function truncateHash(hex: string, chars = 8): string {
  if (hex.length <= chars + 3) return hex;
  return `${hex.slice(0, chars)}...`;
}

/**
 * Maps phase number to Tailwind text color classes.
 */
export function phaseColor(phase: number): string {
  switch (phase) {
    case 0: return "text-border";
    case 1: return "text-accent font-bold";
    case 2: return "text-[#D4A017]";
    case 3: return "text-green-500 opacity-80";
    default: return "text-muted-foreground";
  }
}

/**
 * Returns Tailwind className string for badge background + text based on phase.
 */
export function phaseBadgeStyle(phase: number): string {
  switch (phase) {
    case 0: return "bg-zinc-900 text-zinc-400 border border-zinc-800";
    case 1: return "bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/40 shadow-[0_0_10px_rgba(212,160,23,0.1)]";
    case 2: return "bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017] animate-pulse";
    case 3: return "bg-green-950/30 text-green-500/80 border border-green-900/50";
    default: return "bg-zinc-900 text-zinc-500 border border-zinc-800";
  }
}

/**
 * Estimates time remaining based on block height (Stacks ~10 min per block).
 */
export function blockHeightToEstimate(
  blockHeight: number,
  currentBlockHeight: number
): string {
  if (blockHeight <= currentBlockHeight) {
    return "Deadline passed";
  }

  const blocksRemaining = blockHeight - currentBlockHeight;
  const minutesRemaining = blocksRemaining * 10;

  if (minutesRemaining < 60) {
    return `~${minutesRemaining} minutes`;
  }

  const hoursRemaining = Math.floor(minutesRemaining / 60);
  if (hoursRemaining < 24) {
    return `~${hoursRemaining} hours`;
  }

  const daysRemaining = Math.floor(hoursRemaining / 24);
  return `~${daysRemaining} days`;
}
