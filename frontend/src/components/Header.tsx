"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userSession, authenticate, disconnect, getAddress } from "@/lib/stacks-session";
import { User, LogOut, LayoutDashboard, Vote } from "lucide-react";

export default function Header() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const userAddress = userData ? getAddress(userData) : "";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center transform group-hover:rotate-12 transition-transform">
            <Vote size={20} className="text-black" />
          </div>
          <span className="font-serif text-xl tracking-tight">VOTE<span className="text-accent">.</span>GOV</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-mono hover:text-accent transition-colors">
            ELECTIONS
          </Link>
          <Link href="/admin" className="text-sm font-mono hover:text-accent transition-colors">
            ADMIN
          </Link>

          {userData ? (
            <div className="flex items-center gap-4 pl-4 border-l border-border">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Connected</span>
                <span className="text-xs font-mono text-accent">
                  {userAddress.slice(0, 5)}...{userAddress.slice(-5)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="p-2 hover:bg-border/50 rounded-sm transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={authenticate}
              className="bg-accent text-black px-4 py-1.5 text-xs font-mono font-bold hover:bg-accent/90 transition-all rounded-sm accent-glow"
            >
              CONNECT_WALLET
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
