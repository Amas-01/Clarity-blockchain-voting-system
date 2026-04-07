"use client";

import { useParams } from "next/navigation";
import { useElection } from "@/hooks/use-election";
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  getNetwork,
  userSession,
  authenticate,
  getAddress
} from "@/lib/stacks";
import { uintCV } from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import VoteCommit from "@/components/VoteCommit";
import VoteReveal from "@/components/VoteReveal";
import { 
  Clock, 
  User, 
  Info, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Trophy,
  Users
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = Number(params.id);
  const { election, candidates, isRegistered, hasVoted, loading, refresh } = useElection(electionId);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const network = getNetwork();
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "register-voter",
        functionArgs: [uintCV(electionId)],
        network,
        onFinish: (data) => {
          console.log("Registration sent:", data.txId);
          refresh();
        },
        onCancel: () => {
          setIsRegistering(false);
        }
      });
    } catch (err) {
      console.error("Registration error:", err);
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground animate-pulse">Loading_Election_Parameters...</p>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-serif text-red-500 mb-4">ELECTION_NOT_FOUND</h1>
        <Link href="/" className="text-accent underline font-mono text-sm uppercase">Return_to_Dashboard</Link>
      </div>
    );
  }

  const phaseIndex = election.phase;
  const currentBlockHeight = 0; // In a real app we'd fetch this. We'll show the raw deadline.

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-accent transition-colors mb-8 group">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> BACK_TO_DASHBOARD
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Metadata & Candidates */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-sm">
                ELECTION_OFFICIAL
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                ID: #{election.id}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif mb-6 leading-tight uppercase tracking-tighter">
              {election.name}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {election.description}
            </p>
          </section>

          <section>
             <h2 className="text-xl font-serif uppercase tracking-tight mb-6 border-b border-border pb-2 inline-block">Candidates_Ballot</h2>
             <div className="grid gap-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 border border-border bg-background/40 flex justify-between items-center group hover:border-accent/30 transition-colors">
                    <div>
                      <h4 className="font-serif text-lg group-hover:text-accent transition-colors">{candidate.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono leading-relaxed mt-1">{candidate.description}</p>
                    </div>
                    {election.phase === 3 && (
                      <div className="text-right">
                        <span className="text-2xl font-serif text-accent">{candidate.votes}</span>
                        <span className="block text-[10px] font-mono text-muted-foreground uppercase">Tallied_Votes</span>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* Right Column: Interaction & Phases */}
        <div className="space-y-8">
          {/* Phase Progress Card */}
          <div className="border border-border bg-background/60 p-6 space-y-6 accent-glow">
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-accent border-b border-border pb-4">
              Lifecycle_Status
            </h3>
            
            <div className="space-y-4">
              {[
                { name: "Registration", icon: Users, deadline: election.regDeadline },
                { name: "Voting Commit", icon: Clock, deadline: election.votingDeadline },
                { name: "Tally Reveal", icon: Unlock, deadline: election.tallyDeadline },
                { name: "Completed", icon: Trophy, deadline: null }
              ].map((p, i) => (
                <div key={p.name} className={`flex items-center gap-4 ${i > phaseIndex ? 'opacity-30 grayscale' : ''}`}>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                    i === phaseIndex ? 'border-accent bg-accent text-black animate-pulse' : 
                    i < phaseIndex ? 'border-accent text-accent bg-accent/10' : 'border-border'
                  }`}>
                    {i < phaseIndex ? <CheckCircle size={14} /> : React.createElement(p.icon, { size: 14 })}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-mono uppercase tracking-wider font-bold ${i === phaseIndex ? 'text-accent' : ''}`}>
                      {p.name}
                    </p>
                    {p.deadline && (
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                        Deadline: {p.deadline}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Center */}
          <div className="border border-border bg-background/80 p-6 space-y-6">
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] border-b border-border pb-4">
              Participate
            </h3>

            {!userSession.isUserSignedIn() ? (
              <div className="text-center space-y-4 py-4">
                <AlertCircle className="mx-auto text-accent/60" size={32} />
                <p className="text-xs font-mono text-muted-foreground uppercase leading-relaxed">
                  Authentication Required to interact with this election.
                </p>
                <button onClick={authenticate} className="w-full h-10 bg-accent text-black font-mono text-xs font-bold uppercase">CONNECT_WALLET</button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Phase 0: Registration */}
                {phaseIndex === 0 && (
                  <div className="space-y-4">
                    {isRegistered ? (
                      <div className="p-4 bg-accent/10 border border-accent/20 flex gap-3 text-accent transition-all animate-in zoom-in-95">
                        <CheckCircle size={20} className="shrink-0" />
                        <div>
                          <p className="text-xs font-mono uppercase font-bold tracking-widest">Registration_Verified</p>
                          <p className="text-[10px] font-mono mt-1 opacity-70">You are eligible to vote when the window opens.</p>
                        </div>
                      </div>
                    ) : (
                      <button 
                        disabled={isRegistering}
                        onClick={handleRegister}
                        className="w-full h-12 bg-white text-black font-mono font-bold uppercase tracking-widest hover:bg-white/80 transition-all flex items-center justify-center gap-2"
                      >
                        {isRegistering ? "PROVISIONING..." : "REGISTER_TO_VOTE"}
                      </button>
                    )}
                  </div>
                )}

                {/* Phase 1: Voting Commit */}
                {phaseIndex === 1 && (
                  <div className="space-y-4">
                    {!isRegistered ? (
                      <div className="p-4 border border-red-900/50 bg-red-900/10 text-red-500 font-mono text-[10px] uppercase flex gap-3">
                         <XCircle size={16} className="shrink-0" /> Not registered for this election.
                      </div>
                    ) : hasVoted ? (
                      <div className="p-4 bg-accent/10 border border-accent/20 flex gap-3 text-accent transition-all animate-in zoom-in-95">
                        <CheckCircle size={20} className="shrink-0" />
                        <div>
                          <p className="text-xs font-mono uppercase font-bold tracking-widest">Commitment_Locked</p>
                          <p className="text-[10px] font-mono mt-1 opacity-70">Your hashed ballot is now on-chain. Wait for Tally phase.</p>
                        </div>
                      </div>
                    ) : (
                      <VoteCommit electionId={electionId} candidates={candidates} onSuccess={refresh} />
                    )}
                  </div>
                )}

                {/* Phase 2: Tally Reveal */}
                {phaseIndex === 2 && (
                  <div className="space-y-4">
                    {!hasVoted ? (
                      <div className="p-4 border border-red-900/30 bg-red-900/5 text-muted-foreground font-mono text-[10px] uppercase flex gap-3 italic">
                         <Info size={16} className="shrink-0" /> No commitment found. Participation terminal.
                      </div>
                    ) : (
                      <VoteReveal electionId={electionId} onSuccess={refresh} />
                    )}
                  </div>
                )}

                {/* Phase 3: Completed */}
                {phaseIndex === 3 && (
                  <div className="space-y-6 text-center py-6">
                    <Trophy className="mx-auto text-accent mb-4 animate-bounce" size={48} />
                    <h4 className="font-serif text-2xl uppercase tracking-tighter">Election_Finalized</h4>
                    <Link href="/" className="inline-block text-[10px] font-mono text-accent border border-accent px-4 py-2 hover:bg-accent hover:text-black transition-all uppercase tracking-widest">
                       Return_to_Archive
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 border border-border bg-background/40">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">Admin_Node</h4>
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-mono tracking-tight text-foreground/80 break-all">{election.admin}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
