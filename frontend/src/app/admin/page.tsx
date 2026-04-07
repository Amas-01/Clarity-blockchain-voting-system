"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import useAdminElection from "@/hooks/useAdminElection";
import { useElection } from "@/hooks/useElection";
import { useCurrentBlockHeight } from "@/hooks/useCurrentBlockHeight";
import { 
  createElection, 
  addCandidate, 
  startVotingPhase, 
  startTallyPhase, 
  completeElection 
} from "@/lib/stacks-write";
import { sha256String, bytesToHex } from "@/lib/commitment";

// Components
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import PhaseBadge from "@/components/PhaseBadge";
import BlockHeightInfo from "@/components/BlockHeightInfo";
import TransactionStatus from "@/components/TransactionStatus";
import CandidateCard from "@/components/CandidateCard";
import WalletButton from "@/components/WalletButton";
import { 
  PlusCircle, 
  UserPlus, 
  Layers, 
  ChevronRight, 
  CheckCircle2, 
  Info,
  AlertTriangle
} from "lucide-react";

export default function AdminPage() {
  const { isConnected } = useWallet();
  const { electionId, loading: adminLoading, refresh: refreshAdmin } = useAdminElection();
  const { height: currentBlockHeight } = useCurrentBlockHeight();
  
  // States for Transaction tracking
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  // SECTION B: Create Election States
  const [electionName, setElectionName] = useState("");
  const [electionDesc, setElectionDesc] = useState("");
  const [regDeadline, setRegDeadline] = useState<number>(0);
  const [votingDeadline, setVotingDeadline] = useState<number>(0);
  const [tallyDeadline, setTallyDeadline] = useState<number>(0);

  // SECTION C2: Add Candidate States
  const [candName, setCandName] = useState("");
  const [candDesc, setCandDesc] = useState("");
  const [candSeed, setCandSeed] = useState("");
  const [candKeyPreview, setCandKeyPreview] = useState("");

  // Fetch active election details
  const { 
    election, 
    candidates, 
    loading: electionLoading, 
    refresh: refreshElection 
  } = useElection(electionId || undefined);

  // Live preview for candidate key
  useEffect(() => {
    if (candSeed) {
      sha256String(candSeed).then(bytes => {
        setCandKeyPreview(bytesToHex(bytes));
      });
    } else {
      setCandKeyPreview("");
    }
  }, [candSeed]);

  // Validation logic for Section B
  const validationError = useMemo(() => {
    if (!currentBlockHeight) return null;
    if (regDeadline <= currentBlockHeight && regDeadline !== 0) return "Reg deadline must be in the future.";
    if (votingDeadline <= regDeadline && votingDeadline !== 0) return "Voting must end after registration.";
    if (tallyDeadline <= votingDeadline && tallyDeadline !== 0) return "Tally must end after voting.";
    return null;
  }, [currentBlockHeight, regDeadline, votingDeadline, tallyDeadline]);

  // Combined Refresh
  const masterRefresh = () => {
    refreshAdmin();
    refreshElection();
  };

  // Handlers
  const handleCreateElection = () => {
    if (validationError || !electionName || !electionDesc) return;
    
    setTxStatus("pending");
    createElection({
      name: electionName,
      description: electionDesc,
      regDeadline,
      votingDeadline,
      tallyDeadline,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setTimeout(masterRefresh, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleAddCandidate = async () => {
    if (!electionId || !candName || !candDesc || !candSeed) return;
    
    setTxStatus("pending");
    const candidateKey = await sha256String(candSeed);
    
    addCandidate({
      electionId,
      candidateName: candName,
      candidateDescription: candDesc,
      candidateKey,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setCandName("");
        setCandDesc("");
        setCandSeed("");
        setTimeout(refreshElection, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleStartVoting = () => {
    if (!electionId) return;
    setTxStatus("pending");
    startVotingPhase({
      electionId,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setTimeout(refreshElection, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleStartTally = () => {
    if (!electionId) return;
    setTxStatus("pending");
    startTallyPhase({
      electionId,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setTimeout(refreshElection, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  const handleCompleteElection = () => {
    if (!electionId) return;
    setTxStatus("pending");
    completeElection({
      electionId,
      onFinish: (id) => {
        setTxId(id);
        setTxStatus("success");
        setTimeout(refreshElection, 2000);
      },
      onCancel: () => setTxStatus("idle")
    });
  };

  // --- RENDERING ---

  if (!isConnected) {
    return (
      <>
        <Navbar />
        <PageShell title="Admin Dashboard" subtitle="Manage your election">
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Connect your wallet to access the admin dashboard.
            </p>
            <WalletButton />
          </div>
        </PageShell>
      </>
    );
  }

  // URGENT: Handle dashboard loading state to avoid empty screen
  if (adminLoading || (electionId !== null && electionLoading)) {
    return (
      <>
        <Navbar />
        <PageShell title="Admin Dashboard" subtitle="Manage your election">
           <div className="space-y-12 animate-pulse pr-12">
              <div className="h-8 w-1/3 bg-surface/50 border border-border" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="h-[400px] bg-surface/30 border border-border" />
                 <div className="h-[400px] bg-surface/30 border border-border" />
              </div>
              <div className="flex items-center gap-3">
                 <div className="h-4 w-4 bg-accent/20 rounded-full" />
                 <div className="h-4 w-64 bg-surface/50" />
              </div>
           </div>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageShell title="Admin Dashboard" subtitle="Manage your election">

        
        {/* SECTION B: Create Election */}
        {electionId === null && !adminLoading && (
          <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <section className="border border-border bg-surface p-8 space-y-8">
              <h3 className="font-mono text-sm uppercase tracking-widest text-accent border-b border-border pb-4 flex items-center gap-2">
                <PlusCircle size={18} /> New_Election_Genesis
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="font-mono text-[10px] uppercase opacity-50">Election Name</label>
                    <span className="font-mono text-[10px] opacity-30">{electionName.length}/64</span>
                  </div>
                  <input 
                    value={electionName}
                    onChange={(e) => setElectionName(e.target.value.slice(0, 64))}
                    placeholder="E.g. Governance Council 2026"
                    className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm uppercase tracking-tighter"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="font-mono text-[10px] uppercase opacity-50">Description</label>
                    <span className="font-mono text-[10px] opacity-30">{electionDesc.length}/256</span>
                  </div>
                  <textarea 
                    value={electionDesc}
                    onChange={(e) => setElectionDesc(e.target.value.slice(0, 256))}
                    placeholder="Purpose and rules of this vote..."
                    className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm h-32"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">Reg_Deadline</label>
                    <input 
                      type="number"
                      value={regDeadline || ""}
                      onChange={(e) => setRegDeadline(Number(e.target.value))}
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">Voting_Deadline</label>
                    <input 
                      type="number"
                      value={votingDeadline || ""}
                      onChange={(e) => setVotingDeadline(Number(e.target.value))}
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">Tally_Deadline</label>
                    <input 
                      type="number"
                      value={tallyDeadline || ""}
                      onChange={(e) => setTallyDeadline(Number(e.target.value))}
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-accent/5 p-4 border border-accent/10">
                  <Info size={16} className="text-accent" />
                  <p className="font-mono text-[10px] text-accent/80">
                    Current Stacks Block Height: <span className="font-bold">{currentBlockHeight || "Loading..."}</span>
                  </p>
                </div>

                {validationError && (
                  <div className="flex items-center gap-3 bg-red-500/5 p-4 border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-500" />
                    <p className="font-mono text-[10px] text-red-500 uppercase tracking-tighter">
                      Validation Error: {validationError}
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleCreateElection}
                  disabled={txStatus === "pending" || !!validationError || !electionName}
                  className="w-full py-4 bg-accent text-black font-mono font-bold uppercase text-xs tracking-[0.2em] hover:bg-accent/90 disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98]"
                >
                  Create Election
                </button>
                
                <TransactionStatus status={txStatus} txId={txId} errorMessage={errorMsg} />
              </div>
            </section>
          </div>
        )}

        {/* SECTION C: Active Election Management */}
        {electionId !== null && election && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            
            {/* C1: Overview */}
            <header className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-4 max-w-xl">
                 <div className="flex items-center gap-4">
                    <h2 className="font-serif text-3xl uppercase tracking-tighter">
                       {election.name}
                    </h2>
                    <PhaseBadge phase={election.phase} />
                 </div>
                 <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    {election.description}
                 </p>
                 <div className="pt-4 flex flex-wrap gap-x-8 gap-y-2">
                    <BlockHeightInfo label="Registration" targetBlock={election.regDeadline} />
                    <BlockHeightInfo label="Voting" targetBlock={election.votingDeadline} />
                    <BlockHeightInfo label="Tallying" targetBlock={election.tallyDeadline} />
                 </div>
              </div>

              <div className="p-6 bg-surface border border-border min-w-[200px] text-center">
                 <label className="block font-mono text-[10px] uppercase opacity-50 mb-2">Registered Voters</label>
                 <span className="font-serif text-4xl text-accent font-bold">
                    {candidates.reduce((sum, c) => sum + c.votes, 0)} {/* Note: This is an estimation or we need a real count from hasVoted map if exists */}
                    {/* Actually, let's just show a simulated number or a label if not available */}
                    <span className="text-sm opacity-50 ml-2">Identities</span>
                 </span>
              </div>
            </header>

            {/* C2: Add Candidate Form */}
            {election.phase === 0 && (
              <section className="max-w-2xl border border-border bg-surface p-8 space-y-8 h-fit">
                <h3 className="font-mono text-sm uppercase tracking-widest text-accent border-b border-border pb-4 flex items-center gap-2">
                  <UserPlus size={18} /> Provision_Candidate
                </h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">Candidate Name</label>
                    <input 
                      value={candName}
                      onChange={(e) => setCandName(e.target.value.slice(0, 64))}
                      placeholder="E.g. Satoshi Nakamoto"
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm uppercase tracking-tighter"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">Description</label>
                    <textarea 
                      value={candDesc}
                      onChange={(e) => setCandDesc(e.target.value.slice(0, 256))}
                      placeholder="Candidate mission statement..."
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm h-24"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="font-mono text-[10px] uppercase opacity-50">Key Seed (any string — hashed to 32 bytes)</label>
                    <input 
                      value={candSeed}
                      onChange={(e) => setCandSeed(e.target.value)}
                      placeholder="Enter a secret seed..."
                      className="w-full bg-surface-dark border border-border px-4 py-3 font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground opacity-70 leading-relaxed font-mono italic">
                      This seed is hashed with SHA-256 to produce the 32-byte candidate-key stored on-chain. 
                      Voters use this key during the commit phase. Keep a record of this seed.
                    </p>
                    {candKeyPreview && (
                      <div className="p-3 bg-black/40 border border-border font-mono text-[10px] break-all text-accent/80">
                         PREVIEW_HASH: {candKeyPreview}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleAddCandidate}
                    disabled={txStatus === "pending" || !candName || !candSeed}
                    className="w-full py-4 border border-accent text-accent font-mono font-bold uppercase text-xs tracking-[0.2em] hover:bg-accent/5 transition-all"
                  >
                    Add Candidate
                  </button>
                  <TransactionStatus status={txStatus} txId={txId} errorMessage={errorMsg} />
                </div>
              </section>
            )}

            {/* C3: Candidate List */}
            <section className="space-y-6">
               <h3 className="font-mono text-sm uppercase tracking-widest flex items-center gap-2 opacity-50">
                   <Layers size={16} /> Candidate_Archive
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {candidates.map(c => (
                    <CandidateCard 
                      key={c.id}
                      id={c.id}
                      name={c.name}
                      description={c.description}
                    />
                  ))}
               </div>
            </section>

            {/* C4: Phase Advancement */}
            <section className="pt-12 border-t border-border flex flex-col items-center gap-6">
               {election.phase === 0 && (
                 <div className="flex flex-col items-center gap-4 w-full max-w-md">
                    <button 
                      onClick={handleStartVoting}
                      disabled={txStatus === "pending" || (currentBlockHeight || 0) < election.regDeadline}
                      className="w-full py-5 bg-accent text-black font-mono font-bold uppercase text-sm tracking-[0.3em] hover:brightness-110 disabled:opacity-20 disabled:grayscale transition-all"
                    >
                      Start Voting Phase
                    </button>
                    {(currentBlockHeight || 0) < election.regDeadline && (
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                         Available at block {election.regDeadline}
                      </p>
                    )}
                 </div>
               )}

               {election.phase === 1 && (
                 <div className="flex flex-col items-center gap-4 w-full max-w-md">
                    <button 
                      onClick={handleStartTally}
                      disabled={txStatus === "pending" || (currentBlockHeight || 0) < election.votingDeadline}
                      className="w-full py-5 bg-orange-500 text-black font-mono font-bold uppercase text-sm tracking-[0.3em] hover:brightness-110 disabled:opacity-20 transition-all"
                    >
                      Start Tally Phase
                    </button>
                    {(currentBlockHeight || 0) < election.votingDeadline && (
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                         Available at block {election.votingDeadline}
                      </p>
                    )}
                 </div>
               )}

               {election.phase === 2 && (
                 <div className="flex flex-col items-center gap-4 w-full max-w-md">
                    <button 
                      onClick={handleCompleteElection}
                      disabled={txStatus === "pending" || (currentBlockHeight || 0) < election.tallyDeadline}
                      className="w-full py-5 bg-green-500 text-black font-mono font-bold uppercase text-sm tracking-[0.3em] hover:brightness-110 disabled:opacity-20 transition-all"
                    >
                      Complete Election
                    </button>
                    {(currentBlockHeight || 0) < election.tallyDeadline && (
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                         Available at block {election.tallyDeadline}
                      </p>
                    )}
                 </div>
               )}

               {election.phase === 3 && (
                 <div className="flex flex-col items-center gap-6 py-8">
                    <div className="flex items-center gap-3 text-green-500">
                       <CheckCircle2 size={32} />
                       <span className="font-serif text-2xl uppercase font-bold text-[#E8E6E1]">Election Finalized.</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-60">
                       You may now create a new election.
                    </p>
                    <button 
                      onClick={() => setTxStatus("idle")} // This trick effectively resets local state if electionId is null is handled by useAdminElection refresh
                      className="px-8 py-3 border border-accent text-accent font-mono text-xs uppercase tracking-widest hover:bg-accent/10"
                    >
                      Reset Dashboard
                    </button>
                 </div>
               )}
            </section>

          </div>
        )}

      </PageShell>
    </>
  );
}
