"use client";

import { useState } from "react";
import { openContractCall } from "@stacks/connect";
import { 
  stringAsciiCV, 
  uintCV, 
  PostConditionMode 
} from "@stacks/transactions";
import { 
  getNetwork, 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  userSession 
} from "@/lib/stacks";
import { Plus, Loader2 } from "lucide-react";

export default function CreateElection() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");
  const [tallyDeadline, setTallyDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const network = getNetwork();
      await openContractCall({
        network,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "create-election",
        functionArgs: [
          stringAsciiCV(name),
          stringAsciiCV(description),
          uintCV(Number(regDeadline)),
          uintCV(Number(votingDeadline)),
          uintCV(Number(tallyDeadline)),
        ],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          console.log("Transaction sent:", data);
          alert("Election creation transaction sent!");
          setLoading(false);
        },
        onCancel: () => {
          setLoading(false);
        },
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="glass p-8 rounded-3xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-accent/20 rounded-2xl">
          <Plus className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-serif">New Election</h2>
          <p className="text-xs font-mono text-foreground/40 uppercase tracking-widest">
            Configuration & Protocol
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block px-1">
            Election Title
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-accent font-mono text-sm outline-none transition-all"
            placeholder="e.g. Genesis Governance 01"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block px-1">
            Core Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-accent font-mono text-sm outline-none transition-all h-24"
            placeholder="Election details and parameters..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block px-1">
              Reg. Deadline
            </label>
            <input
              type="number"
              value={regDeadline}
              onChange={(e) => setRegDeadline(e.target.value)}
              className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-accent font-mono text-sm outline-none transition-all"
              placeholder="Block Height"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block px-1">
              Voting Deadline
            </label>
            <input
              type="number"
              value={votingDeadline}
              onChange={(e) => setVotingDeadline(e.target.value)}
              className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-accent font-mono text-sm outline-none transition-all"
              placeholder="Block Height"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block px-1">
              Tally Deadline
            </label>
            <input
              type="number"
              value={tallyDeadline}
              onChange={(e) => setTallyDeadline(e.target.value)}
              className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-accent font-mono text-sm outline-none transition-all"
              placeholder="Block Height"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-accent text-background font-mono text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Deploy Election Protocol"}
        </button>
      </form>
    </div>
  );
}
