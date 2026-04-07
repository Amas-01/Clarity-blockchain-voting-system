"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useElection } from "@/hooks/use-election";
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  getNetwork,
  userSession,
  authenticate,
  toBuff32
} from "@/lib/stacks";
import { 
  uintCV, 
  stringAsciiCV, 
  bufferCV 
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { generateSalt, uint8ArrayToHex } from "@/lib/crypto-utils";
import { 
  ShieldAlert, 
  PlusCircle, 
  UserPlus, 
  ArrowRightCircle, 
  Settings,
  ChevronRight,
  Database,
  History
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { adminElection, loading, refresh } = useAdmin();
  const { candidates, refresh: refreshCandidates } = useElection(adminElection?.id);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    regDeadline: 100,
    votingDeadline: 200,
    tallyDeadline: 300
  });

  const [candData, setCandData] = useState({
    name: "",
    description: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const network = getNetwork();
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "create-election",
        functionArgs: [
          stringAsciiCV(formData.name),
          stringAsciiCV(formData.description),
          uintCV(formData.regDeadline),
          uintCV(formData.votingDeadline),
          uintCV(formData.tallyDeadline)
        ],
        network,
        onFinish: () => {
          refresh();
          setIsSubmitting(false);
        },
        onCancel: () => setIsSubmitting(false)
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminElection) return;
    setIsSubmitting(true);
    try {
      const network = getNetwork();
      // Generate a random key for the candidate
      const candKey = generateSalt();
      
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "add-candidate",
        functionArgs: [
          uintCV(adminElection.id),
          stringAsciiCV(candData.name),
          stringAsciiCV(candData.description),
          bufferCV(toBuff32(candKey))
        ],
        network,
        onFinish: () => {
          refreshCandidates();
          setCandData({ name: "", description: "" });
          setIsSubmitting(false);
        },
        onCancel: () => setIsSubmitting(false)
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleTransition = async (functionName: string) => {
    if (!adminElection) return;
    setIsSubmitting(true);
    try {
      const network = getNetwork();
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs: [uintCV(adminElection.id)],
        network,
        onFinish: () => {
          refresh();
          setIsSubmitting(false);
        },
        onCancel: () => setIsSubmitting(false)
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="container mx-auto px-4 py-24 text-center font-mono animate-pulse">
        CONNECTING_TO_ADMIN_PROTOCOL...
    </div>
  );

  if (!userSession.isUserSignedIn()) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-xl text-center">
         <ShieldAlert size={48} className="mx-auto text-accent mb-6" />
         <h1 className="text-3xl font-serif mb-4 uppercase tracking-tighter">Unauthorized_Access</h1>
         <p className="text-muted-foreground font-mono text-sm mb-8 leading-relaxed">
            Admin functions are restricted. Please authenticate with your official Stacks address to proceed.
         </p>
         <button onClick={authenticate} className="bg-accent text-black px-8 py-3 font-mono font-bold uppercase tracking-widest text-sm">
            INITIALIZE_HANDSHAKE
         </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-12 border-b border-border pb-8">
        <h1 className="text-4xl font-serif uppercase tracking-tighter mb-2">Admin_Command_Center</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Protocol: Voting-Project-v1.0 // Auth: Verified</p>
      </header>

      {!adminElection ? (
        <section className="bg-background/40 border border-border p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <PlusCircle size={24} className="text-accent" />
            <h2 className="text-xl font-serif uppercase">Deploy_New_Election</h2>
          </div>
          
          <form onSubmit={handleCreateElection} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Election_Name</label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-border/20 border border-border p-3 font-mono text-sm focus:border-accent outline-none transition-colors"
                placeholder="e.g. 2026 DECENTRALIZED COUNCIL"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-border/20 border border-border p-3 font-mono text-sm focus:border-accent outline-none transition-colors h-24"
                placeholder="Formal description of the election parameters..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-tight">Reg_Deadline</label>
                 <input type="number" value={formData.regDeadline} onChange={e => setFormData({...formData, regDeadline: parseInt(e.target.value)})} className="w-full bg-border/20 border border-border p-2 font-mono text-sm" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-tight">Vote_Deadline</label>
                 <input type="number" value={formData.votingDeadline} onChange={e => setFormData({...formData, votingDeadline: parseInt(e.target.value)})} className="w-full bg-border/20 border border-border p-2 font-mono text-sm" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-tight">Tally_Deadline</label>
                 <input type="number" value={formData.tallyDeadline} onChange={e => setFormData({...formData, tallyDeadline: parseInt(e.target.value)})} className="w-full bg-border/20 border border-border p-2 font-mono text-sm" />
               </div>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-accent text-black p-4 font-mono font-bold uppercase tracking-widest text-sm hover:bg-accent/90 disabled:opacity-50"
            >
              COMMIT_TO_BLOCKCHAIN
            </button>
          </form>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Active Election Management */}
          <section className="space-y-8">
            <div className="bg-accent/5 border border-accent/20 p-6 relative overflow-hidden group">
               <Settings size={64} className="absolute -right-4 -bottom-4 text-accent/5 transform group-hover:rotate-45 transition-transform duration-1000" />
               <h2 className="text-[10px] font-mono text-accent uppercase tracking-[0.3em] font-bold mb-4">Active_Session_Managed</h2>
               <h3 className="text-3xl font-serif mb-2 uppercase">{adminElection.name}</h3>
               <Link href={`/election/${adminElection.id}`} className="text-xs font-mono text-muted-foreground underline hover:text-accent flex items-center gap-1 group">
                  GOTO_PUBLIC_VIEW <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </Link>

               <div className="mt-8 flex flex-wrap gap-4">
                  {adminElection.phase === 0 && (
                    <button onClick={() => handleTransition("start-voting-phase")} className="bg-white text-black px-4 py-2 font-mono text-[10px] font-bold flex items-center gap-2 uppercase tracking-tight">
                       Start_Voting_Phase <ArrowRightCircle size={14} />
                    </button>
                  )}
                  {adminElection.phase === 1 && (
                    <button onClick={() => handleTransition("start-tally-phase")} className="bg-white text-black px-4 py-2 font-mono text-[10px] font-bold flex items-center gap-2 uppercase tracking-tight">
                       Start_Tally_Phase <ArrowRightCircle size={14} />
                    </button>
                  )}
                  {adminElection.phase === 2 && (
                    <button onClick={() => handleTransition("complete-election")} className="bg-white text-black px-4 py-2 font-mono text-[10px] font-bold flex items-center gap-2 uppercase tracking-tight">
                       Complete_Protocol <ArrowRightCircle size={14} />
                    </button>
                  )}
               </div>
            </div>

            <div className="border border-border p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
                  <UserPlus size={18} className="text-accent" />
                  <h3 className="font-serif uppercase">Provision_Candidates</h3>
                </div>
                
                <form onSubmit={handleAddCandidate} className="space-y-4">
                   <input required value={candData.name} onChange={e => setCandData({...candData, name: e.target.value})} className="w-full bg-border/10 border border-border p-3 font-mono text-xs uppercase" placeholder="Candidate_Name" />
                   <textarea required value={candData.description} onChange={e => setCandData({...candData, description: e.target.value})} className="w-full bg-border/10 border border-border p-3 font-mono text-xs h-20" placeholder="Candidate_Manifesto" />
                   <button type="submit" disabled={isSubmitting || adminElection.phase !== 0} className="w-full border border-accent text-accent p-3 font-mono text-[10px] uppercase font-bold hover:bg-accent/10 disabled:opacity-30">
                      ENROLL_CANDIDATE
                   </button>
                   {adminElection.phase !== 0 && (
                     <p className="text-[10px] font-mono text-red-400 text-center uppercase tracking-tight">Inactive_in_Current_Phase</p>
                   )}
                </form>
            </div>
          </section>

          {/* Current Candidates List */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
               <h3 className="font-serif uppercase flex items-center gap-3">
                  <Database size={18} className="text-accent" /> Enrolled_Data
               </h3>
               <span className="text-[10px] font-mono text-muted-foreground">COUNT: {candidates.length}</span>
            </div>

            <div className="grid gap-3">
               {candidates.map(candidate => (
                 <div key={candidate.id} className="p-4 border border-border bg-background/40 flex justify-between items-center">
                    <div>
                      <h5 className="font-serif">{candidate.name}</h5>
                      <span className="text-[10px] font-mono text-muted-foreground">CANDIDATE_ID: {candidate.id}</span>
                    </div>
                    <div className="text-right">
                       <span className="font-mono text-xs text-accent">{candidate.votes} VOTES</span>
                    </div>
                 </div>
               ))}
               {candidates.length === 0 && (
                 <div className="py-12 text-center text-[10px] font-mono text-muted-foreground uppercase italic border border-dashed border-border">
                    No_Candidates_Provisioned
                 </div>
               )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
