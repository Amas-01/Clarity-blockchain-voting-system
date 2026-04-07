import { STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";

/**
 * Returns the appropriate Stacks network object based on the environment variable.
 * Defaults to Testnet unless specifically set to "mainnet".
 * Note: StacksMainnet and StacksTestnet are exported as instances in v7.
 */
export function getNetwork(): typeof STACKS_TESTNET | typeof STACKS_MAINNET {
  const network = process.env.NEXT_PUBLIC_NETWORK;

  if (network === "mainnet") {
    return STACKS_MAINNET;
  }

  return STACKS_TESTNET;
}
