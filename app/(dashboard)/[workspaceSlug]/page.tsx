"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  FolderKanban, 
  Users, 
  TrendingUp, 
  Settings, 
  HelpCircle, 
  PlusCircle, 
  FileText,
  AlertTriangle,
  LogOut,
  Calendar,
  Layers
} from "lucide-react";
import Link from "next/link";

export default function WorkspaceDashboard() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  const workspace = useQuery(api.workspaces.getBySlug, { slug });

  if (workspace === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading workspace dashboard...</p>
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-50 font-sans px-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-red-900/30 bg-red-950/5 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We couldn't find workspace <code className="text-xs px-1.5 py-0.5 bg-zinc-900 rounded font-mono text-indigo-400">"{slug}"</code> or you do not have permission to view it.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Link href="/" className="w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20">
                Return to Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col z-20 shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-zinc-900">
          <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            S
          </div>
          <span className="font-semibold text-base tracking-tight text-white">Socials Ark</span>
        </div>

        {/* Workspace Quick Details */}
        <div className="p-4 mx-4 my-3 rounded-lg bg-zinc-900/40 border border-zinc-900 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Active Workspace</span>
          <span className="text-xs font-semibold text-zinc-200 truncate">{workspace.name}</span>
          <span className="text-[10px] text-zinc-500 truncate">slug: {workspace.slug}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 flex flex-col gap-1">
          <Link href={`/${workspace.slug}`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-zinc-900 text-white transition-colors">
            <FolderKanban className="h-4 w-4 text-indigo-400" />
            <span>Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 cursor-not-allowed transition-colors group relative">
            <Users className="h-4 w-4" />
            <span>Clients & Pages</span>
            <span className="absolute right-3 text-[9px] font-bold bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">Soon</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 cursor-not-allowed transition-colors group relative">
            <Calendar className="h-4 w-4" />
            <span>Content Workflow</span>
            <span className="absolute right-3 text-[9px] font-bold bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">Soon</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 cursor-not-allowed transition-colors group relative">
            <TrendingUp className="h-4 w-4" />
            <span>Finance P&L</span>
            <span className="absolute right-3 text-[9px] font-bold bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">Soon</span>
          </div>
        </nav>

        {/* Footer Settings & Auth */}
        <div className="p-4 border-t border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-200">Account</span>
              <span className="text-[10px] text-zinc-500">Settings & Profile</span>
            </div>
          </div>
          <Link href="/">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 relative">
        {/* Backdrop Glow */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-900/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-white">Dashboard Overview</h1>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono capitalize">
              plan: {workspace.plan}
            </span>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-8 flex flex-col gap-8 flex-1 max-w-5xl">
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
                <Button size="sm" className="mt-auto w-fit bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-not-allowed">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Client (Soon)
                </Button>
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
                <Button size="sm" className="mt-auto w-fit bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-not-allowed">
                  <PlusCircle className="h-4 w-4 mr-2" /> Connect Page (Soon)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
