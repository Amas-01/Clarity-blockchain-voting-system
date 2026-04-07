"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getAllActiveElections,
  getElectionDetails
} from "@/lib/stacks-read";
import { Election, Phase } from "./useElection";

export function useElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllElections = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await getAllActiveElections();
      const electionList: Election[] = [];

      for (const eid of ids) {
        const details = await getElectionDetails(eid);
        if (details) {
          electionList.push({
            id: eid,
            admin: details.admin,
            name: details.name,
            description: details.description,
            phase: details.phase as Phase,
            regDeadline: details.regDeadline,
            votingDeadline: details.votingDeadline,
            tallyDeadline: details.tallyDeadline
          });
        }
      }
      setElections(electionList);
    } catch (e) {
      console.error("Error fetching elections:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllElections();
  }, [fetchAllElections]);

  return { elections, loading, refresh: fetchAllElections };
}
