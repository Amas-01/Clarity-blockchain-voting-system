"use client";

import { useEffect, useState, useCallback } from "react";
import { isRegistered as checkRegistration, hasVoted as checkVoted } from "@/lib/stacks-read";
import { userSession, getAddress } from "@/lib/stacks-session";

/**
 * Hook to check the current user's registration and voting status for a specific election.
 */
export function useVoterStatus(electionId: number) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!userSession.isUserSignedIn()) {
      setIsRegistered(false);
      setHasVoted(false);
      setLoading(false);
      return;
    }

    if (electionId === undefined || isNaN(electionId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userData = userSession.loadUserData();
      const address = getAddress(userData);

      const [registered, voted] = await Promise.all([
        checkRegistration(electionId, address),
        checkVoted(electionId, address)
      ]);

      setIsRegistered(registered);
      setHasVoted(voted);
    } catch (e) {
      console.error("Error fetching voter status:", e);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { isRegistered, hasVoted, loading, refresh: fetchStatus };
}
