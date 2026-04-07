"use client";

import { userSession, authenticate, disconnect, getAddress } from "@/lib/stacks";
import { useEffect, useState } from "react";
import { Vote, LogOut, Wallet } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  if (!mounted) return null;

  const stxAddress = getAddress(userData);

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <Vote className="w-6 h-6 text-accent" />
              </div>
              <span className="font-serif text-xl tracking-tight text-foreground">
                VOTE<span className="text-accent">X</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {userSession.isUserSignedIn() ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-mono">
                    Authenticated
                  </span>
                  <span className="text-xs font-mono text-foreground/80">
                    {stxAddress.slice(0, 6)}...{stxAddress.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="p-2 text-foreground/60 hover:text-accent hover:bg-accent/10 rounded-full transition-all"
                  title="Disconnect"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={authenticate}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-background font-mono text-xs uppercase tracking-widest font-bold hover:bg-accent/90 transition-all accent-glow active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
