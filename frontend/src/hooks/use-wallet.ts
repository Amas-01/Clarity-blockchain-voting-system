"use client";

import { useState, useEffect, useCallback } from "react";
import { userSession, authenticate, disconnect, getAddress } from "@/lib/stacks-session";

/**
 * Custom hook to manage the Stacks wallet connection state.
 */
export function useWallet() {
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

  return {
    isConnected,
    address,
    connect,
    disconnect: logout,
    refreshConnect: checkConnection
  };
}
