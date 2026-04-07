"use client";

import { useState, useEffect } from "react";
import { getNetwork } from "@/lib/network";
import { defaultUrlFromNetwork } from "@stacks/network";

/**
 * Custom hook to fetch and keep track of the current Stacks block height.
 */
export function useCurrentBlockHeight() {
  const [height, setHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeight = async () => {
      try {
        const network = getNetwork();
        const baseUrl = defaultUrlFromNetwork(network);
        const response = await fetch(`${baseUrl}/v2/info`);
        const data = await response.json();
        setHeight(data.stacks_tip_height);
      } catch (error) {
        console.error("Failed to fetch block height:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeight();
    const interval = setInterval(fetchHeight, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return { height, loading };
}
