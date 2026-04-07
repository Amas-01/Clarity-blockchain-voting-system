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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${mono.variable} font-mono antialiased bg-[#0A0C0F] text-[#E5E7EB]`}>
        {children}
      </body>
    </html>
  );
}
