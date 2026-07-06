"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Users, PlusCircle, Layers } from "lucide-react";
import Link from "next/link";

export default function WorkspaceDashboard() {
  const params = useParams();
  const slug = params.workspaceSlug as string;
  const workspace = useQuery(api.workspaces.getBySlug, { slug });

  if (!workspace) return null;

  return (
    <>
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl border border-zinc-900 bg-gradient-to-r from-zinc-900 to-indigo-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to {workspace.name}!</h2>
          <p className="text-sm text-zinc-400 max-w-lg">
            This is your central control deck. From here, you can manage campaigns, schedule platform-specific content, handle external client approvals, and inspect finance rollups.
          </p>
        </div>
      </div>

      {/* Setup checklist / Empty State */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider">Next Steps</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Clients */}
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/20 flex flex-col gap-4 text-left">
            <div className="h-10 w-10 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-base font-semibold text-white">Create a Client</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Clients let you organize social pages, projects, campaigns, and finance ledger lines per agency client.
              </p>
            </div>
            <Link href={`/${workspace.slug}/clients`}>
              <Button size="sm" className="mt-auto w-fit bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700">
                <PlusCircle className="h-4 w-4 mr-2" /> Set Up Clients
              </Button>
            </Link>
          </div>

          {/* Step 2: Social Pages */}
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/20 flex flex-col gap-4 text-left">
            <div className="h-10 w-10 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-base font-semibold text-white">Connect Social Pages</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Map platform-specific pages (like Instagram, TikTok, LinkedIn) to clients for planning and cashflow tracking.
              </p>
            </div>
            <Link href={`/${workspace.slug}/clients`}>
              <Button size="sm" className="mt-auto w-fit bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-750">
                <PlusCircle className="h-4 w-4 mr-2" /> Connect Page
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
