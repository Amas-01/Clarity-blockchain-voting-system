import { AppConfig, UserSession, showConnect } from "@stacks/connect";

const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

export function authenticate() {
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
}

export function disconnect() {
  userSession.signUserOut("/");
}

export function getAddress(userData: any) {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  if (network === "mainnet") {
    return userData?.profile?.stxAddress?.mainnet || "";
  }
  return userData?.profile?.stxAddress?.testnet || "";
}
