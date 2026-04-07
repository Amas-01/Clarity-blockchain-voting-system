import { openContractCall } from "@stacks/connect";
import { 
  uintCV, 
  bufferCV, 
  stringAsciiCV,
} from "@stacks/transactions";
import { getNetwork } from "./network";
import { CONTRACT_ADDRESS, CONTRACT_NAME, CONTRACT_ERRORS } from "./constants";

/**
 * Extracts the uint error code from a Clarity err response and returns it as a human-readable string.
 */
export function parseContractError(errorResponse: unknown): string {
  // Stacks error responses often look like { error: " (err u1001)" } or similar
  // We'll try to extract the number using a regex
  const errorStr = String(errorResponse);
  const match = errorStr.match(/u(\d+)/);
  if (match) {
    const code = parseInt(match[1]);
    return CONTRACT_ERRORS[code] || `Contract error: ${code}`;
  }
  return "Transaction failed";
}

/**
 * Common parameters for all contract write calls
 */
interface BaseCallParams {
  onFinish: (txId: string) => void;
  onCancel: () => void;
}

export function createElection(params: {
  name: string;
  description: string;
  regDeadline: number;
  votingDeadline: number;
  tallyDeadline: number;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "create-election",
    functionArgs: [
      stringAsciiCV(params.name),
      stringAsciiCV(params.description),
      uintCV(params.regDeadline),
      uintCV(params.votingDeadline),
      uintCV(params.tallyDeadline),
    ],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function addCandidate(params: {
  electionId: number;
  candidateName: string;
  candidateDescription: string;
  candidateKey: Uint8Array;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "add-candidate",
    functionArgs: [
      uintCV(params.electionId),
      stringAsciiCV(params.candidateName),
      stringAsciiCV(params.candidateDescription),
      bufferCV(params.candidateKey),
    ],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function registerVoter(params: {
  electionId: number;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "register-voter",
    functionArgs: [uintCV(params.electionId)],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function castVote(params: {
  electionId: number;
  candidateId: number;
  voteHash: Uint8Array;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "cast-vote",
    functionArgs: [
      uintCV(params.electionId),
      uintCV(params.candidateId),
      bufferCV(params.voteHash),
    ],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function revealVote(params: {
  electionId: number;
  candidateId: number;
  salt: Uint8Array;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "reveal-vote",
    functionArgs: [
      uintCV(params.electionId),
      uintCV(params.candidateId),
      bufferCV(params.salt),
    ],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function startVotingPhase(params: {
  electionId: number;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "start-voting-phase",
    functionArgs: [uintCV(params.electionId)],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function startTallyPhase(params: {
  electionId: number;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "start-tally-phase",
    functionArgs: [uintCV(params.electionId)],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}

export function completeElection(params: {
  electionId: number;
} & BaseCallParams): void {
  openContractCall({
    network: getNetwork(),
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "complete-election",
    functionArgs: [uintCV(params.electionId)],
    onFinish: (data) => params.onFinish(data.txId),
    onCancel: params.onCancel,
  });
}
