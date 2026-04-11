import { 
  fetchCallReadOnlyFunction, 
  cvToValue, 
  uintCV, 
  principalCV, 
  tupleCV,
  serializeCV,
  deserializeCV, 
  ClarityValue,
  cvToJSON
} from "@stacks/transactions";
import { bytesToHex, hexToBytes } from "./commitment";
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
 * Helper to safely extract value from a JSON-ified CV.
 * Handles Response and Optional wrappers.
 */
function unwrapCV(json: any): any {
  if (!json) return null;
  
  // Handle Response/Optional wrappers
  if (json.type === "response-ok" || json.type === "optional-some") {
    return unwrapCV(json.value);
  }
  
  if (json.type === "response-error" || json.type === "optional-none") {
    return null;
  }

  // If it's a primitive with a .value, return it
  if (json.value !== undefined && typeof json.value !== 'object') {
    return json.value;
  }

  // If it's a tuple, unwrap its fields
  if (json.type === "tuple" && json.value) {
    const unwrapped: any = {};
    for (const key in json.value) {
      unwrapped[key] = unwrapCV(json.value[key]);
    }
    return unwrapped;
  }

  // If it's a list, unwrap its elements
  if (json.type === "list" && Array.isArray(json.value)) {
    return json.value.map((item: any) => unwrapCV(item));
  }

  return json.value ?? json;
}

/**
 * Maps the ok-tuple to ElectionDetails type.
 */
export async function getElectionDetails(electionId: number): Promise<ElectionDetails | null> {
  if (!Number.isInteger(electionId)) return null;
  try {
    const result = await readOnly("get-election-details", [uintCV(electionId)]);
    const json = cvToJSON(result);
    const data = unwrapCV(json);
    
    if (!data) return null;
    
    return {
      admin: data.admin,
      name: data.name,
      description: data.description,
      phase: Number(data.phase),
      regDeadline: Number(data["reg-deadline"]),
      votingDeadline: Number(data["voting-deadline"]),
      tallyDeadline: Number(data["tally-deadline"]),
    };
  } catch (e) {
    console.error("getElectionDetails error:", e);
    return null;
  }
}

/**
 * Returns array of election IDs as numbers.
 */
export async function getAllActiveElections(): Promise<number[]> {
  try {
    const result = await readOnly("get-all-active-elections", []);
    const data = unwrapCV(cvToJSON(result));
    return (data || []).map((v: any) => Number(v));
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
    const data = unwrapCV(cvToJSON(result));
    if (data === null) return null;
    const electionId = Number(data);
    return isNaN(electionId) ? null : electionId;
  } catch (e) {
    console.error("getElectionByAdmin failed:", e);
    return null;
  }
}

/**
 * Returns array of candidate ID numbers for the given election.
 */
export async function getAllCandidates(electionId: number): Promise<number[]> {
  if (!Number.isInteger(electionId)) return [];
  try {
    const result = await readOnly("get-all-candidates", [uintCV(electionId)]);
    const data = unwrapCV(cvToJSON(result));
    return (data || []).map((v: any) => Number(v));
  } catch (e) {
    return [];
  }
}

/**
 * Returns CandidateDetails or null if not found.
 */
export async function getCandidate(electionId: number, candidateId: number): Promise<CandidateDetails | null> {
  if (!Number.isInteger(electionId) || !Number.isInteger(candidateId)) return null;
  try {
    const result = await readOnly("get-candidate", [uintCV(electionId), uintCV(candidateId)]);
    const data = unwrapCV(cvToJSON(result));
    if (!data) return null;
    
    return {
      id: candidateId,
      name: data.name,
      description: data.description,
      votes: Number(data.votes),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Returns vote count or null on err.
 */
export async function getCandidateVotes(electionId: number, candidateId: number): Promise<number | null> {
  if (!Number.isInteger(electionId) || !Number.isInteger(candidateId)) return null;
  try {
    const result = await readOnly("get-candidate-votes", [uintCV(electionId), uintCV(candidateId)]);
    const data = unwrapCV(cvToJSON(result));
    return data !== null ? Number(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns winning candidate ID or null if no winner exists yet.
 */
export async function getElectionWinner(electionId: number): Promise<number | null> {
  if (!Number.isInteger(electionId)) return null;
  try {
    const result = await readOnly("get-election-winner", [uintCV(electionId)]);
    const data = unwrapCV(cvToJSON(result));
    return data !== null ? Number(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the voter is registered for the given election.
 */
export async function isRegistered(electionId: number, voterAddress: string): Promise<boolean> {
  if (!Number.isInteger(electionId)) return false;
  try {
    const result = await readOnly("is-registered", [uintCV(electionId), principalCV(voterAddress)]);
    return Boolean(unwrapCV(cvToJSON(result)));
  } catch (e) {
    return false;
  }
}

/**
 * Returns true if the voter has already cast a vote commitment.
 */
export async function hasVoted(electionId: number, voterAddress: string): Promise<boolean> {
  if (!Number.isInteger(electionId)) return false;
  try {
    const result = await readOnly("has-voted", [uintCV(electionId), principalCV(voterAddress)]);
    return Boolean(unwrapCV(cvToJSON(result)));
  } catch (e) {
    return false;
  }
}

/**
 * Directly fetches the 'key' (buff 32) from the candidates map.
 */
export async function getCandidateKey(electionId: number, candidateId: number): Promise<Uint8Array | null> {
  if (!Number.isInteger(electionId) || !Number.isInteger(candidateId)) return null;
  try {
    const network = getNetwork();
    const baseUrl = (network as any).coreApiUrl || (network as any).baseUrl || "https://api.testnet.hiro.so";
    const url = `${baseUrl}/v2/map_value/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/candidates`;
    
    const keyCV = tupleCV({
      "election-id": uintCV(electionId),
      "candidate-id": uintCV(candidateId)
    });
    
    const serialized = serializeCV(keyCV);
    const serializedHex = typeof serialized === "string" ? serialized : bytesToHex(serialized);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializedHex)
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.data || data.data === "0x") return null;
    
    const hex = data.data.startsWith("0x") ? data.data.slice(2) : data.data;
    const valueCV = deserializeCV(hexToBytes(hex));
    
    const json = cvToJSON(valueCV);
    const unwrapped = unwrapCV(json);
    
    if (unwrapped && unwrapped.key) {
       if (typeof unwrapped.key === 'string') return hexToBytes(unwrapped.key.startsWith('0x') ? unwrapped.key.slice(2) : unwrapped.key);
       return unwrapped.key;
    }
    
    return null;
  } catch (e) {
    console.error("getCandidateKey error:", e);
    return null;
  }
}
