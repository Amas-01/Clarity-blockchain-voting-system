"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getElectionByAdmin,
  getElectionDetails
} from "@/lib/stacks-read";
import { userSession, getAddress } from "@/lib/stacks-session";
import { ElectionDetails } from "@/lib/stacks-read";

export interface Election extends ElectionDetails {
  id: number;
}

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
      const userData = userSession.loadUserData();
      const userPrincipal = getAddress(userData);

      const eid = await getElectionByAdmin(userPrincipal);
      if (eid !== null) {
        const details = await getElectionDetails(eid);
        if (details) {
          setAdminElection({
            id: eid,
            ...details
          });
          return;
        }
      }
      setAdminElection(null);
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
