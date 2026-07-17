"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation } from "convex/react";
import { SignInButton, SignUpButton, UserButton, useUser, SignOutButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  Shield, 
  PlusCircle, 
  LayoutDashboard, 
  Sparkles,
  Layers,
  Calendar,
  Briefcase,
  Users,
  TrendingUp,
  Image as ImageIcon,
  CheckSquare,
  Lock,
  ArrowRight,
  Globe,
  FileText
} from "lucide-react";

export default function Home() {
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser();
  
  const getOrCreateWorkspace = useMutation(api.workspaces.getOrCreate);
  const [workspace, setWorkspace] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isConvexAuthenticated) {
      setSyncStatus("syncing");
      getOrCreateWorkspace()
        .then((ws) => {
          setWorkspace(ws);
          setSyncStatus("success");
        })
        .catch((err) => {
          console.error("Workspace sync failed:", err);
          setErrorMsg(err.message || "Unknown error occurred");
          setSyncStatus("error");
        });
    }
  }, [isConvexAuthenticated, getOrCreateWorkspace]);

  const isLoading = !isClerkLoaded || (isSignedIn && isConvexLoading);

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#0b0c0e] font-sans text-zinc-50 select-none">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <svg 
            className="h-6 w-6 text-[#05ffc4]"
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
          <span className="font-extrabold text-base tracking-tight text-white">Socials Arc</span>
        </div>
        
        <div className="flex items-center gap-4">
          {!isSignedIn ? (
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-[#05ffc4]/10 hover:bg-[#05ffc4]/15 text-[#05ffc4] border border-[#05ffc4]/25 text-xs font-bold px-3 py-1.5 rounded-lg">
                  Register
                </Button>
              </SignUpButton>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {workspace && (
                <Link href={`/${workspace.slug}`}>
                  <Button size="sm" className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-3.5 py-1.5 rounded-lg">
                    Console
                  </Button>
                </Link>
              )}
              <UserButton />
            </div>
          )}
        </div>
      </header>

      {/* 2. BODY WORKSPACE */}
      <main className="flex-1 flex flex-col items-center px-4 relative overflow-hidden">
        
        {/* Neon Backdrop Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#05ffc4]/3 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-2/3 right-10 w-[350px] h-[350px] bg-[#00d9f5]/2 rounded-full blur-[120px] pointer-events-none" />

        {isLoading ? (
          /* Loading session state card */
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-zinc-400 bg-[#0d0e12] border border-[#16181d] px-8 py-10 rounded-2xl shadow-xl">
              <Loader2 className="h-7 w-7 animate-spin text-[#05ffc4]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Checking credentials...</p>
            </div>
          </div>
        ) : !isSignedIn ? (
          /* ================= UNAUTHENTICATED LANDING SCREEN ================= */
          <div className="w-full max-w-5xl flex flex-col items-center py-16 md:py-24 gap-20 md:gap-28 z-10">
            
            {/* HERO SECTION */}
            <div className="max-w-3xl text-center flex flex-col items-center gap-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#05ffc4]/20 bg-[#05ffc4]/5 text-xs text-[#05ffc4] font-semibold uppercase tracking-widest text-[9px]">
                <Shield className="h-3 w-3" /> Professional Agency Control Deck
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
                One place for planning, approving, & tracking content
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Socials Arc is the ultimate project management platform built for social media agencies. Plan workflows, automate client approvals, manage assets, and track cents-accurate P&L.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xs sm:max-w-none mt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold shadow-lg shadow-[#05ffc4]/15 border border-[#05ffc4]/25 transition-all duration-300">
                    Get Started Console <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto bg-[#12141a] hover:bg-[#1c1f26] border border-[#1d2027] text-zinc-200 hover:text-white font-bold transition-all duration-300">
                    Create Workspace
                  </Button>
                </SignUpButton>
              </div>
            </div>

            {/* PREVIEW CONTAINER (Mockup dashboard) */}
            <div className="w-full rounded-2xl border border-[#16181d] bg-[#0d0e12]/60 p-4 md:p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-radial-gradient from-[#05ffc4]/5 via-transparent to-transparent opacity-60 pointer-events-none" />
              {/* Header mockup dots */}
              <div className="flex items-center gap-1.5 pb-4 border-b border-[#16181d] mb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <span className="text-[10px] text-zinc-600 font-bold ml-2 uppercase font-mono tracking-wider">Socials Arc console.app</span>
              </div>
              
              {/* Mockup layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-3 text-left">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Workspace Plan</span>
                  <div className="h-2 w-full bg-[#12141a] rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400" style={{ width: "40%" }} />
                    <div className="h-full bg-cyan-400" style={{ width: "30%" }} />
                    <div className="h-full bg-indigo-550" style={{ width: "20%" }} />
                  </div>
                  <div className="text-[10px] text-zinc-400 font-semibold uppercase flex justify-between">
                    <span>Quota limits used</span>
                    <span className="text-[#05ffc4]">90% Full</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-2.5 text-left">
                  <span className="text-[9px] uppercase font-bold text-[#05ffc4] tracking-wider">Client approval status</span>
                  <div className="text-sm font-extrabold text-white">Post: Instagram Reel</div>
                  <div className="flex justify-between items-center text-[10px] bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-full w-fit">
                    Approved by Client
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-2 text-left justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Financial Rollups</span>
                  <div className="text-xl font-black text-white">$12,240.00</div>
                  <span className="text-[9px] text-[#05ffc4] font-bold">+6.2% monthly growth</span>
                </div>
              </div>
            </div>

            {/* 3. VALUE FEATURES LIST SECTION */}
            <div className="flex flex-col gap-10 w-full">
              <div className="text-center flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Core Platform Features</h2>
                <p className="text-xs text-zinc-500">Every tool social agencies need, combined in one place</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
                {/* Feature 1 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <Briefcase className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Client Campaigns</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Organize separate workspaces, projects, channels, and transactions per agency client under a single interface.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase font-mono">
                      <span className="text-[#05ffc4] bg-[#05ffc4]/10 px-2 py-0.5 rounded group-hover:bg-[#05ffc4]/20 group-hover:text-white transition-all duration-300">Verified Status</span>
                      <span>cli_98a2</span>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <Layers className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Content Kanban</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Track social drafts with native HTML5 drag-and-drop boards, visual status highlights, and customizable workflow columns.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase font-mono">
                        <span>Workflow Progress</span>
                        <span className="text-[#05ffc4] group-hover:animate-pulse">85%</span>
                      </div>
                      <div className="h-1 w-full bg-[#12141a] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#05ffc4] transition-all duration-700 ease-out group-hover:w-full" style={{ width: "85%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Month Calendar</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        View, filter, schedule, and track all client social publications dynamically in a clean monthly calendar layout.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold uppercase overflow-hidden">
                      <span>12:37 PM, Wed</span>
                      <span className="text-[#05ffc4] transition-transform duration-300 group-hover:translate-x-1 flex items-center gap-0.5">Schedule →</span>
                    </div>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <Globe className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Client Approvals</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Generate passwordless public links for clients to approve content or comment on revisions directly, without requiring logins.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase font-mono">
                      <span className="truncate max-w-[100px]">/share/tok_92a1</span>
                      <span className="text-[#00d9f5] group-hover:text-[#05ffc4] hover:underline cursor-pointer transition-colors duration-300">Copy Link</span>
                    </div>
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <CheckSquare className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Workload Tracker</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Track helper tasks and workload schedules across editors, admins, and assistants to maintain operational balance.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase font-bold font-mono">
                      <div className="flex -space-x-1.5 group-hover:-space-x-0.5 transition-all duration-300">
                        <div className="h-4.5 w-4.5 rounded-full ring-2 ring-[#0d0e12] bg-zinc-800 flex items-center justify-center text-[7px] text-zinc-400 border border-zinc-700">OW</div>
                        <div className="h-4.5 w-4.5 rounded-full ring-2 ring-[#0d0e12] bg-zinc-800 flex items-center justify-center text-[7px] text-zinc-400 border border-zinc-700">ED</div>
                      </div>
                      <span>2 Assigned</span>
                    </div>
                  </div>
                </div>

                {/* Feature 6 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <ImageIcon className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Media Library</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Upload and manage high-resolution photos and reels in our centralized media vault to reuse across multiple social posts.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase font-mono">
                      <span>vault_storage</span>
                      <span className="text-[#05ffc4] group-hover:text-white transition-colors duration-300">WEBP, MP4</span>
                    </div>
                  </div>
                </div>

                {/* Feature 7 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">Finance Ledger</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Track agency income (retainers, sponsors) and expenses (freelancers, tools) with cents-accurate currency ledgers.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className="text-white">$12,240.00</span>
                      <span className="text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">+6.2% P&L</span>
                    </div>
                  </div>
                </div>

                {/* Feature 8 */}
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(3deg)_rotateY(-3deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-3 justify-between min-h-[190px]">
                    <div className="flex flex-col gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 flex items-center justify-center text-[#05ffc4] group-hover:scale-105 transition-transform duration-300">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#05ffc4] transition-colors">AI Assistants</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Leverage integrated AI assistant cards on your control deck to optimize content pipeline priorities.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#16181d] flex gap-1 font-mono uppercase font-bold text-[8px] text-zinc-500">
                      <span className="px-1.5 py-0.5 bg-[#12141a] group-hover:bg-[#05ffc4]/10 border border-[#1d2027] group-hover:border-[#05ffc4]/20 rounded group-hover:text-[#05ffc4] transition-all duration-300">Ask AI</span>
                      <span className="px-1.5 py-0.5 bg-[#12141a] border border-[#1d2027] rounded">Verify</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BILLING & SUBSCRIPTION PLANS SECTION */}
            <div className="flex flex-col gap-10 w-full border-t border-[#16181d] pt-16">
              <div className="text-center flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Flexible Agency Plans</h2>
                <p className="text-xs text-zinc-500">Upgrade or downgrade dynamically based on your team scale</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-start">
                
                {/* Plan 1: Free */}
                <div className="p-6 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-5 hover:border-zinc-800 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Free Tier</span>
                    <span className="text-3xl font-black text-white">$0 <span className="text-xs text-zinc-500 font-bold uppercase">/ month</span></span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">For single content creators starting out.</p>
                  </div>
                  
                  <div className="border-t border-[#16181d] pt-4 flex flex-col gap-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>1 Client Profile</strong> limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>1 Social Channel</strong> limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>5 Monthly Posts</strong> budget</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span>Kanban Boards & Calendar views</span>
                    </div>
                  </div>

                  <SignInButton mode="modal">
                    <Button size="lg" className="w-full bg-[#12141a] hover:bg-[#1c1f26] border border-[#1d2027] text-zinc-350 font-bold text-xs rounded-lg mt-2 py-2">
                      Get Started Free
                    </Button>
                  </SignInButton>
                </div>

                {/* Plan 2: Pro (Recommended) */}
                <div className="p-6 rounded-2xl border border-[#05ffc4]/45 bg-[#0d0e12] flex flex-col gap-5 relative overflow-hidden shadow-xl shadow-[#05ffc4]/5">
                  <div className="absolute top-3 right-3 text-[8.5px] font-extrabold text-[#05ffc4] bg-[#05ffc4]/15 border border-[#05ffc4]/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Recommended
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#05ffc4]">Pro Tier</span>
                    <span className="text-3xl font-black text-white">$49 <span className="text-xs text-zinc-500 font-bold uppercase">/ month</span></span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">For growing social media managers and editors.</p>
                  </div>
                  
                  <div className="border-t border-[#16181d] pt-4 flex flex-col gap-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>10 Client Profiles</strong> limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>5 Social Channels</strong> limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>Unlimited Posts</strong> budget</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span>Teammate Collaboration Invitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span>Centralized Media Asset Library</span>
                    </div>
                  </div>

                  <SignInButton mode="modal">
                    <Button size="lg" className="w-full bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold text-xs rounded-lg mt-2 py-2 border border-[#05ffc4]/20 shadow-md">
                      Go Pro
                    </Button>
                  </SignInButton>
                </div>

                {/* Plan 3: Agency */}
                <div className="p-6 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-5 hover:border-zinc-800 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Agency Tier</span>
                    <span className="text-3xl font-black text-white">$149 <span className="text-xs text-zinc-500 font-bold uppercase">/ month</span></span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">For full-scale digital marketing agencies.</p>
                  </div>
                  
                  <div className="border-t border-[#16181d] pt-4 flex flex-col gap-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>Unlimited Clients</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>Unlimited Social Channels</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span><strong>Unlimited Posts</strong> budget</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span>Cents-accurate <strong>Financial Ledger</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#05ffc4] shrink-0" />
                      <span>AI Performance Priority Assistant</span>
                    </div>
                  </div>

                  <SignInButton mode="modal">
                    <Button size="lg" className="w-full bg-[#12141a] hover:bg-[#1c1f26] border border-[#1d2027] text-zinc-350 font-bold text-xs rounded-lg mt-2 py-2">
                      Request Agency Tier
                    </Button>
                  </SignInButton>
                </div>

              </div>
            </div>

          </div>
        ) : !isConvexAuthenticated ? (
          /* Clerk Signed In, but Convex failed to authenticate */
          <div className="w-full max-w-md p-8 rounded-2xl border border-red-900/30 bg-red-950/5 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl z-10 my-20">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-white">Session Out of Sync</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are signed in to Clerk, but Convex hasn't verified your active session tokens.
              </p>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                If the Convex integration was just enabled, active sessions must be refreshed. Please sign out and sign back in to complete the sync.
              </p>
            </div>
            <SignOutButton>
              <Button size="lg" className="w-full bg-red-650 hover:bg-red-650 text-white shadow-lg shadow-red-600/20">
                Sign Out & Refresh Session
              </Button>
            </SignOutButton>
          </div>
        ) : (
          /* Authenticated Workspace Synced View */
          <div className="w-full max-w-md p-8 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col items-center gap-6 text-center shadow-2xl z-10 my-20">
            {syncStatus === "syncing" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-[#05ffc4]" />
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-base font-bold text-white">Syncing Workspace</h2>
                  <p className="text-xs text-zinc-500">Setting up your space and seeding roles...</p>
                </div>
              </>
            )}

            {syncStatus === "success" && workspace && (
              <>
                <div className="h-12 w-12 rounded-full bg-[#05ffc4]/10 border border-[#05ffc4]/25 flex items-center justify-center text-[#05ffc4]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <h2 className="text-xl font-black text-white">Workspace Synced!</h2>
                  <p className="text-xs text-zinc-500">Your agency workspace is configured and ready.</p>
                </div>
                
                {/* Workspace Card details */}
                <div className="w-full p-4 rounded-xl border border-[#1d2027] bg-[#12141a] flex flex-col gap-2.5 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Name</span>
                    <span className="font-bold text-zinc-200">{workspace.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Slug</span>
                    <span className="font-bold text-zinc-200">{workspace.slug}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Billing Plan</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] bg-[#05ffc4]/10 text-[#05ffc4] font-bold border border-[#05ffc4]/25 capitalize">
                      {workspace.plan}
                    </span>
                  </div>
                </div>

                <Link href={`/${workspace.slug}`} className="w-full">
                  <Button size="lg" className="w-full bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold shadow-lg shadow-[#05ffc4]/15 mt-2">
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Enter Workspace Dashboard
                  </Button>
                </Link>
              </>
            )}

            {syncStatus === "error" && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-base font-bold text-white">Sync Failed</h2>
                  <p className="text-xs text-red-400 font-mono p-2.5 bg-red-950/20 rounded-lg border border-red-900/30">
                    {errorMsg}
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 mt-2"
                >
                  Retry Connection
                </Button>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#16181d] bg-[#0d0e12] text-center text-xs text-zinc-650">
        &copy; {new Date().getFullYear()} Socials Arc. All rights reserved.
      </footer>
    </div>
  );
}
