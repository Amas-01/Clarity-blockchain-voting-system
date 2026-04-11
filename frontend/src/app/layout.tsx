import type { Metadata } from "next";
import { DM_Serif_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "VOTECHAIN | Secure Stacks Voting",
  description: "A decentralized, commit-reveal voting system built on the Stacks blockchain using Clarity smart contracts.",
};

import { WalletProvider } from "@/hooks/useWallet";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
       <body className="font-mono antialiased bg-background text-foreground selection:bg-accent selection:text-background">
         <WalletProvider>
           {children}
         </WalletProvider>
       </body>
    </html>
  );
}
