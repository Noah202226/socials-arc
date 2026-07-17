"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
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
  AlertCircle,
  Edit2,
  Briefcase,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

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

  const tasks = useQuery(
    api.tasks.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const sendInvite = useMutation(api.members.invite);
  const cancelInvite = useMutation(api.members.cancelInvite);
  const updateNickname = useMutation(api.members.updateNickname);
  const setThemeOverride = useMutation(api.members.setThemeOverride);

  // Clerk User
  const { user } = useUser();

  // Local States
  const [editingMemberId, setEditingMemberId] = useState<Id<"members"> | null>(null);
  const [editNicknameValue, setEditNicknameValue] = useState("");
  const [editPictureValue, setEditPictureValue] = useState("");
  const [updatingNicknameId, setUpdatingNicknameId] = useState<Id<"members"> | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Compute permissions
  const currentUserMember = activeMembers?.find(m => m.userId === user?.id);
  const isOwnerOrAdmin = currentUserMember && (currentUserMember.role === "owner" || currentUserMember.role === "admin");
  const canEdit = (memberUserId: string) => {
    return user?.id === memberUserId || isOwnerOrAdmin;
  };

  const handleSaveNicknameModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemberId || !editNicknameValue.trim()) return;
    setUpdatingNicknameId(editingMemberId);
    try {
      await updateNickname({
        memberId: editingMemberId,
        nickname: editNicknameValue.trim(),
        pictureUrl: editPictureValue.trim() || undefined
      });
      toast.success("Teammate profile updated successfully!");
      setShowEditProfileModal(false);
      setEditingMemberId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setUpdatingNicknameId(null);
    }
  };

  // Local States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "client">("editor");
  const [loadingAction, setLoadingAction] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<Id<"members"> | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [togglingThemeId, setTogglingThemeId] = useState<Id<"members"> | null>(null);

  const handleTogglePinkTheme = async (member: { _id: Id<"members">; themeOverride?: string }) => {
    setTogglingThemeId(member._id);
    try {
      const next = member.themeOverride === "pink" ? "default" : "pink";
      await setThemeOverride({ memberId: member._id, themeOverride: next });
      toast.success(
        next === "pink"
          ? "🌸 Pink theme activated for this member!"
          : "Pink theme removed — member is back to default."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to change theme");
    } finally {
      setTogglingThemeId(null);
    }
  };

  if (workspace === undefined || activeMembers === undefined || pendingInvites === undefined || tasks === undefined) {
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
  const handleCopyLink = (memberId: Id<"members">) => {
    const inviteUrl = `${window.location.origin}/invite/accept?workspaceId=${workspace._id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteId(memberId);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Handle invite deletion
  const handleCancelInvite = async (memberId: Id<"members">) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await cancelInvite({ memberId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Team Management</h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
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
          <h3 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" /> Active Members ({activeMembers.length})
          </h3>

          <div className="flex flex-col gap-3">
            {activeMembers.map((member) => (
              <div
                key={member.userId}
                className="p-4 rounded-xl border border-border bg-card flex items-start justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/25 overflow-hidden shrink-0">
                    {member.pictureUrl ? (
                      member.pictureUrl.startsWith("http://") || member.pictureUrl.startsWith("https://") || member.pictureUrl.startsWith("/") ? (
                        <img
                          src={member.pictureUrl}
                          alt={member.userName || "Avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{member.pictureUrl}</span>
                      )
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {member.userName
                          ? member.userName.split(" ").map((n: string) => n[0]).join("").substring(0, 2)
                          : <User className="h-5 w-5" />
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-zinc-650 dark:text-zinc-500">
                        {member.userName || (member.userId === workspace.ownerId ? "Workspace Owner" : "Active Teammate")}
                      </span>
                      {member.userName && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({member.userId === workspace.ownerId ? "Owner" : `ID: ${member.userId.substring(0, 8)}...`})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">
                        {member.userEmail || member.invitedEmail || "No email registered"}
                      </span>
                      {canEdit(member.userId) && (
                        <button
                          onClick={() => {
                            setEditingMemberId(member._id);
                            setEditNicknameValue(member.userName || "");
                            setEditPictureValue(member.pictureUrl || "");
                            setShowEditProfileModal(true);
                          }}
                          className="text-zinc-600 hover:text-indigo-400 transition-colors p-0.5"
                          title="Edit Profile"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Assigned Tasks list */}
                    {(() => {
                      const memberTasks = tasks?.filter(t => t.assigneeId === member.userId && t.status !== "done") || [];
                      return (
                        <div className="mt-2.5 pt-2 border-t border-border flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                            <Briefcase className="h-3 w-3 text-indigo-500/80" />
                            <span>Assigned Tasks ({memberTasks.length})</span>
                          </div>
                          {memberTasks.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {memberTasks.slice(0, 3).map(task => (
                                <span
                                  key={task._id}
                                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-border text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-default"
                                  title={task.title}
                                >
                                  {task.title.length > 20 ? `${task.title.substring(0, 20)}...` : task.title}
                                </span>
                              ))}
                              {memberTasks.length > 3 && (
                                <span
                                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-border text-[10px] text-indigo-650 dark:text-indigo-400 font-bold cursor-help"
                                  title={memberTasks.slice(3).map(t => t.title).join("\n")}
                                >
                                  +{memberTasks.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-zinc-650" /> No active tasks
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1 shrink-0">
                  {/* Pink theme toggle — admins/owners only */}
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleTogglePinkTheme(member)}
                      disabled={togglingThemeId === member._id}
                      title={member.themeOverride === "pink" ? "Remove pink theme" : "Assign pink theme"}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all ${
                        member.themeOverride === "pink"
                          ? "bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-400/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/25"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-400/40 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      }`}
                    >
                      {togglingThemeId === member._id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      {member.themeOverride === "pink" ? "Pink" : "Theme"}
                    </button>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-border font-semibold uppercase tracking-wider">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites (1 col) */}
        <div className="flex flex-col gap-6 border-l-0 lg:border-l border-border pl-0 lg:pl-8">
          <h3 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Pending Invites ({pendingInvites.length})
          </h3>

          {pendingInvites.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-left">No pending invitations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 max-w-[170px]">
                      <span className="text-xs font-semibold text-foreground truncate" title={invite.invitedEmail}>
                        {invite.invitedEmail}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        Role: {invite.role}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCancelInvite(invite._id)}
                      className="text-zinc-500 hover:text-red-500 p-1 rounded hover:bg-muted"
                      title="Cancel Invite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Accept helper box */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[9px] text-zinc-500 italic">
                      Copy the join link below and open it in an incognito window to register/test the invitee account:
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(invite._id)}
                      className={`w-full text-[10px] h-7 ${copiedInviteId === invite._id
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
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
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground text-base">Invite Teammate</h3>
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
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
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
      {/* --- EDIT PROFILE MODAL --- */}
      {showEditProfileModal && editingMemberId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground text-base">Customize Member Profile</h3>
              <button
                onClick={() => { setShowEditProfileModal(false); setEditingMemberId(null); }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNicknameModal} className="p-6 flex flex-col gap-4">

              {/* Profile Avatar Preview */}
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="h-16 w-16 rounded-full bg-indigo-950/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 overflow-hidden shadow-inner">
                  {editPictureValue ? (
                    editPictureValue.startsWith("http://") || editPictureValue.startsWith("https://") || editPictureValue.startsWith("/") ? (
                      <img
                        src={editPictureValue}
                        alt="Avatar Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{editPictureValue}</span>
                    )
                  ) : (
                    <span className="text-xl font-semibold uppercase tracking-wider">
                      {editNicknameValue
                        ? editNicknameValue.split(" ").map((n: string) => n[0]).join("").substring(0, 2)
                        : <User className="h-8 w-8" />
                      }
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">Avatar Preview</span>
              </div>

              {/* Display Name Input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Display Name / Nickname</label>
                <input
                  type="text"
                  value={editNicknameValue}
                  onChange={(e) => setEditNicknameValue(e.target.value)}
                  placeholder="Enter display name..."
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650"
                  required
                />
              </div>

              {/* Profile Picture Input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Profile Picture URL or Emoji</label>
                <input
                  type="text"
                  value={editPictureValue}
                  onChange={(e) => setEditPictureValue(e.target.value)}
                  placeholder="https://example.com/avatar.jpg or a single emoji 🦊"
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-655 focus:ring-1 focus:ring-indigo-655"
                />
              </div>

              {/* Preset Emojis Picker */}
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Choose a fun preset icon / emoji:</span>
                <div className="flex flex-wrap gap-2 p-3.5 rounded-lg bg-muted border border-border">
                  {["💼", "👔", "👑", "💻", "⚙️", "🎨", "✍️", "📊", "📣", "📈", "🛡️", "🤝", "🚀", "💡", "✨", "🌟", "🦊", "🦁", "🐯", "🐼", "🐨", "🍿", "🎮", "👾"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditPictureValue(emoji)}
                      className={`text-xl p-1.5 rounded-md hover:bg-muted transition-colors border ${editPictureValue === emoji ? "border-indigo-500 bg-indigo-500/10" : "border-transparent"
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowEditProfileModal(false); setEditingMemberId(null); }}
                  className="text-zinc-500 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingNicknameId === editingMemberId}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {updatingNicknameId === editingMemberId ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
