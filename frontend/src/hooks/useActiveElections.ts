"use client";

import { useState, useCallback, useEffect } from "react";
import { getAllActiveElections } from "@/lib/stacks-read";

/**
 * Hook to fetch the list of all active election IDs.
 */
export function useActiveElections() {
  const [electionIds, setElectionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await getAllActiveElections();
      setElectionIds(ids);
    } catch (e) {
      console.error("Failed to fetch active elections:", e);
      setError("Failed to load elections. Check your network connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  return { electionIds, loading, error, refresh: fetchElections };
}
