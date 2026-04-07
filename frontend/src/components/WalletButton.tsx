"use client";

import { useWallet } from "@/hooks/use-wallet";
import { truncateAddress } from "@/lib/format";

/**
 * Renders the wallet connection button with dark civic styling.
 */
export default function WalletButton() {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="px-6 py-2 border border-[#D4A017] text-[#D4A017] hover:bg-[#D4A017]/10 font-mono text-sm uppercase tracking-widest transition-all duration-300 active:scale-95"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[#D4A017] font-mono text-sm font-bold">
        {address ? truncateAddress(address) : "Connected"}
      </span>
      <button
        onClick={disconnect}
        className="text-muted-foreground hover:text-red-400 font-mono text-[10px] uppercase tracking-tighter transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
