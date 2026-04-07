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
  1001: "Admin already has an active election session",
  1002: "Referenced election session was not found",
  1003: "Access denied: caller is not the authorized admin",
  1004: "Invalid protocol phase for the requested operation",
  1005: "Voter registration for this session is closed",
  1006: "Identity duplicate: voter is already registered",
  1007: "Voter identity not found in registration ledger",
  1008: "Duplicate vote commitment: ballot already cast",
  1009: "Referenced candidate identity not found",
  1010: "Voting phase is currently locked",
  1011: "Tally/reveal phase is currently locked",
  1012: "Required network block height not yet reached",
  1013: "Ballot commitment has already been revealed",
  1014: "Election session is finalized and completed",
  1015: "Duplicate identity: candidate name already exists",
  1016: "Outcome pending: no winner determined yet",
  1017: "Reveal failure: hash mismatch detected",
};

/**
 * Human-readable labels for each election phase
 */
export const PHASE_LABELS: Record<number, string> = {
  0: "Registration",
  1: "Voting_Commit",
  2: "Tally_Reveal",
  3: "Finalized",
};

/**
 * Descriptive text for each election phase
 */
export const PHASE_DESCRIPTIONS: Record<number, string> = {
  0: "Authored admins provision candidates. Authorized voters verify identity.",
  1: "Registered identities cast cryptographically salted commitments.",
  2: "Participants provide secrets to unlock and count individual ballots.",
  3: "Ballot results finalized on-chain. Immutable ledger archive.",
};
