export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
export const CONTRACT_NAME    = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "voting-project";

/** 
 * Phase numeric values matching the Clarity contract constants exactly
 */
export const PHASE_REGISTER  = 0;
export const PHASE_VOTING    = 1;
export const PHASE_TALLY     = 2;
export const PHASE_COMPLETED = 3;

/**
 * Error code map: Clarity uint → human-readable string
 */
export const CONTRACT_ERRORS: Record<number, string> = {
  1001: "Admin already has an active election",
  1002: "Election not found",
  1003: "Not the election admin",
  1004: "Action not allowed in current phase",
  1005: "Voter registration is closed",
  1006: "Already registered for this election",
  1007: "Not registered for this election",
  1008: "Already cast a vote in this election",
  1009: "Candidate not found",
  1010: "Voting phase is not open",
  1011: "Tally phase is not open",
  1012: "Required deadline block not yet reached",
  1013: "Vote already revealed",
  1014: "Election already completed",
  1015: "Candidate name already exists",
  1016: "No winner determined yet",
  1017: "Hash mismatch — salt or candidate incorrect",
};

/**
 * Human-readable labels for each election phase
 */
export const PHASE_LABELS: Record<number, string> = {
  0: "Registration",
  1: "Voting",
  2: "Tally",
  3: "Completed",
};

/**
 * Descriptive text for each election phase
 */
export const PHASE_DESCRIPTIONS: Record<number, string> = {
  0: "Candidates are being added and voters are registering.",
  1: "Registered voters are casting encrypted commitments.",
  2: "Voters are revealing their votes for tallying.",
  3: "This election has been finalized.",
};
