"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  PlusCircle,
  Calendar as CalendarIcon,
  User as UserIcon,
  Trash2,
  Edit2,
  ArrowRight,
  ArrowLeft,
  X as CloseIcon,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  MessageSquare,
  Send,
  Image as ImageIcon,
  FileText as DocIcon,
  Video as VideoIcon,
  Paperclip
} from "lucide-react";

const defaultTaskColumns = [
  { id: "todo", label: "To Do", color: "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800", hidden: false },
  { id: "in_progress", label: "In Progress", color: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30", hidden: false },
  { id: "done", label: "Completed", color: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20", hidden: false },
];

import { toast } from "sonner";
import { resolveColumnColor } from "@/lib/utils";
import { deduplicateIncomingFiles } from "@/lib/file-utils";



export default function TasksPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });

  const tasks = useQuery(
    api.tasks.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const members = useQuery(
    api.workspaces.listMembers,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const workspaceAssets = useQuery(
    api.assets.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const updateTaskDetails = useMutation(api.tasks.updateDetails);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const createTaskComment = useMutation(api.comments.create);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.save);
  const deleteAsset = useMutation(api.assets.deleteAsset);

  const columnsList = workspace?.settings?.taskColumns || defaultTaskColumns;
  const activeColumns = columnsList.filter(col => !col.hidden);

  // Local Component States
  const [activeModal, setActiveModal] = useState<null | "create" | "edit">(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const taskComments = useQuery(
    api.comments.listByTask,
    selectedTask ? { taskId: selectedTask._id } : "skip"
  );

  const taskAssets = useQuery(
    api.assets.listByTask,
    selectedTask ? { taskId: selectedTask._id } : "skip"
  );

  // Form States
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskStatus, setTaskStatus] = useState<string>("todo");

  const [loadingAction, setLoadingAction] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);

  // File Upload / Attachment States
  const [taskFiles, setTaskFiles] = useState<File[]>([]);
  const [isDraggingDropzone, setIsDraggingDropzone] = useState(false);
  const [isDraggingEditDropzone, setIsDraggingEditDropzone] = useState(false);
  const [uploadingInspectorFile, setUploadingInspectorFile] = useState(false);
  const [commentFile, setCommentFile] = useState<File | null>(null);

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (workspace === undefined || tasks === undefined || projects === undefined || members === undefined || workspaceAssets === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading tasks and workload roster...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropCol(null);
  };

  const handleDragEnter = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setActiveDropCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setActiveDropCol(null);

    if (!taskId) return;

    // Find task
    const taskObj = tasks?.find(t => t._id === taskId);
    if (!taskObj || taskObj.status === targetStatus) return;

    try {
      await updateTaskStatus({ taskId: taskId as any, status: targetStatus });
      const targetCol = activeColumns.find(c => c.id === targetStatus);
      toast.success(`Task moved to: ${targetCol?.label || targetStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update task status");
    }
  };

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProject) return;
    setLoadingAction(true);
    try {
      const newTask = await createTask({
        projectId: taskProject as any,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assigneeId: taskAssignee || undefined,
        dueDate: taskDueDate ? new Date(taskDueDate).getTime() : undefined,
        status: taskStatus,
      });
      toast.success(`Task "${taskTitle.trim()}" created successfully.`);

      if (taskFiles.length > 0 && newTask) {
        toast.info(`Uploading ${taskFiles.length} file(s)...`);
        for (const file of taskFiles) {
          const uploadUrl = await generateUploadUrl({ projectId: taskProject as any });
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
          const { storageId } = await res.json();

          let assetType: "image" | "video" | "document" = "document";
          if (file.type.startsWith("image/")) assetType = "image";
          else if (file.type.startsWith("video/")) assetType = "video";

          await saveAsset({
            projectId: taskProject as any,
            taskId: newTask._id,
            storageId,
            type: assetType,
            fileName: file.name,
          });
        }
        toast.success(`${taskFiles.length} file(s) attached successfully.`);
      }

      // Reset Form
      setTaskTitle("");
      setTaskDesc("");
      setTaskProject("");
      setTaskAssignee("");
      setTaskDueDate("");
      setTaskFiles([]);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create task");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !taskTitle.trim()) return;
    setLoadingAction(true);
    try {
      await updateTaskDetails({
        taskId: selectedTask._id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assigneeId: taskAssignee || undefined,
        dueDate: taskDueDate ? new Date(taskDueDate).getTime() : undefined,
        status: taskStatus,
      });
      toast.success("Task updated successfully.");
      setActiveModal(null);
      setSelectedTask(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update task");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTaskCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentText.trim() && !commentFile) || !selectedTask) return;
    setLoadingComment(true);
    try {
      let imageStorageId = undefined;
      if (commentFile) {
        const uploadUrl = await generateUploadUrl({ projectId: selectedTask.projectId });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": commentFile.type },
          body: commentFile,
        });
        if (!res.ok) throw new Error("Image upload failed");
        const json = await res.json();
        imageStorageId = json.storageId;
      }

      await createTaskComment({
        taskId: selectedTask._id,
        body: commentText.trim(),
        imageStorageId,
      });
      setCommentText("");
      setCommentFile(null);
      toast.success("Comment posted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add comment");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleBatchUploadEditFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !selectedTask) return;
    const existingNames = taskAssets ? taskAssets.map(a => a.fileName) : [];
    const validFiles = deduplicateIncomingFiles(files, {
      existingFileNames: existingNames,
    });
    if (validFiles.length === 0) return;

    setUploadingInspectorFile(true);
    toast.info(`Uploading ${validFiles.length} attachment(s)...`);
    try {
      for (const fileToUpload of validFiles) {
        const uploadUrl = await generateUploadUrl({ projectId: selectedTask.projectId });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": fileToUpload.type },
          body: fileToUpload,
        });
        if (!res.ok) throw new Error(`Upload failed for ${fileToUpload.name}`);
        const { storageId } = await res.json();

        let assetType: "image" | "video" | "document" = "document";
        if (fileToUpload.type.startsWith("image/")) assetType = "image";
        else if (fileToUpload.type.startsWith("video/")) assetType = "video";

        await saveAsset({
          projectId: selectedTask.projectId,
          taskId: selectedTask._id,
          storageId,
          type: assetType,
          fileName: fileToUpload.name,
        });
      }
      toast.success(`${validFiles.length} attachment(s) uploaded successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload attachments");
    } finally {
      setUploadingInspectorFile(false);
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask({ taskId });
      toast.info("Task deleted successfully.");
      setActiveModal(null);
      setSelectedTask(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete task");
    }
  };

  const handleMoveStatus = async (taskId: any, currentStatus: string, direction: "left" | "right") => {
    const statusOrder = activeColumns.map(col => col.id);
    const currentIndex = statusOrder.indexOf(currentStatus);
    let nextIndex = currentIndex + (direction === "right" ? 1 : -1);

    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const nextStatus = statusOrder[nextIndex];
      // Optimistic update local display
      try {
        await updateTaskStatus({ taskId, status: nextStatus });
        const nextCol = activeColumns.find(c => c.id === nextStatus);
        toast.success(`Task moved to: ${nextCol?.label || nextStatus}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to move task");
      }
    }
  };

  const openCreateModal = (defaultStatus?: string) => {
    setSelectedTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskProject(projects?.[0]?._id || "");
    setTaskAssignee("");
    setTaskDueDate("");
    setTaskStatus(defaultStatus || activeColumns[0]?.id || "todo");
    setTaskFiles([]);
    setActiveModal("create");
  };

  const openEditModal = (task: any) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskProject(task.projectId);
    setTaskAssignee(task.assigneeId || "");
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setTaskStatus(task.status);
    setActiveModal("edit");
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Tasks Kanban</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Allocate and track operational task items for your assistants and team members.
          </p>
        </div>

        {projects.length > 0 && (
          <Button
            onClick={() => openCreateModal()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Task
          </Button>
        )}
      </div>

      {/* Assistants Workload Tracker */}
      <div className="p-5 rounded-xl border border-border bg-card/50 flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase text-zinc-650 dark:text-zinc-400 tracking-wider flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-indigo-400" /> Assistant Workload Tracker
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((member) => {
            const memberTasks = tasks.filter(t => t.assigneeId === member.userId);

            return (
              <div
                key={member.userId}
                className="p-3.5 rounded-lg border border-border bg-card flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {member.pictureUrl ? (
                    member.pictureUrl.startsWith("http://") || member.pictureUrl.startsWith("https://") || member.pictureUrl.startsWith("/") ? (
                      <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-border">
                        <img
                          src={member.pictureUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center border border-border shrink-0 text-base">
                        {member.pictureUrl}
                      </div>
                    )
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center border border-border shrink-0 text-zinc-500 dark:text-zinc-400">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px] text-left"
                      title={member.userName || member.userEmail || member.invitedEmail || member.userId}
                    >
                      {member.userId === workspace.ownerId
                        ? (member.userName
                          ? `${member.userName} (You)`
                          : (member.userEmail || member.invitedEmail ? `${member.userEmail || member.invitedEmail} (You)` : "Owner (You)")
                        )
                        : (member.userName || member.userEmail || member.invitedEmail || `Assistant: ${member.userId.substring(0, 10)}...`)}
                    </span>
                    <span className="text-[9px] text-zinc-550 uppercase font-medium text-left">{member.role}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-mono justify-end max-w-[170px]">
                  {activeColumns.map((col) => {
                    const count = memberTasks.filter(t => t.status === col.id).length;
                    const { bgBorder, text: textClass } = resolveColumnColor(col.color);
                    return (
                      <span
                        key={col.id}
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold flex items-center justify-center min-w-[20px] transition-all duration-200 ${bgBorder} ${textClass}`}
                        title={`${col.label}: ${count} tasks`}
                      >
                        {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {projects.length === 0 ? (
        /* Empty State if no projects created */
        <div className="p-12 rounded-2xl border border-border border-dashed bg-card/30 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 border border-border">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white">No Projects Initialized</h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              You must initialize at least one Campaign/Project first to start assigning and organizing Kanban tasks.
            </p>
          </div>
          <Link href={`/${workspace.slug}/clients`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">
              Set Up Campaigns
            </Button>
          </Link>
        </div>
      ) : (
        /* Kanban Board columns */
        <div
          className="flex gap-5 items-start w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        >
          {activeColumns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            const { bgBorder, text: headerTextClass } = resolveColumnColor(col.color);

            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => handleDragEnter(e, col.id)}
                onDragLeave={() => setActiveDropCol(prev => prev === col.id ? null : prev)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-xl border p-4 flex flex-col gap-4 w-[290px] shrink-0 h-auto md:h-[calc(100vh-340px)] md:min-h-[450px] overflow-hidden transition-all duration-200 ${activeDropCol === col.id
                  ? "border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/25"
                  : bgBorder
                  }`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${headerTextClass}`}>
                    {col.label}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 border border-border text-zinc-650 dark:text-zinc-400">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Stack */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-10 text-zinc-600 text-xs italic">
                      Empty column
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const project = projects.find(p => p._id === task.projectId);
                      const assignee = members.find(m => m.userId === task.assigneeId);
                      const cardAssets = workspaceAssets?.filter(a => a.taskId === task._id) || [];
                      const cardImages = cardAssets.filter((a): a is typeof a & { url: string } => a.type === "image" && Boolean(a.url));

                      return (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openEditModal(task)}
                          className={`p-4 rounded-lg border border-border bg-zinc-50 dark:bg-zinc-950/70 hover:border-indigo-600/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-all duration-200 flex flex-col gap-2.5 text-left group ${draggedTaskId === task._id ? "opacity-40 border-dashed border-zinc-800 scale-95" : ""
                            }`}
                        >
                          {/* Project Tag */}
                          {project && (
                            <span className="text-[9px] w-fit font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-550 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-850">
                              {project.name}
                            </span>
                          )}

                          {/* Title & Edit */}
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                              {task.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(task);
                              }}
                              className="text-zinc-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-[11px] text-zinc-500 leading-relaxed truncate-2-lines">
                              {task.description}
                            </p>
                          )}

                          {/* Image Attachment Preview Strip */}
                          {cardImages.length > 0 && (
                            <div className="flex gap-1.5 overflow-hidden rounded-md my-0.5 max-h-16">
                              {cardImages.slice(0, 3).map((imgAsset, imgIdx) => (
                                <div key={imgAsset._id} className="relative flex-1 h-14 rounded overflow-hidden border border-border bg-muted">
                                  <img src={imgAsset.url ?? undefined} alt={imgAsset.fileName} className="h-full w-full object-cover" />
                                  {imgIdx === 2 && cardImages.length > 3 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                                      +{cardImages.length - 3}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Info row */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-border pt-2.5 mt-0.5">
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5">
                              {assignee?.pictureUrl ? (
                                assignee.pictureUrl.startsWith("http://") || assignee.pictureUrl.startsWith("https://") || assignee.pictureUrl.startsWith("/") ? (
                                  <div className="h-[18px] w-[18px] rounded-full overflow-hidden shrink-0 border border-border">
                                    <img
                                      src={assignee.pictureUrl}
                                      alt="Assignee Avatar"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs leading-none shrink-0">{assignee.pictureUrl}</span>
                                )
                              ) : (
                                <UserIcon className="h-3 w-3 text-zinc-650 shrink-0" />
                              )}
                              <span
                                className="truncate max-w-[110px]"
                                title={
                                  assignee
                                    ? (assignee.userName || assignee.userEmail || assignee.invitedEmail || assignee.userId)
                                    : (task.assigneeId === workspace.ownerId ? "Me" : "Unassigned")
                                }
                              >
                                {task.assigneeId ? (
                                  assignee
                                    ? (assignee.userName || assignee.userEmail || assignee.invitedEmail || assignee.userId.substring(0, 8))
                                    : (task.assigneeId === workspace.ownerId ? "Me" : `ID: ${task.assigneeId.substring(0, 5)}`)
                                ) : "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Attachment Count Badge */}
                              {cardAssets.length > 0 && (
                                <div
                                  className="flex items-center gap-1 text-[9.5px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-border px-1.5 py-0.5 rounded shrink-0"
                                  title={`${cardAssets.length} attachment(s)`}
                                >
                                  <Paperclip className="h-3 w-3 text-indigo-400" />
                                  <span>{cardAssets.length}</span>
                                </div>
                              )}

                              {/* Due Date */}
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-[9.5px]">
                                  <Clock className="h-3 w-3 text-zinc-600" />
                                  <span className={task.dueDate < Date.now() && task.status !== "done" ? "text-red-500 font-semibold" : ""}>
                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Create Task Modal */}
      {activeModal === "create" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground text-base">Create New Task</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Project / Campaign</label>
                <select
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Gather campaign assets"
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Task Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Provide sub-tasks, URLs, or specifics..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Assign Assistant</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">👤 Unassigned</option>
                    {members.map(m => {
                      const avatarSymbol = m.pictureUrl
                        ? (m.pictureUrl.startsWith("http") || m.pictureUrl.startsWith("/") ? "👤" : m.pictureUrl)
                        : "👤";
                      const displayName = m.userName && (m.userEmail || m.invitedEmail)
                        ? `${m.userName} (${m.userEmail || m.invitedEmail})`
                        : (m.userEmail || m.invitedEmail || m.userName || m.userId.substring(0, 8) + "...");
                      return (
                        <option key={m.userId} value={m.userId}>
                          {avatarSymbol} {m.userId === workspace.ownerId ? `Owner: ${displayName}` : `Assistant: ${displayName}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Attachments for new task — drag & drop zone with previews */}
              <div className="flex flex-col gap-2 text-left border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Attach Files / Images (Optional)</label>
                  {taskFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTaskFiles([])}
                      className="text-[10px] text-zinc-500 hover:text-red-500 font-semibold transition-colors"
                    >
                      Clear all ({taskFiles.length})
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(true);
                  }}
                  onDragLeave={() => setIsDraggingDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const validFiles = deduplicateIncomingFiles(e.dataTransfer.files, {
                        existingFiles: taskFiles,
                      });
                      if (validFiles.length > 0) {
                        setTaskFiles((prev) => [...prev, ...validFiles]);
                      }
                    }
                  }}
                  className={`p-4 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    isDraggingDropzone
                      ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                      : "border-border hover:border-zinc-400 dark:hover:border-zinc-700 bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="file"
                    id="new-task-attachment"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const validFiles = deduplicateIncomingFiles(e.target.files, {
                          existingFiles: taskFiles,
                        });
                        if (validFiles.length > 0) {
                          setTaskFiles((prev) => [...prev, ...validFiles]);
                        }
                        e.target.value = "";
                      }
                    }}
                  />
                  <label htmlFor="new-task-attachment" className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-semibold text-indigo-500 dark:text-indigo-400">Click to upload files</span>
                      <span className="text-zinc-500">or drag & drop</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Images, Videos, or Documents (Multiple allowed)
                    </p>
                  </label>
                </div>

                {/* File Previews Grid */}
                {taskFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto pr-1">
                    {taskFiles.map((file, idx) => {
                      const isImage = file.type.startsWith("image/");
                      const isVideo = file.type.startsWith("video/");

                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className="relative group border border-border bg-card rounded-lg p-2 flex items-center gap-2 overflow-hidden shadow-sm"
                        >
                          {isImage ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-9 w-9 object-cover rounded shrink-0 border border-border"
                            />
                          ) : isVideo ? (
                            <VideoIcon className="h-9 w-9 text-indigo-400 p-2 bg-indigo-500/10 rounded shrink-0" />
                          ) : (
                            <DocIcon className="h-9 w-9 text-amber-500 p-2 bg-amber-500/10 rounded shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0 flex-1 text-left">
                            <span className="text-[11px] font-medium text-foreground truncate">{file.name}</span>
                            <span className="text-[9.5px] text-zinc-500 font-mono">{formatFileSize(file.size)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTaskFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-400 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                            title="Remove file"
                          >
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Task Modal */}
      {activeModal === "edit" && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[calc(100%-2rem)] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-9xl h-[95vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-foreground text-base">Edit Task</h3>
              </div>
              <button onClick={() => { setActiveModal(null); setSelectedTask(null); }} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-y-auto md:overflow-visible">
              {/* Left Column: Form Details */}
              <form onSubmit={handleEditTask} className="p-6 border-b md:border-b-0 md:border-r border-border flex flex-col gap-4 h-auto md:h-full overflow-y-visible md:overflow-y-auto">

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Task Title</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Description</label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Assign Assistant</label>
                    <select
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">👤 Unassigned</option>
                      {members.map(m => {
                        const avatarSymbol = m.pictureUrl
                          ? (m.pictureUrl.startsWith("http") || m.pictureUrl.startsWith("/") ? "👤" : m.pictureUrl)
                          : "👤";
                        const displayName = m.userName && (m.userEmail || m.invitedEmail)
                          ? `${m.userName} (${m.userEmail || m.invitedEmail})`
                          : (m.userEmail || m.invitedEmail || m.userName || m.userId.substring(0, 8) + "...");
                        return (
                          <option key={m.userId} value={m.userId}>
                            {avatarSymbol} {m.userId === workspace.ownerId ? `Owner: ${displayName}` : `Assistant: ${displayName}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Due Date</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Task Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {activeColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>

                {/* Attached Files Section */}
                <div className="flex flex-col gap-2 border-t border-border pt-4 mt-2 text-left">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Attached Media & Files</label>

                  {/* List of currently attached assets */}
                  {taskAssets && taskAssets.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-2 max-h-48 overflow-y-auto pr-1">
                      {taskAssets.map((asset) => (
                        <div key={asset._id} className="relative group border border-border bg-card rounded-lg p-2 flex items-center gap-2 overflow-hidden shadow-sm">
                          {asset.type === "image" && asset.url ? (
                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Click to view full image">
                              <img src={asset.url} alt={asset.fileName} className="h-8 w-8 object-cover rounded hover:opacity-80 transition-opacity" />
                            </a>
                          ) : asset.type === "video" ? (
                            <VideoIcon className="h-8 w-8 text-indigo-400 p-1.5 bg-indigo-500/10 rounded shrink-0" />
                          ) : (
                            <DocIcon className="h-8 w-8 text-amber-500 p-1.5 bg-amber-500/10 rounded shrink-0" />
                          )}
                          <a
                            href={asset.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-indigo-500 dark:hover:text-indigo-400 truncate flex-1 font-medium"
                            title={asset.fileName}
                          >
                            {asset.fileName}
                          </a>

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete "${asset.fileName}"?`)) {
                                try {
                                  await deleteAsset({ assetId: asset._id });
                                  toast.success("Attachment deleted.");
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to delete attachment");
                                }
                              }
                            }}
                            className="text-zinc-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 cursor-pointer shrink-0 transition-colors"
                            title="Delete attachment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Batch Upload Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingEditDropzone(true);
                    }}
                    onDragLeave={() => setIsDraggingEditDropzone(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingEditDropzone(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleBatchUploadEditFiles(e.dataTransfer.files);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${
                      isDraggingEditDropzone
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-border hover:border-zinc-400 dark:hover:border-zinc-700 bg-muted/40 hover:bg-muted/70"
                    }`}
                  >
                    <input
                      type="file"
                      id="task-inspector-media-upload"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBatchUploadEditFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <label
                      htmlFor="task-inspector-media-upload"
                      className="w-full flex flex-col items-center gap-1 cursor-pointer"
                    >
                      {uploadingInspectorFile ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold py-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading attachment(s)...
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                            <Plus className="h-3.5 w-3.5" />
                            Upload & Attach Multiple Files
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            Click to browse or drag & drop files here
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-between pt-2 border-t border-border mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteTask(selectedTask._id)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs px-3"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => { setActiveModal(null); setSelectedTask(null); }} className="text-zinc-500 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                      {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>

              {/* Right Column: Collaboration Thread */}
              <div className="p-6 bg-zinc-100/20 dark:bg-zinc-950/40 flex flex-col gap-4 h-[500px] md:h-full overflow-hidden shrink-0 md:shrink">
                <h4 className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-border pb-2 text-left">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Collaboration Thread
                </h4>

                {/* Messages Roster */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1.5">
                  {taskComments === undefined ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    </div>
                  ) : taskComments.length === 0 ? (
                    <div className="text-center py-12 text-xs italic text-zinc-650 text-left">
                      No comments posted. Teammate questions or clarifications will appear here.
                    </div>
                  ) : (
                    taskComments.map((c) => {
                      return (
                        <div key={c._id} className="flex flex-col gap-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-indigo-400">
                              {c.authorName}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/20 max-w-[90%] flex flex-col gap-2">
                            {c.body && (
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {c.body}
                              </p>
                            )}
                            {c.imageUrl && (
                              <div className="relative max-w-full rounded-md overflow-hidden border border-zinc-800/80 bg-black/40">
                                <img
                                  src={c.imageUrl}
                                  alt="Comment attachment"
                                  className="max-h-48 object-contain rounded w-auto max-w-full block"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment File Preview */}
                {commentFile && (
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-border bg-card text-xs mt-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-8 w-8 rounded overflow-hidden border border-border bg-muted shrink-0">
                        <img
                          src={URL.createObjectURL(commentFile)}
                          alt="preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate">{commentFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommentFile(null)}
                      className="text-zinc-500 hover:text-red-455"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Comment Input */}
                <form onSubmit={handleTaskCommentSubmit} className="flex items-center gap-2 border-t border-border pt-3">
                  <input
                    type="file"
                    accept="image/*"
                    id="task-comment-image-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCommentFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="task-comment-image-upload"
                    className="h-8 w-8 rounded-lg flex items-center justify-center border border-border bg-muted text-zinc-500 dark:text-zinc-400 hover:text-foreground cursor-pointer shrink-0"
                    title="Attach image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </label>

                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ask a question or request clarifications..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-muted text-foreground text-xs focus:outline-none focus:border-indigo-600"
                    required={!commentFile}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loadingComment || (!commentText.trim() && !commentFile)}
                    className="h-8 w-8 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                  >
                    {loadingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
