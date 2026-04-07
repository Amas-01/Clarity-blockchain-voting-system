"use client";

import { useState, useCallback } from "react";
import { generateRandomSalt, generateCommitment, bytesToHex } from "@/lib/commitment";

/**
 * Hook to manage the vote commitment generation and transient state.
 */
export function useVoteCommitment() {
  const [voteHash, setVoteHash] = useState<Uint8Array | null>(null);
  const [salt, setSalt] = useState<Uint8Array | null>(null);

  /**
   * Generates a new random salt and computes the commitment hash.
   * Note: Does not persist to localStorage yet; that's handled at the page level.
   */
  const generateNewCommitment = useCallback(async (
    candidateId: number,
    candidateKey: Uint8Array
  ) => {
    // Generate secure 32-byte salt
    const newSalt = generateRandomSalt();
    
    // Compute HASH(candidate-key ++ salt)
    const newHash = await generateCommitment(candidateKey, newSalt);
    
    setSalt(newSalt);
    setVoteHash(newHash);
    
    return { salt: newSalt, voteHash: newHash };
  }, []);

  const clearCommitment = useCallback(() => {
    setVoteHash(null);
    setSalt(null);
  }, []);

  return { 
    voteHash, 
    salt, 
    generateNewCommitment, 
    clearCommitment,
    voteHashHex: voteHash ? bytesToHex(voteHash) : null,
    saltHex: salt ? bytesToHex(salt) : null
  };
}
