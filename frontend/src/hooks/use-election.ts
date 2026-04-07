"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  fetchCallReadOnlyFunction, 
  uintCV, 
  principalCV,
  cvToJSON
} from "@stacks/transactions";
import { getNetwork } from "@/lib/network";
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME
} from "@/lib/constants";
import { userSession, getAddress } from "@/lib/stacks-session";

export type Phase = 0 | 1 | 2 | 3;

export interface Election {
  id: number;
  admin: string;
  name: string;
  description: string;
  phase: Phase;
  regDeadline: number;
  votingDeadline: number;
  tallyDeadline: number;
}

export interface Candidate {
  id: number;
  name: string;
  description: string;
  votes: number;
}

export function useElection(electionId?: number) {
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchElection = useCallback(async () => {
    if (!electionId) return;
    setLoading(true);
    try {
      const network = getNetwork();
      const userData = userSession.loadUserData();
      const userPrincipal = getAddress(userData);

      // Get election details
      const detailsResult = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-election-details",
        functionArgs: [uintCV(electionId)],
        network,
        senderAddress: userPrincipal || CONTRACT_ADDRESS,
      });
      
      const detailsJSON = cvToJSON(detailsResult);
      if (detailsJSON.value && !detailsJSON.value.error) {
        const val = detailsJSON.value.value;
        setElection({
          id: electionId,
          admin: val.admin.value,
          name: val.name.value,
          description: val.description.value,
          phase: Number(val.phase.value) as Phase,
          regDeadline: Number(val["reg-deadline"].value),
          votingDeadline: Number(val["voting-deadline"].value),
          tallyDeadline: Number(val["tally-deadline"].value),
        });
      }

      // Get candidates
      const candidatesResult = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-all-candidates",
        functionArgs: [uintCV(electionId)],
        network,
        senderAddress: userPrincipal || CONTRACT_ADDRESS,
      });

      const candidateIds = (cvToJSON(candidatesResult).value || []) as any[];
      const candidateList: Candidate[] = [];
      
      for (const cid of candidateIds) {
        const candResult = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "get-candidate",
          functionArgs: [uintCV(electionId), uintCV(cid.value)],
          network,
          senderAddress: userPrincipal || CONTRACT_ADDRESS,
        });
        const candJSON = cvToJSON(candResult).value.value;
        candidateList.push({
          id: Number(cid.value),
          name: candJSON.name.value,
          description: candJSON.description.value,
          votes: Number(candJSON.votes.value),
        });
      }
      setCandidates(candidateList);

      // User status
      if (userPrincipal) {
        const regResult = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "is-registered",
          functionArgs: [uintCV(electionId), principalCV(userPrincipal)],
          network,
          senderAddress: userPrincipal,
        });
        setIsRegistered(cvToJSON(regResult).value);

        const votedResult = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "has-voted",
          functionArgs: [uintCV(electionId), principalCV(userPrincipal)],
          network,
          senderAddress: userPrincipal,
        });
        setHasVoted(cvToJSON(votedResult).value);
      }
    } catch (e) {
      console.error("Error fetching election:", e);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchElection();
  }, [fetchElection]);

  return { election, candidates, isRegistered, hasVoted, loading, refresh: fetchElection };
}
