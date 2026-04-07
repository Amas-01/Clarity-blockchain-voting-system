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
    case 0: return "text-blue-400";
    case 1: return "text-amber-400";
    case 2: return "text-orange-400";
    case 3: return "text-green-400";
    default: return "text-muted";
  }
}

/**
 * Returns Tailwind className string for badge background + text based on phase.
 */
export function phaseBadgeStyle(phase: number): string {
  switch (phase) {
    case 0: return "bg-blue-900/40 text-blue-300 border border-blue-700";
    case 1: return "bg-amber-900/40 text-amber-300 border border-amber-700";
    case 2: return "bg-orange-900/40 text-orange-300 border border-orange-700";
    case 3: return "bg-green-900/40 text-green-300 border border-green-700";
    default: return "bg-gray-900/40 text-gray-300 border border-gray-700";
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
