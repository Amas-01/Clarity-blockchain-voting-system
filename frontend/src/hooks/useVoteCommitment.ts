"use client";

import { useState, useCallback, useEffect } from "react";
import { generateRandomSalt, generateCommitment, bytesToHex, hexToBytes } from "@/lib/commitment";

/**
 * Hook to manage the vote commitment generation and persistence.
 * Voter salts are stored in localStorage keyed by election and voter address.
 */
export function useVoteCommitment(electionId?: number, userAddress?: string) {
  const [voteHash, setVoteHash] = useState<Uint8Array | null>(null);
  const [salt, setSalt] = useState<Uint8Array | null>(null);

  // Key for local storage
  const storageKey = (electionId !== undefined && userAddress) 
    ? `voter-salt-${electionId}-${userAddress}` 
    : null;

  // Load salt from storage on mount or identity change
  useEffect(() => {
    if (!storageKey) return;
    
    const savedHex = localStorage.getItem(storageKey);
    if (savedHex) {
      try {
        setSalt(hexToBytes(savedHex));
      } catch (e) {
        console.error("Failed to parse saved salt:", e);
      }
    }
  }, [storageKey]);

  /**
   * Generates a new random salt and computes the commitment hash.
   * Persists the salt to localStorage if electionId and userAddress are provided.
   */
  const generateNewCommitment = useCallback(async (
    candidateKey: Uint8Array
  ) => {
    // Generate secure 32-byte salt
    const newSalt = generateRandomSalt();
    
    // Compute HASH(candidate-key ++ salt)
    const newHash = await generateCommitment(candidateKey, newSalt);
    
    setSalt(newSalt);
    setVoteHash(newHash);

    // Persist salt
    if (storageKey) {
      localStorage.setItem(storageKey, bytesToHex(newSalt));
    }
    
    return { salt: newSalt, voteHash: newHash };
  }, [storageKey]);

  const clearCommitment = useCallback(() => {
    setVoteHash(null);
    setSalt(null);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return { 
    voteHash, 
    salt, 
    generateNewCommitment, 
    clearCommitment,
    voteHashHex: voteHash ? bytesToHex(voteHash) : null,
    saltHex: salt ? bytesToHex(salt) : null,
    hasStoredSalt: !!salt
  };
}
