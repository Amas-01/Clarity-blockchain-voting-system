"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { userSession, authenticate, disconnect, getAddress } from "@/lib/stacks-session";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
  refreshConnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const checkConnection = useCallback(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const stxAddress = getAddress(userData);
      setIsConnected(true);
      setAddress(stxAddress);
    } else {
      setIsConnected(false);
      setAddress(null);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = () => {
    authenticate();
  };

  const logout = () => {
    disconnect();
    setIsConnected(false);
    setAddress(null);
  };

  return (
    <WalletContext.Provider value={{
      isConnected,
      address,
      connect,
      disconnect: logout,
      refreshConnect: checkConnection
    }}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Custom hook to manage the Stacks wallet connection state.
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
