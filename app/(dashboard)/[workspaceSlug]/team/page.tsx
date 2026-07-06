"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  User,
  X as CloseIcon,
  HelpCircle,
  AlertCircle
} from "lucide-react";

export default function TeamPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const activeMembers = useQuery(
    api.members.listActiveMembers,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  
  const pendingInvites = useQuery(
    api.members.listPendingInvites,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const sendInvite = useMutation(api.members.invite);
  const cancelInvite = useMutation(api.members.cancelInvite);

  // Local States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "client">("editor");
  const [loadingAction, setLoadingAction] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (workspace === undefined || activeMembers === undefined || pendingInvites === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading workspace team roster...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Handle invitation submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setLoadingAction(true);
    setErrorMsg("");
    try {
      await sendInvite({
        workspaceId: workspace._id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Copy mock invite link helper
  const handleCopyLink = (memberId: string) => {
    const inviteUrl = `${window.location.origin}/invite/accept?workspaceId=${workspace._id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteId(memberId);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Handle invite deletion
  const handleCancelInvite = async (memberId: any) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await cancelInvite({ memberId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Team Management</h2>
          <p className="text-sm text-zinc-400">
            Invite colleagues, manage assistant roles, and control client dashboard visibility.
          </p>
        </div>
        
        <Button 
          onClick={() => {
            setErrorMsg("");
            setShowInviteModal(true);
          }} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
        >
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite Teammate
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Members (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" /> Active Members ({activeMembers.length})
          </h3>

          <div className="flex flex-col gap-3">
            {activeMembers.map((member) => (
              <div 
                key={member.userId}
                className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-center justify-between hover:border-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/25">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-zinc-200">
                      {member.userId === workspace.ownerId ? "Workspace Owner" : `User ID: ${member.userId.substring(0, 15)}...`}
                    </span>
                    {member.invitedEmail && (
                      <span className="text-xs text-zinc-500">{member.invitedEmail}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold uppercase tracking-wider">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites (1 col) */}
        <div className="flex flex-col gap-6 border-l-0 lg:border-l border-zinc-900 pl-0 lg:pl-8">
          <h3 className="text-sm font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Pending Invites ({pendingInvites.length})
          </h3>

          {pendingInvites.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-left">No pending invitations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite._id}
                  className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 flex flex-col gap-3 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 max-w-[170px]">
                      <span className="text-xs font-semibold text-zinc-200 truncate" title={invite.invitedEmail}>
                        {invite.invitedEmail}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        Role: {invite.role}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => handleCancelInvite(invite._id)}
                      className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-zinc-900"
                      title="Cancel Invite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Accept helper box */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900/60">
                    <span className="text-[9px] text-zinc-500 italic">
                      Copy the join link below and open it in an incognito window to register/test the invitee account:
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handleCopyLink(invite._id)}
                      className={`w-full text-[10px] h-7 ${
                        copiedInviteId === invite._id 
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-850"
                      }`}
                    >
                      {copiedInviteId === invite._id ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Copied Join Link
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Join Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- INVITE MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Invite Teammate</h3>
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="text-zinc-500 hover:text-zinc-300"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="p-6 flex flex-col gap-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input 
                    type="email" 
                    value={inviteEmail} 
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com" 
                    className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Workspace Role</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  <option value="editor">Editor (Create & edit posts/tasks)</option>
                  <option value="admin">Admin (Invite users, manage workspace settings)</option>
                  <option value="client">Client (View-only + approve external share links)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowInviteModal(false)} 
                  className="text-zinc-500 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
