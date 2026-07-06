"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Loader2, 
  Users, 
  FolderKanban, 
  Layers, 
  PlusCircle, 
  ToggleLeft, 
  ToggleRight, 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin,
  X as CloseIcon,
  Check,
  ChevronRight,
  Sparkles,
  Link2
} from "lucide-react";

// Platform helper config
const platforms = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600 bg-blue-600/10 border-blue-600/20" },
  { value: "tiktok", label: "TikTok", icon: Globe, color: "text-teal-400 bg-teal-400/10 border-teal-400/20" },
  { value: "x", label: "X (Twitter)", icon: Globe, color: "text-white bg-white/10 border-white/20" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
];

export default function ClientsPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex State Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const clients = useQuery(
    api.clients.list,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const socialPages = useQuery(
    api.socialPages.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const createClient = useMutation(api.clients.create);
  const toggleClientActive = useMutation(api.clients.toggleActive);
  const createProject = useMutation(api.projects.create);
  const updateProjectStatus = useMutation(api.projects.updateStatus);
  const createSocialPage = useMutation(api.socialPages.create);
  const togglePageActive = useMutation(api.socialPages.toggleActive);

  // Component local states (Modals)
  const [activeModal, setActiveModal] = useState<null | "client" | "project" | "page">(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Form States
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [pagePlatform, setPagePlatform] = useState("instagram");
  const [pageHandle, setPageHandle] = useState("");

  const [loadingAction, setLoadingAction] = useState(false);

  if (workspace === undefined || clients === undefined || projects === undefined || socialPages === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Fetching clients, campaigns, and page profiles...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setLoadingAction(true);
    try {
      await createClient({
        workspaceId: workspace._id,
        name: clientName.trim(),
      });
      setClientName("");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedClientId) return;
    setLoadingAction(true);
    try {
      await createProject({
        clientId: selectedClientId as any,
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
      });
      setProjectName("");
      setProjectDesc("");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateSocialPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageHandle.trim() || !selectedClientId) return;
    setLoadingAction(true);
    try {
      await createSocialPage({
        clientId: selectedClientId as any,
        platform: pagePlatform as any,
        handle: pageHandle.trim().replace(/^@/, ""),
      });
      setPageHandle("");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Clients & Connections</h2>
          <p className="text-sm text-zinc-400">
            Define client entities, configure campaigns, and link social pages for workflow & cashflow tracking.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setActiveModal("client")} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Client
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Clients list (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" /> Active Clients ({clients.length})
            </h3>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 rounded-2xl border border-zinc-900 border-dashed bg-zinc-950/20 text-center flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-white">No clients found</h4>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Create your first client to start organizing campaigns and publishing schedules.
                </p>
              </div>
              <Button onClick={() => setActiveModal("client")} variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900">
                Create Client Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((client) => {
                const clientProjects = projects.filter(p => p.clientId === client._id);
                const clientPages = socialPages.filter(p => p.clientId === client._id);

                return (
                  <div 
                    key={client._id}
                    className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4 hover:border-zinc-800 transition-all duration-300 relative group"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {client.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wide">
                          Client
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => toggleClientActive({ clientId: client._id, isActive: !client.isActive })}
                        className={`text-zinc-500 transition-colors ${client.isActive ? "text-indigo-400" : "text-zinc-700"}`}
                      >
                        {client.isActive ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-900/50 pt-3 text-xs text-zinc-400">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase">Campaigns</span>
                        <span className="font-semibold text-zinc-200">{clientProjects.length} Active</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase">Social Pages</span>
                        <span className="font-semibold text-zinc-200">{clientPages.length} Bound</span>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2 border-t border-zinc-900/50 pt-3 mt-auto">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("project");
                        }}
                        className="text-[10px] h-7 px-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-850 text-zinc-300"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Campaign
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("page");
                        }}
                        className="text-[10px] h-7 px-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 ml-auto"
                      >
                        <Link2 className="h-3 w-3 mr-1" /> Connect Page
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Channels & campaigns (1 col) */}
        <div className="flex flex-col gap-8 border-l-0 lg:border-l border-zinc-900 pl-0 lg:pl-8">
          
          {/* Linked Pages */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" /> Linked Accounts ({socialPages.length})
            </h3>

            {socialPages.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No social pages connected yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {socialPages.map((page) => {
                  const client = clients.find(c => c._id === page.clientId);
                  const pConfig = platforms.find(p => p.value === page.platform);
                  const PIcon = pConfig ? pConfig.icon : Globe;

                  return (
                    <div 
                      key={page._id}
                      className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 flex items-center justify-between hover:border-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded border ${pConfig?.color || "text-zinc-500 bg-zinc-900"}`}>
                          <PIcon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-zinc-200">@{page.handle}</span>
                          <span className="text-[9px] text-zinc-500">Client: {client?.name || "Unknown"}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => togglePageActive({ pageId: page._id, isActive: !page.isActive })}
                        className={`text-[9.5px] px-1.5 py-0.5 rounded font-semibold border ${
                          page.isActive 
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                            : "bg-zinc-900 text-zinc-600 border-zinc-800"
                        }`}
                      >
                        {page.isActive ? "Active" : "Paused"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          <div className="flex flex-col gap-4 border-t border-zinc-900 pt-6">
            <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-indigo-400" /> Active Projects ({projects.length})
            </h3>

            {projects.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No campaigns initialized yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((project) => {
                  const client = clients.find(c => c._id === project.clientId);

                  return (
                    <div 
                      key={project._id}
                      className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 flex flex-col gap-1.5 hover:border-zinc-800 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-zinc-200 truncate">{project.name}</span>
                        <select 
                          value={project.status}
                          onChange={(e) => updateProjectStatus({ projectId: project._id, status: e.target.value as any })}
                          className="text-[9px] font-bold uppercase tracking-wide bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-1 py-0.5"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-zinc-500">
                        <span>Client: {client?.name || "Unknown"}</span>
                        {project.description && <span className="italic truncate max-w-[150px]">{project.description}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- MODALS OVERLAYS --- */}
      
      {/* 1. Client Modal */}
      {activeModal === "client" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Add Client Profile</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Client Name</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corp" 
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Create Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Project/Campaign Modal */}
      {activeModal === "project" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Initialize Campaign</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Target Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  <option value="">Select a Client...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Campaign/Project Name</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Summer Launch 2026" 
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Brief Description</label>
                <textarea 
                  value={projectDesc} 
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Optional notes or goals..." 
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Create Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Social Page Modal */}
      {activeModal === "page" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Connect Social Page</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSocialPage} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Target Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  <option value="">Select a Client...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Social Platform</label>
                <select 
                  value={pagePlatform} 
                  onChange={(e) => setPagePlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  {platforms.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Handle / Account Name</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-zinc-500 text-sm font-semibold select-none">@</span>
                  <input 
                    type="text" 
                    value={pageHandle} 
                    onChange={(e) => setPageHandle(e.target.value)}
                    placeholder="handle" 
                    className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Connect Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
