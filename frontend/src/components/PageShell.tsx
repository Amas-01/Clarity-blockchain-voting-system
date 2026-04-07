"use client";

import React from "react";
import Navbar from "./Navbar";

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Common layout wrapper for all pages.
 */
export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#0A0C0F] text-[#E5E7EB] selection:bg-[#D4A017]/30">
      <Navbar />
      
      <main className="pt-24 pb-16 max-w-5xl mx-auto px-6 animate-in fade-in duration-1000">
        <header className="mb-12 space-y-2">
          <h1 className="font-serif text-4xl md:text-5xl uppercase tracking-tighter leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="font-mono text-sm text-muted-foreground opacity-70 tracking-tight">
              {subtitle}
            </p>
          )}
          <div className="h-[1px] w-16 bg-[#D4A017] mt-6" />
        </header>

        <section className="space-y-12">
          {children}
        </section>
      </main>
    </div>
  );
}
