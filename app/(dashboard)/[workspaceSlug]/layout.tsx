"use client";

import { ReactNode, useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  X,
  Settings,
  Image,
  Bell,
  Sparkles,
  Target
} from "lucide-react";
import Link from "next/link";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.workspaceSlug as string;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  const myMembership = useQuery(
    api.members.getMyMembership,
    workspace?._id ? { workspaceId: workspace._id } : "skip"
  );

  // Determine if the pink theme is active for this user (false if still loading)
  const isPinkTheme = myMembership?.themeOverride === "pink";

  // Apply/remove the pink class on <html> so it overrides dark: Tailwind variants
  // Must be called before any early returns to satisfy React's rules of hooks
  useEffect(() => {
    const html = document.documentElement;
    if (isPinkTheme) {
      html.classList.remove("dark");
      html.classList.add("pink");
    } else {
      html.classList.remove("pink");
      // Restore dark theme based on user's saved preference
      const savedTheme = localStorage.getItem("theme");
      if (
        savedTheme === "dark" ||
        (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        html.classList.add("dark");
      }
    }
    return () => {
      // On unmount, remove pink and restore the saved theme
      html.classList.remove("pink");
      const savedTheme = localStorage.getItem("theme");
      if (
        savedTheme === "dark" ||
        (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        html.classList.add("dark");
      }
    };
  }, [isPinkTheme]);

  if (workspace === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0c0e] text-zinc-400 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-[#05ffc4] mb-4" />
        <p className="text-sm font-medium">Loading workspace dashboard...</p>
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0c0e] text-zinc-50 font-sans px-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-red-900/30 bg-red-950/5 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <Layers className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We couldn't find workspace <code className="text-xs px-1.5 py-0.5 bg-zinc-900 rounded font-mono text-[#05ffc4]">"{slug}"</code> or you do not have permission to view it.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Link href="/" className="w-full">
              <Button className="w-full bg-[#05ffc4] hover:bg-[#00e5b0] text-[#0b0c0e] font-bold shadow-lg shadow-[#05ffc4]/20">
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
  const isSettingsActive = pathname.startsWith(`/${workspace.slug}/settings`);
  const isMediaActive = pathname.startsWith(`/${workspace.slug}/media`);
  const isFinanceActive = pathname.startsWith(`/${workspace.slug}/finance`);
  const isLeadsActive = pathname.startsWith(`/${workspace.slug}/leads`);


  const closeSidebar = () => setIsMobileSidebarOpen(false);

  const activeIconClass = isPinkTheme ? "text-rose-500" : "text-indigo-650 dark:text-[#05ffc4]";
  const inactiveIconClass = "text-zinc-550 dark:text-zinc-550 group-hover:text-zinc-800 dark:group-hover:text-zinc-300";

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={closeSidebar} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Drawer (Inspired by Hynex Sidebar mockup) */}
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-border bg-card flex flex-col z-50 shrink-0 transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Brand & Mobile Close */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href={`/${workspace.slug}`} onClick={closeSidebar} className="flex items-center gap-2.5">
            {/* Custom Interlocking double loop SVG (similar to Hynex logo) */}
            <svg 
              className={`h-6 w-6 ${isPinkTheme ? "text-rose-500" : "text-indigo-600 dark:text-[#05ffc4]"}`}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M4.5 16.5c-1.5-1.5-2.5-3.5-2.5-6s1-4.5 2.5-6S9 2 11.5 4.5s4.5 6 4.5 8.5-1 4.5-2.5 6-4.5 2.5-7 0z" />
              <path d="M19.5 7.5c1.5 1.5 2.5 3.5 2.5 6s-1 4.5-2.5 6-4.5 2.5-7 0-4.5-6-4.5-8.5 1-4.5 2.5-6 4.5-2.5 7 0z" opacity="0.8" />
            </svg>
            <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-white font-sans">Socials Arc</span>
          </Link>
          <button 
            onClick={closeSidebar}
            className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-150 dark:hover:bg-zinc-900 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Quick Details */}
        <div className="p-3.5 mx-4 my-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-0.5 transition-colors">
          <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider">Active Workspace</span>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{workspace.name}</span>
          <span className={`text-[9px] ${isPinkTheme ? "text-rose-500/80" : "text-indigo-650 dark:text-[#05ffc4]/80"} font-semibold truncate uppercase`}>Slug: {workspace.slug}</span>
        </div>

        {/* Structured Tree Navigation (Inspired by Hynex bullet connection mockup) */}
        <nav className="flex-1 px-4 py-2 flex flex-col gap-6 overflow-y-auto scrollbar-none">
          
          {/* SECTION 1: MAIN */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-650 px-3 mb-2">Main</span>
            <div className="pl-3 border-l border-zinc-200 dark:border-[#1d2027] flex flex-col gap-1 ml-3.5 relative">
              <Link 
                href={`/${workspace.slug}`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isDashboardActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <LayoutDashboard className={`h-4 w-4 shrink-0 transition-colors ${isDashboardActive ? activeIconClass : inactiveIconClass}`} />
                <span>Overview</span>
              </Link>
              
              <Link 
                href={`/${workspace.slug}/clients`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isClientsActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Briefcase className={`h-4 w-4 shrink-0 transition-colors ${isClientsActive ? activeIconClass : inactiveIconClass}`} />
                <span>Clients & Pages</span>
              </Link>

              <Link 
                href={`/${workspace.slug}/team`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isTeamActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Users className={`h-4 w-4 shrink-0 transition-colors ${isTeamActive ? activeIconClass : inactiveIconClass}`} />
                <span>Team Members</span>
              </Link>
            </div>
          </div>

          {/* SECTION 2: FEATURES */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-3 mb-2">Features</span>
            <div className="pl-3 border-l border-[#1d2027] flex flex-col gap-1 ml-3.5">
              <Link 
                href={`/${workspace.slug}/tasks`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isTasksActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Calendar className={`h-4 w-4 shrink-0 transition-colors ${isTasksActive ? activeIconClass : inactiveIconClass}`} />
                <span>Tasks Board</span>
              </Link>

              <Link 
                href={`/${workspace.slug}/content`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isContentActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Layers className={`h-4 w-4 shrink-0 transition-colors ${isContentActive ? activeIconClass : inactiveIconClass}`} />
                <span>Content Workflow</span>
              </Link>

              <Link 
                href={`/${workspace.slug}/media`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isMediaActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Image className={`h-4 w-4 shrink-0 transition-colors ${isMediaActive ? activeIconClass : inactiveIconClass}`} />
                <span>Media Library</span>
              </Link>

              <Link 
                href={`/${workspace.slug}/leads`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isLeadsActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Target className={`h-4 w-4 shrink-0 transition-colors ${isLeadsActive ? activeIconClass : inactiveIconClass}`} />
                <span>Leads & CRM</span>
              </Link>
            </div>
          </div>

          {/* SECTION 3: TOOLS */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-3 mb-2">Tools</span>
            <div className="pl-3 border-l border-[#1d2027] flex flex-col gap-1 ml-3.5">
              <Link 
                href={`/${workspace.slug}/settings`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isSettingsActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <Settings className={`h-4 w-4 shrink-0 transition-colors ${isSettingsActive ? activeIconClass : inactiveIconClass}`} />
                <span>Workspace Settings</span>
              </Link>

              <Link 
                href={`/${workspace.slug}/finance`} 
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                  isFinanceActive 
                    ? "bg-indigo-50/50 dark:bg-[#05ffc4]/5 text-indigo-650 dark:text-[#05ffc4] border border-indigo-200/50 dark:border-[#05ffc4]/15" 
                    : "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-150/80 dark:hover:bg-[#12141a]/40"
                }`}
              >
                <TrendingUp className={`h-4 w-4 shrink-0 transition-colors ${isFinanceActive ? activeIconClass : inactiveIconClass}`} />
                <span>Finance P&L</span>
              </Link>
            </div>
          </div>

        </nav>

        {/* Footer Settings & Auth */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-background/40">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-zinc-200">Account</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase">Settings & Profile</span>
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
      <main className="flex-1 flex flex-col overflow-y-auto bg-background relative transition-colors duration-200">
        {/* Neon Backdrop Glow (Inspired by Hynex design) */}
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#05ffc4]/3 rounded-full blur-[120px] pointer-events-none" />

        {/* Header (Top Search bar structure) */}
        <header className="h-16 border-b border-border px-4 md:px-8 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-md sticky top-0 z-10 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 rounded text-zinc-550 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 md:hidden focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {isDashboardActive ? "Dashboard Overview" : isClientsActive ? "Clients & Pages" : isTasksActive ? "Tasks Board" : isTeamActive ? "Team Members" : isContentActive ? "Content Workflow" : isMediaActive ? "Media Library" : isFinanceActive ? "Finance Ledger" : isSettingsActive ? "Workspace Settings" : "Workspace"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3.5">
            {/* Header controls (Inspired by top-right header mockup) */}
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-[#12141a] border border-zinc-200 dark:border-[#1d2027] text-zinc-650 dark:text-zinc-400">
              Workspace Plan: <span className={`font-bold ${isPinkTheme ? "text-rose-500" : "text-indigo-650 dark:text-[#05ffc4]"}`}>{workspace.plan}</span>
            </span>
            {isPinkTheme ? (
                <span
                  title="Theme locked to Pastel Pink 🌸"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-300 bg-rose-100 text-rose-500 text-[9px] font-bold uppercase tracking-wider cursor-default select-none"
                >
                  🌸 Pink
                </span>
              ) : (
                <ThemeToggle />
              )}
            <button className="p-1.5 rounded-lg border border-zinc-250 dark:border-[#16181d] text-zinc-650 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-[#05ffc4] hover:bg-zinc-200/50 dark:hover:bg-[#12141a] transition-all">
              <Bell className="h-3.5 w-3.5" />
            </button>
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
