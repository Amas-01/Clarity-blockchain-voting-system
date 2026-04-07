"use client";

import Link from "next/link";
import WalletButton from "./WalletButton";

/**
 * Standard top navigation with dark civic styling.
 */
export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border z-50 px-6 backdrop-blur-md bg-opacity-80">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        <Link 
          href="/" 
          className="font-serif text-[#D4A017] text-2xl uppercase tracking-[0.3em] font-bold hover:opacity-80 transition-opacity"
        >
          VOTECHAIN
        </Link>
        
        <div className="flex items-center gap-10">
          <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
            <Link href="/" className="hover:text-accent transition-colors">Elections</Link>
            <Link href="/admin" className="hover:text-accent transition-colors">Admin</Link>
          </div>
          
          <div className="h-8 w-[1px] bg-border mx-2" />
          
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
