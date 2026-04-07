"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  fetchCallReadOnlyFunction, 
  cvToJSON,
  principalCV,
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

export function useAdmin() {
  const [adminElection, setAdminElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminElection = useCallback(async () => {
    if (!userSession.isUserSignedIn()) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const network = getNetwork();
      const userData = userSession.loadUserData();
      const userPrincipal = getAddress(userData);

      const result = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-election-by-admin",
        functionArgs: [principalCV(userPrincipal)],
        network,
        senderAddress: userPrincipal,
      });

      const json = cvToJSON(result);
      if (json.value && !json.value.error) {
        const eid = Number(json.value.value);
        
        const detailsResult = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "get-election-details",
          functionArgs: [uintCV(eid)],
          network,
          senderAddress: userPrincipal,
        });
        
        const detailsJSON = cvToJSON(detailsResult);
        if (detailsJSON.value && !detailsJSON.value.error) {
          const val = detailsJSON.value.value;
          setAdminElection({
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
      } else {
        setAdminElection(null);
      }
    } catch (e) {
      console.error("Error fetching admin election:", e);
      setAdminElection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminElection();
  }, [fetchAdminElection]);

  return { adminElection, loading, refresh: fetchAdminElection };
}
