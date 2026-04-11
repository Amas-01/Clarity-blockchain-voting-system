"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getElectionDetails,
  getAllCandidates,
  getCandidate,
  isRegistered as checkRegistration,
  hasVoted as checkVoted
} from "@/lib/stacks-read";
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

/**
 * Standard hook to fetch full election details and candidate data for a specific entry.
 */
export function useElection(electionId?: number) {
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchElection = useCallback(async () => {
    if (electionId === undefined || isNaN(electionId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userData = userSession.isUserSignedIn() ? userSession.loadUserData() : null;
      const userPrincipal = userData ? getAddress(userData) : null;

      // 1. Fetch Election Details
      const details = await getElectionDetails(electionId);
      if (details) {
        setElection({
          id: electionId,
          ...details,
          phase: details.phase as Phase
        });
      } else {
        setElection(null);
      }

      // 2. Fetch Candidates
      const candidateIds = await getAllCandidates(electionId);
      const candidateList: Candidate[] = [];
      
      for (const cid of candidateIds) {
        const cand = await getCandidate(electionId, cid);
        if (cand) {
          candidateList.push(cand);
        }
      }
      setCandidates(candidateList);

      // 3. User Voter Status (Mirroring useVoterStatus for integrated view)
      if (userPrincipal) {
        const [reg, voted] = await Promise.all([
          checkRegistration(electionId, userPrincipal),
          checkVoted(electionId, userPrincipal)
        ]);
        setIsRegistered(reg);
        setHasVoted(voted);
      } else {
        setIsRegistered(false);
        setHasVoted(false);
      }
    } catch (e) {
      console.error("Error fetching election in useElection hook:", e);
      setElection(null);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchElection();
  }, [fetchElection]);

  return { election, candidates, isRegistered, hasVoted, loading, refresh: fetchElection };
}
