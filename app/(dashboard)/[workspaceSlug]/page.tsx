"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Layers, 
  FileText, 
  CheckSquare, 
  Plus, 
  Search, 
  ArrowUpRight, 
  BarChart3, 
  ArrowRight, 
  Settings, 
  AlertCircle, 
  Calendar, 
  Sparkles,
  MessageSquare,
  Sparkle,
  Send,
  Mic,
  Copy
} from "lucide-react";
import Link from "next/link";

export default function WorkspaceDashboard() {
  const params = useParams();
  const slug = params.workspaceSlug as string;
  const { user, isLoaded: isUserLoaded } = useUser();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">("all");

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const clients = useQuery(
    api.clients.list,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  
  const posts = useQuery(
    api.posts.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  
  const tasks = useQuery(
    api.tasks.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  
  const socialPages = useQuery(
    api.socialPages.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  
  const members = useQuery(
    api.workspaces.listMembers,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const isLoading = 
    workspace === undefined ||
    clients === undefined ||
    posts === undefined ||
    tasks === undefined ||
    socialPages === undefined ||
    members === undefined ||
    projects === undefined ||
    !isUserLoaded;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-48 bg-zinc-900 rounded"></div>
            <div className="h-4 w-64 bg-zinc-900 rounded"></div>
          </div>
          <div className="h-10 w-28 bg-zinc-900 rounded-full"></div>
        </div>

        {/* Layout grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="h-56 bg-zinc-900 rounded-2xl"></div>
            <div className="h-72 bg-zinc-900 rounded-2xl"></div>
          </div>
          <div className="h-[500px] bg-zinc-900 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  // Platform details config with mockup neon styling
  const platformConfigs: Record<string, { label: string; color: string; border: string; bg: string }> = {
    instagram: { 
      label: "Instagram", 
      color: "text-pink-400", 
      border: "border-pink-900/30", 
      bg: "bg-pink-950/20" 
    },
    facebook: { 
      label: "Facebook", 
      color: "text-blue-400", 
      border: "border-blue-900/30", 
      bg: "bg-blue-950/20" 
    },
    tiktok: { 
      label: "TikTok", 
      color: "text-[#05ffc4]", 
      border: "border-[#05ffc4]/20", 
      bg: "bg-[#05ffc4]/5" 
    },
    x: { 
      label: "X", 
      color: "text-zinc-300", 
      border: "border-zinc-800", 
      bg: "bg-zinc-900/40" 
    },
    linkedin: { 
      label: "LinkedIn", 
      color: "text-indigo-400", 
      border: "border-indigo-900/30", 
      bg: "bg-indigo-950/20" 
    },
  };

  // Status badges matching Hynex health table status look
  const statusCapsules: Record<string, string> = {
    draft: "bg-zinc-900 text-zinc-400 border border-zinc-800",
    internal_review: "bg-amber-950/20 text-amber-400 border border-amber-900/30",
    client_review: "bg-purple-950/20 text-purple-400 border border-purple-900/30",
    changes_requested: "bg-red-950/20 text-red-400 border border-red-900/30",
    approved: "bg-[#05ffc4]/10 text-[#05ffc4] border border-[#05ffc4]/25",
    scheduled: "bg-indigo-950/20 text-indigo-400 border border-indigo-900/30",
    published: "bg-sky-950/20 text-sky-400 border border-sky-900/30",
  };

  // 1. Platform counts
  const postsPerPlatform: Record<string, number> = {
    instagram: 0,
    facebook: 0,
    tiktok: 0,
    x: 0,
    linkedin: 0,
  };
  
  posts.forEach(post => {
    const page = socialPages.find(sp => sp._id === post.pageId);
    if (page && page.platform in postsPerPlatform) {
      postsPerPlatform[page.platform]++;
    }
  });

  const totalPostsCount = posts.length;

  // Plan limits mapping
  const limits = {
    free: { clients: 1, channels: 1, posts: 5 },
    pro: { clients: 10, channels: 5, posts: 100 },
    agency: { clients: 999, channels: 999, posts: 999 }
  }[workspace.plan as "free" | "pro" | "agency"] || { clients: 1, channels: 1, posts: 5 };

  // Calculate Segmented progress bar metrics
  const clientsQuota = Math.min(clients.length, limits.clients);
  const channelsQuota = Math.min(socialPages.length, limits.channels);
  const postsQuota = Math.min(totalPostsCount, limits.posts);

  const totalQuotaCapacity = limits.clients + limits.channels + limits.posts;
  const currentQuotaUsed = clientsQuota + channelsQuota + postsQuota;

  const clientsPercent = totalQuotaCapacity > 0 ? (clientsQuota / totalQuotaCapacity) * 100 : 0;
  const channelsPercent = totalQuotaCapacity > 0 ? (channelsQuota / totalQuotaCapacity) * 100 : 0;
  const postsPercent = totalQuotaCapacity > 0 ? (postsQuota / totalQuotaCapacity) * 100 : 0;

  // Filter posts based on query and tabs
  const filteredPosts = posts.filter(post => {
    // Search check
    const matchesSearch = post.caption.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Tab check
    if (activeTab === "pending") {
      return post.status === "internal_review" || post.status === "client_review";
    }
    if (activeTab === "approved") {
      return post.status === "approved" || post.status === "scheduled" || post.status === "published";
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 py-2">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-0.5 text-left">
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">Dashboard</h2>
          <p className="text-xs text-zinc-500">Welcome back to your workspace deck, {user?.firstName || "Creator"} 👋</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="hidden sm:inline-block px-3 py-1 bg-[#12141a] border border-[#1d2027] rounded-full text-xs font-semibold text-zinc-400">
             Active: <span className="text-[#05ffc4] uppercase font-bold">{workspace.name}</span>
          </span>
          {workspace.plan !== "agency" && (
            <Link href={`/${slug}/settings`}>
              <Button size="sm" className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold shadow-lg shadow-[#05ffc4]/15 border border-[#05ffc4]/20 rounded-lg text-xs gap-1.5 px-4 py-2">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. THREE COLUMN GRID SYSTEM (Directly inspired by Hynex Dashboard layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* ================= COLUMN 1 ================= */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          
          {/* Card 1.1: General Overview & AI Crystal shape (Inspired by AI assistant panel in reference-1) */}
          <div className="p-5 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col sm:flex-row justify-between gap-5 relative overflow-hidden group hover:border-[#1d2027] transition-all">
            {/* Background vector glow */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#05ffc4]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col justify-between text-left flex-1 z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Workspace Health Score</span>
                <span className="text-3xl font-extrabold text-white tracking-tight">${clients.length * 1500 + totalPostsCount * 250}.00</span>
                <span className="text-[11px] text-zinc-400">Estimated value generated • <span className="text-[#05ffc4] font-semibold">+12.4% this week</span></span>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-[#12141a] border border-[#1d2027]">
                <span className="text-[10px] font-bold text-[#05ffc4] uppercase block mb-1">AI Agent System Status</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Your AI assistant is analyzing channel performance metrics. Workflow operations are performing smoothly.
                </p>
              </div>
            </div>

            {/* Glowing 3D Glass Crystal Graphic (Pure CSS implementation of the crystal shape in mockup) */}
            <div className="flex items-center justify-center min-w-[200px] h-[160px] bg-[#12141a]/60 border border-[#1d2027] rounded-xl relative overflow-hidden group-hover:bg-[#12141a] transition-all duration-300">
              <div className="absolute inset-0 bg-radial-gradient from-[#05ffc4]/15 via-transparent to-transparent opacity-60 animate-pulse pointer-events-none" />
              
              {/* Animated Crystal Shape */}
              <div className="relative w-20 h-20 transform rotate-45 select-none animate-bounce" style={{ animationDuration: '4s' }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-[#05ffc4]/50 to-[#00d9f5]/55 border border-[#05ffc4]/30 rounded-lg backdrop-blur-sm shadow-xl shadow-[#05ffc4]/10 transform translate-x-2 translate-y-2 scale-90 opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-bl from-[#00f5a0]/70 to-[#05ffc4]/40 border border-[#05ffc4]/40 rounded-lg backdrop-blur-md shadow-2xl shadow-[#05ffc4]/20 transform -translate-x-1 -translate-y-1" />
                <div className="absolute inset-1/4 bg-[#0b0c0e]/90 border border-zinc-800/40 rounded-md transform rotate-12 flex items-center justify-center text-[10px] text-[#05ffc4] font-bold">
                  S.A
                </div>
              </div>
            </div>
          </div>

          {/* Card 1.2: Usage Quotas & Segmented Progress Bar (Inspired by Spending Limits in reference-1) */}
          <div className="p-5 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Workspace Resource Limits</h3>
                <p className="text-[10px] text-zinc-500">Usage statistics mapped to subscription plan: {workspace.plan}</p>
              </div>
              <span className="text-[10px] font-bold text-[#05ffc4] bg-[#05ffc4]/10 border border-[#05ffc4]/25 px-2.5 py-0.5 rounded-full uppercase">
                {Math.round((currentQuotaUsed / totalQuotaCapacity) * 100)}% Used
              </span>
            </div>

            {/* Multi-Segmented Quota Progress Bar */}
            <div className="h-3 w-full bg-[#12141a] rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-[#00f5a0] transition-all duration-500" 
                style={{ width: `${Math.max(clientsPercent, 3)}%` }} 
                title="Clients usage"
              />
              <div 
                className="h-full bg-gradient-to-r from-[#00f5a0] to-cyan-500 transition-all duration-500" 
                style={{ width: `${Math.max(channelsPercent, 3)}%` }} 
                title="Channels usage"
              />
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500" 
                style={{ width: `${Math.max(postsPercent, 3)}%` }} 
                title="Posts usage"
              />
            </div>

            {/* Quota Indicators Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Clients</span>
                </div>
                <span className="text-sm font-extrabold text-zinc-200">
                  {clients.length} <span className="text-[10px] text-zinc-550 font-normal">/ {limits.clients === 999 ? "∞" : limits.clients}</span>
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Channels</span>
                </div>
                <span className="text-sm font-extrabold text-zinc-200">
                  {socialPages.length} <span className="text-[10px] text-zinc-550 font-normal">/ {limits.channels === 999 ? "∞" : limits.channels}</span>
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Posts/Mo</span>
                </div>
                <span className="text-sm font-extrabold text-zinc-200">
                  {totalPostsCount} <span className="text-[10px] text-zinc-550 font-normal">/ {limits.posts === 999 ? "∞" : limits.posts}</span>
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* ================= COLUMN 2: METRICS / SETTINGS (Smart Health Finance mockup equivalent) ================= */}
        <div className="flex flex-col gap-5">
          
          {/* Card 2.1: Operational Tasks & Performance (Smart Health Finance) */}
          <div className="p-5 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center border-b border-[#16181d] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Campaign Rollup Data</span>
              <span className="text-[10px] text-zinc-500 font-medium">Monthly Stats</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-black text-white tracking-tight">{tasks.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Workspace Tasks</span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-2xl font-black text-[#05ffc4] tracking-tight">
                  {tasks.filter(t => t.status === "done").length}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tasks Completed</span>
              </div>
            </div>

            {/* Custom Mini Area Graph (Simulating chart wave line in reference-1) */}
            <div className="h-16 w-full relative mt-1 flex items-end">
              <svg className="w-full h-full text-[#05ffc4] opacity-80" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#05ffc4" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#05ffc4" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M0,25 C20,15 40,5 60,18 C80,30 90,8 100,10 L100,30 L0,30 Z" fill="url(#neonGradient)" />
                <path d="M0,25 C20,15 40,5 60,18 C80,30 90,8 100,10" fill="none" stroke="#05ffc4" strokeWidth="1.5" />
              </svg>
              <div className="absolute top-2 right-2 text-[9px] font-extrabold text-[#05ffc4] bg-[#05ffc4]/10 border border-[#05ffc4]/25 px-1.5 py-0.5 rounded">
                +6.2% activity
              </div>
            </div>

            {/* Quick Members bubble profile icons list (matching mockup) */}
            <div className="flex items-center gap-1.5 border-t border-[#16181d] pt-3.5 mt-1">
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 5).map((m, idx) => (
                  <div 
                    key={idx} 
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b0c0e] bg-zinc-800 text-[9px] font-extrabold flex items-center justify-center uppercase text-zinc-400 border border-zinc-700"
                    title={`User: ${m.userId.substring(0, 5)}`}
                  >
                    {m.role === "owner" ? "OW" : "ED"}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 font-semibold uppercase">{members.length} Active Editors</span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. RECENT CAMPAIGNS SEARCHABLE WIDGET TABLE & CHAT (Bottom widgets in reference-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-1">
        
        {/* Left Search Table widget (Inspired by metrics search records table in reference-1) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col gap-4 text-left">
          
          {/* Header controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#16181d] pb-3">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search health metrics/posts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12141a] border border-[#1d2027] rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-850"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-0.5 bg-[#12141a] border border-[#1d2027] rounded-lg">
              {[
                { id: "all", label: "All Records" },
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    activeTab === tab.id 
                      ? "bg-[#0d0e12] text-[#05ffc4] border border-[#05ffc4]/15" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Records list table */}
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600 gap-1.5">
              <AlertCircle className="h-5 w-5 text-zinc-650" />
              <p className="text-xs font-semibold">No records match the filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] border-b border-[#16181d] pb-2">
                    <th className="py-2.5 px-3">Category (Caption)</th>
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/20">
                  {filteredPosts.slice(0, 5).map((post) => {
                    const project = projects.find(p => p._id === post.projectId);
                    const page = socialPages.find(sp => sp._id === post.pageId);
                    const pConfig = page ? platformConfigs[page.platform] : null;

                    return (
                      <tr key={post._id} className="hover:bg-[#12141a]/20 transition-colors group">
                        <td className="py-3 px-3 max-w-[220px] truncate font-semibold text-zinc-200 group-hover:text-white">
                          {post.caption}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 font-medium">
                          {project ? project.name : "N/A"}
                        </td>
                        <td className="py-3 px-3">
                          {page && pConfig ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold border ${pConfig.bg} ${pConfig.color} ${pConfig.border}`}>
                              {page.handle}
                            </span>
                          ) : "N/A"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusCapsules[post.status] || "bg-zinc-800 text-zinc-400"}`}>
                            {post.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* See All link */}
          <Link href={`/${slug}/content`} className="w-full">
            <Button variant="ghost" className="w-full text-xs text-zinc-500 hover:text-[#05ffc4] hover:bg-[#12141a]/40 font-bold gap-1 mt-2.5 py-2">
              Inspect Content Workflow Pipelines <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

        </div>

        {/* Right AI Assistant Chat interface widget (Inspired by AI Assistant chat mockup in reference-1) */}
        <div className="p-5 rounded-2xl border border-[#16181d] bg-[#0d0e12] flex flex-col justify-between gap-4 text-left min-h-[380px]">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[#16181d] pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-[#05ffc4] animate-spin" style={{ animationDuration: '6s' }} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">AI Assistant Hub</h3>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <button className="p-1 rounded hover:bg-zinc-900 hover:text-white" title="Export Thread">
                <Copy className="h-3 w-3" />
              </button>
              <button className="p-1 rounded hover:bg-zinc-900 hover:text-white" title="New Session">
                <ArrowRight className="h-3 w-3 transform rotate-45" />
              </button>
            </div>
          </div>

          {/* Chat scroll content */}
          <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-0.5 justify-center py-2">
            
            {/* Bubble 1: User */}
            <div className="bg-[#12141a] border border-[#1d2027] text-zinc-300 text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-none self-end max-w-[85%] leading-relaxed shadow-sm">
              Which workspace status pipelines should I prioritize for content planning?
            </div>

            {/* Bubble 2: Assistant */}
            <div className="flex gap-2 items-start max-w-[90%] text-left">
              <div className="h-5 w-5 rounded-full bg-[#05ffc4]/15 border border-[#05ffc4]/20 flex items-center justify-center text-[9px] font-bold text-[#05ffc4] shrink-0 mt-0.5">
                AI
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="bg-[#12141a] border border-[#1d2027] text-zinc-350 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none leading-relaxed shadow-sm">
                  <span className="text-[#05ffc4] font-bold">Focus: Content Scheduling.</span> Prioritize posts in <span className="text-[#05ffc4] font-semibold">Client Review</span> and ensure client approvals are completed. Keep an eye on your monthly posts limits.
                </div>
              </div>
            </div>

          </div>

          {/* Chat prompt input area */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5">
              {["Ask AI", "Review P&L", "Copy Approval Link"].map((chip, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-0.5 bg-[#12141a] hover:bg-[#12141a]/85 border border-[#1d2027] hover:border-zinc-800 text-[9px] font-bold uppercase text-zinc-400 hover:text-zinc-200 cursor-pointer rounded-full transition-all"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Input form */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ask AI Assistant or search metrics..."
                disabled
                className="w-full bg-[#12141a] border border-[#1d2027] rounded-lg py-2 pl-3 pr-16 text-xs text-zinc-450 placeholder-zinc-550 focus:outline-none"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button className="p-1 rounded hover:bg-zinc-900 text-zinc-550 hover:text-zinc-300" title="Voice Search">
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 rounded bg-[#05ffc4]/10 text-[#05ffc4] border border-[#05ffc4]/20 hover:opacity-85" title="Submit">
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
