"use client";

import { useEffect, useState, useCallback } from "react";
import { getElectionByAdmin } from "@/lib/stacks-read";
import { userSession, getAddress } from "@/lib/stacks-session";

/**
 * Hook to check if the current user (admin) has an active election.
 */
export default function useAdminElection() {
  const [electionId, setElectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminElection = useCallback(async () => {
    if (!userSession.isUserSignedIn()) {
      setLoading(false);
      setElectionId(null);
      return;
    }
    
    setLoading(true);
    try {
      const userData = userSession.loadUserData();
      const userPrincipal = getAddress(userData);

      const eid = await getElectionByAdmin(userPrincipal);
      setElectionId(eid);
    } catch (e) {
      console.error("Error fetching admin election ID:", e);
      setElectionId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminElection();
  }, [fetchAdminElection]);

  return { electionId, loading, refresh: fetchAdminElection };
}
