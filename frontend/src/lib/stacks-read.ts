import { 
  fetchCallReadOnlyFunction, 
  cvToValue, 
  uintCV, 
  principalCV, 
  ClarityValue 
} from "@stacks/transactions";
import { getNetwork } from "./network";
import { CONTRACT_ADDRESS, CONTRACT_NAME } from "./constants";

/**
 * TypeScript interfaces for election and candidate data
 */
export interface ElectionDetails {
  admin: string;
  name: string;
  description: string;
  phase: number;
  regDeadline: number;
  votingDeadline: number;
  tallyDeadline: number;
}

export interface CandidateDetails {
  id: number;
  name: string;
  description: string;
  votes: number;
}

/**
 * Helper to call read-only functions on the Clarity contract.
 */
async function readOnly(
  functionName: string,
  functionArgs: ClarityValue[]
): Promise<ClarityValue> {
  const network = getNetwork();
  return fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    network,
    senderAddress: CONTRACT_ADDRESS, 
  });
}

/**
 * Maps the ok-tuple to ElectionDetails type.
 */
export async function getElectionDetails(electionId: number): Promise<ElectionDetails | null> {
  try {
    const result = await readOnly("get-election-details", [uintCV(electionId)]);
    const val = cvToValue(result);
    if (!val || val.type === 'response-error' || val.value === null) return null;
    
    // The contract returns (ok (tuple ...)) or (err ...)
    const data = val.value;
    return {
      admin: data.admin.value,
      name: data.name.value,
      description: data.description.value,
      phase: Number(data.phase.value),
      regDeadline: Number(data["reg-deadline"].value),
      votingDeadline: Number(data["voting-deadline"].value),
      tallyDeadline: Number(data["tally-deadline"].value),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Returns array of election IDs as numbers.
 */
export async function getAllActiveElections(): Promise<number[]> {
  try {
    const result = await readOnly("get-all-active-elections", []);
    const val = cvToValue(result);
    // Returns (list uint)
    return (val || []).map((v: any) => Number(v.value));
  } catch (e) {
    return [];
  }
}

/**
 * Returns election ID number or null if the admin has no active election.
 */
export async function getElectionByAdmin(adminAddress: string): Promise<number | null> {
  try {
    const result = await readOnly("get-election-by-admin", [principalCV(adminAddress)]);
    const val = cvToValue(result);
    if (!val || val.type === 'response-error') return null;
    return Number(val.value.value);
  } catch (e) {
    return null;
  }
}

/**
 * Returns array of candidate ID numbers for the given election.
 */
export async function getAllCandidates(electionId: number): Promise<number[]> {
  try {
    const result = await readOnly("get-all-candidates", [uintCV(electionId)]);
    const val = cvToValue(result);
    // Returns (ok (list uint))
    return (val.value || []).map((v: any) => Number(v.value));
  } catch (e) {
    return [];
  }
}

/**
 * Returns CandidateDetails or null if not found.
 */
export async function getCandidate(electionId: number, candidateId: number): Promise<CandidateDetails | null> {
  try {
    const result = await readOnly("get-candidate", [uintCV(electionId), uintCV(candidateId)]);
    const val = cvToValue(result);
    if (!val || val.type === 'response-error') return null;
    
    const data = val.value;
    return {
      id: candidateId,
      name: data.name.value,
      description: data.description.value,
      votes: Number(data.votes.value),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Returns vote count or null on err (including E_TALLY_NOT_OPEN).
 */
export async function getCandidateVotes(electionId: number, candidateId: number): Promise<number | null> {
  try {
    const result = await readOnly("get-candidate-votes", [uintCV(electionId), uintCV(candidateId)]);
    const val = cvToValue(result);
    if (!val || val.type === 'response-error') return null;
    return Number(val.value.value);
  } catch (e) {
    return null;
  }
}

/**
 * Returns winning candidate ID or null if no winner exists yet.
 */
export async function getElectionWinner(electionId: number): Promise<number | null> {
  try {
    const result = await readOnly("get-election-winner", [uintCV(electionId)]);
    const val = cvToValue(result);
    if (!val || val.type === 'response-error') return null;
    return Number(val.value.value);
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the voter is registered for the given election.
 */
export async function isRegistered(electionId: number, voterAddress: string): Promise<boolean> {
  try {
    const result = await readOnly("is-registered", [uintCV(electionId), principalCV(voterAddress)]);
    const val = cvToValue(result);
    // Returns bool
    return Boolean(val);
  } catch (e) {
    return false;
  }
}

/**
 * Returns true if the voter has already cast a vote commitment.
 */
export async function hasVoted(electionId: number, voterAddress: string): Promise<boolean> {
  try {
    const result = await readOnly("has-voted", [uintCV(electionId), principalCV(voterAddress)]);
    const val = cvToValue(result);
    // Returns bool
    return Boolean(val);
  } catch (e) {
    return false;
  }
}
