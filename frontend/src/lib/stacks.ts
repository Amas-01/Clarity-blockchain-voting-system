import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { 
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_MOCKNET,
  networkFromName
} from "@stacks/network";
import { 
  bufferCV, 
  uintCV, 
  stringAsciiCV, 
  principalCV,
  PostConditionMode,
  FungibleConditionCode
} from "@stacks/transactions";

const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

export const getNetworkName = () => process.env.NEXT_PUBLIC_NETWORK || "testnet";

export const getNetwork = () => {
  const network = getNetworkName();
  return networkFromName(network as "mainnet" | "testnet" | "devnet" | "mocknet");
};

export const getAddress = (userData: any) => {
  const network = getNetworkName();
  if (network === "mainnet") return userData?.profile?.stxAddress?.mainnet || "";
  return userData?.profile?.stxAddress?.testnet || "";
};

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

if (!CONTRACT_ADDRESS && typeof window !== "undefined") {
  console.warn("⚠️ NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Read-only calls and transactions will fail.");
}

export const CONTRACT_NAME = "voting-project";

/**
 * Ensures a Uint8Array is exactly 32 bytes for (buff 32)
 */
export const toBuff32 = (arr: Uint8Array): Uint8Array => {
  if (arr.length === 32) return arr;
  const buff = new Uint8Array(32);
  buff.set(arr.slice(0, 32));
  return buff;
};

export const stacksBufferCV = (arr: Uint8Array) => bufferCV(toBuff32(arr));

export const authenticate = () => {
  showConnect({
    appDetails: {
      name: "Voting Project",
      icon: "/favicon.ico",
    },
    userSession,
    onFinish: () => {
      window.location.reload();
    },
  });
};

export const disconnect = () => {
  userSession.signUserOut("/");
};

export async function fetchMapValue(mapName: string, keyCV: any) {
  const network = getNetwork() as any;
  const response = await fetch(
    `${network.coreApiUrl}/v2/map_value/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${mapName}`,
    {
      method: "POST",
      body: JSON.stringify(keyCV),
      headers: { "Content-Type": "application/json" },
    }
  );
  return response.json();
}
