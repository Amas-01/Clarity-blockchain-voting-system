"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  fetchCallReadOnlyFunction, 
  cvToJSON,
  uintCV
} from "@stacks/transactions";
import { 
  getNetwork, 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME,
  userSession,
  getAddress
} from "@/lib/stacks";
import { Election, Phase } from "./use-election";

export function useElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllElections = useCallback(async () => {
    setLoading(true);
    try {
      const network = getNetwork();
      const userData = userSession.isUserSignedIn() ? userSession.loadUserData() : null;
      const userPrincipal = getAddress(userData);

      // Get all active election IDs
      const result = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-all-active-elections",
        functionArgs: [],
        network,
        senderAddress: userPrincipal || CONTRACT_ADDRESS,
      });

      const idsData = cvToJSON(result).value;
      if (!Array.isArray(idsData)) {
          setElections([]);
          return;
      }

      const electionList: Election[] = [];

      for (const idObj of idsData) {
        const eid = Number(idObj.value);
        const detailsResult = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "get-election-details",
          functionArgs: [uintCV(eid)],
          network,
          senderAddress: userPrincipal || CONTRACT_ADDRESS,
        });
        
        const detailsJSON = cvToJSON(detailsResult);
        if (detailsJSON.value && !detailsJSON.value.error) {
          const val = detailsJSON.value.value;
          electionList.push({
            id: eid,
            admin: val.admin.value,
            name: val.name.value,
            description: val.description.value,
            phase: Number(val.phase.value) as Phase,
            regDeadline: Number(val["reg-deadline"].value),
            votingDeadline: Number(val["voting-deadline"].value),
            tallyDeadline: Number(val["tally-deadline"].value),
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
