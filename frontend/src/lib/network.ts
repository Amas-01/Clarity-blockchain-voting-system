import { StacksMainnet, StacksTestnet } from "@stacks/network";

/**
 * Returns the appropriate Stacks network object based on the environment variable.
 * Defaults to Testnet unless specifically set to "mainnet".
 */
export function getNetwork(): StacksTestnet | StacksMainnet {
  const network = process.env.NEXT_PUBLIC_NETWORK;

  if (network === "mainnet") {
    return new StacksMainnet();
  }

  return new StacksTestnet();
}
