"use client";

import { ReactNode, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  FolderKanban, 
  Users, 
  TrendingUp, 
  LogOut,
  Calendar,
  Layers,
  LayoutDashboard,
  Briefcase,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.workspaceSlug as string;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
            <Layers className="h-6 w-6" />
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

  const isDashboardActive = pathname === `/${workspace.slug}`;
  const isClientsActive = pathname.startsWith(`/${workspace.slug}/clients`);
  const isTasksActive = pathname.startsWith(`/${workspace.slug}/tasks`);
  const isTeamActive = pathname.startsWith(`/${workspace.slug}/team`);
  const isContentActive = pathname.startsWith(`/${workspace.slug}/content`);

  const closeSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={closeSidebar} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col z-50 shrink-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Brand & Mobile Close */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              S
            </div>
            <span className="font-semibold text-base tracking-tight text-white">Socials Ark</span>
          </div>
          <button 
            onClick={closeSidebar}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Quick Details */}
        <div className="p-4 mx-4 my-3 rounded-lg bg-zinc-900/40 border border-zinc-900 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Active Workspace</span>
          <span className="text-xs font-semibold text-zinc-200 truncate">{workspace.name}</span>
          <span className="text-[10px] text-zinc-500 truncate">slug: {workspace.slug}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 flex flex-col gap-1">
          <Link 
            href={`/${workspace.slug}`} 
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDashboardActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${isDashboardActive ? "text-indigo-400" : ""}`} />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            href={`/${workspace.slug}/clients`} 
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isClientsActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            }`}
          >
            <Briefcase className={`h-4 w-4 ${isClientsActive ? "text-indigo-400" : ""}`} />
            <span>Clients & Pages</span>
          </Link>

          <Link 
            href={`/${workspace.slug}/team`} 
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isTeamActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            }`}
          >
            <Users className={`h-4 w-4 ${isTeamActive ? "text-indigo-400" : ""}`} />
            <span>Team Members</span>
          </Link>

          <Link 
            href={`/${workspace.slug}/tasks`} 
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isTasksActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            }`}
          >
            <Calendar className={`h-4 w-4 ${isTasksActive ? "text-indigo-400" : ""}`} />
            <span>Tasks Board</span>
          </Link>

          <Link 
            href={`/${workspace.slug}/content`} 
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isContentActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            }`}
          >
            <Layers className={`h-4 w-4 ${isContentActive ? "text-indigo-400" : ""}`} />
            <span>Content Workflow</span>
          </Link>

          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-650 cursor-not-allowed group relative">
            <TrendingUp className="h-4 w-4" />
            <span>Finance P&L</span>
            <span className="absolute right-3 text-[9px] font-bold bg-zinc-900 text-zinc-655 px-1.5 py-0.5 rounded border border-zinc-900">Soon</span>
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
          <Link href="/" onClick={closeSidebar}>
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
        <header className="h-16 border-b border-zinc-900 px-4 md:px-8 flex items-center justify-between shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 md:hidden focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm md:text-lg font-semibold text-white">
              {isDashboardActive ? "Dashboard Overview" : isClientsActive ? "Clients & Pages" : isTasksActive ? "Tasks Board" : isTeamActive ? "Team Members" : isContentActive ? "Content Workflow" : "Workspace"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] md:text-xs text-zinc-500">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono capitalize">
              plan: {workspace.plan}
            </span>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 flex-1 w-full max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
