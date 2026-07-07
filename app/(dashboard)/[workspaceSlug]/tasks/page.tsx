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
  AlertCircle
} from "lucide-react";

const defaultTaskColumns = [
  { id: "todo", label: "To Do", color: "bg-zinc-800/60 border-zinc-800", hidden: false },
  { id: "in_progress", label: "In Progress", color: "bg-indigo-950/20 border-indigo-900/30", hidden: false },
  { id: "done", label: "Completed", color: "bg-emerald-950/10 border-emerald-900/20", hidden: false },
];

type TaskStatus = "todo" | "in_progress" | "done";

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

  // Mutations
  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const updateTaskDetails = useMutation(api.tasks.updateDetails);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const columnsList = workspace?.settings?.taskColumns || defaultTaskColumns;
  const activeColumns = columnsList.filter(col => !col.hidden);

  // Local Component States
  const [activeModal, setActiveModal] = useState<null | "create" | "edit">(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Form States
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");

  const [loadingAction, setLoadingAction] = useState(false);

  if (workspace === undefined || tasks === undefined || projects === undefined || members === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading tasks and workload roster...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProject) return;
    setLoadingAction(true);
    try {
      await createTask({
        projectId: taskProject as any,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assigneeId: taskAssignee || undefined,
        dueDate: taskDueDate ? new Date(taskDueDate).getTime() : undefined,
      });
      
      // Reset Form
      setTaskTitle("");
      setTaskDesc("");
      setTaskProject("");
      setTaskAssignee("");
      setTaskDueDate("");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
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
      setActiveModal(null);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask({ taskId });
      setActiveModal(null);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveStatus = async (taskId: any, currentStatus: TaskStatus, direction: "left" | "right") => {
    const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let nextIndex = currentIndex + (direction === "right" ? 1 : -1);
    
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const nextStatus = statusOrder[nextIndex];
      // Optimistic update local display
      try {
        await updateTaskStatus({ taskId, status: nextStatus });
      } catch (err) {
        console.error(err);
      }
    }
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Tasks Kanban</h2>
          <p className="text-sm text-zinc-400">
            Allocate and track operational task items for your assistants and team members.
          </p>
        </div>
        
        {projects.length > 0 && (
          <Button 
            onClick={() => {
              setTaskProject(projects[0]?._id || "");
              setTaskStatus("todo");
              setActiveModal("create");
            }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Task
          </Button>
        )}
      </div>

      {/* Assistants Workload Tracker */}
      <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-indigo-400" /> Assistant Workload Tracker
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((member) => {
            const memberTasks = tasks.filter(t => t.assigneeId === member.userId);
            const todoCount = memberTasks.filter(t => t.status === "todo").length;
            const inProgCount = memberTasks.filter(t => t.status === "in_progress").length;
            const doneCount = memberTasks.filter(t => t.status === "done").length;

            return (
              <div 
                key={member.userId} 
                className="p-3.5 rounded-lg border border-zinc-900 bg-zinc-950/50 flex items-center justify-between text-xs"
              >
                <div className="flex flex-col gap-1">
                  {/* Mock names since we show UserID */}
                  <span className="font-semibold text-zinc-200 truncate max-w-[130px]">
                    {member.userId === workspace.ownerId ? "Owner (You)" : `Assistant: ${member.userId.substring(0, 10)}...`}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase font-medium">{member.role}</span>
                </div>
                
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800" title="To Do">
                    {todoCount}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold" title="In Progress">
                    {inProgCount}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Done">
                    {doneCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {projects.length === 0 ? (
        /* Empty State if no projects created */
        <div className="p-12 rounded-2xl border border-zinc-900 border-dashed bg-zinc-950/20 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-850">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-semibold text-white">No Projects Initialized</h4>
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
          className="grid grid-cols-1 gap-6 items-start"
          style={{ gridTemplateColumns: activeColumns.length > 0 ? `repeat(${activeColumns.length}, minmax(0, 1fr))` : undefined }}
        >
          {activeColumns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);

            return (
              <div 
                key={col.id}
                className={`rounded-xl border p-4 flex flex-col gap-4 h-auto md:h-[calc(100vh-340px)] md:min-h-[400px] overflow-hidden ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    {col.label}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
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

                      return (
                        <div 
                          key={task._id}
                          className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/70 hover:border-zinc-800 transition-all duration-200 flex flex-col gap-3 text-left group"
                        >
                          {/* Project Tag */}
                          {project && (
                            <span className="text-[9px] w-fit font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-850">
                              {project.name}
                            </span>
                          )}

                          {/* Title & Edit */}
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                              {task.title}
                            </span>
                            <button 
                              onClick={() => openEditModal(task)}
                              className="text-zinc-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
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

                          {/* Info row */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900/60 pt-2.5 mt-1">
                            {/* Assignee */}
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3 text-zinc-600" />
                              <span className="truncate max-w-[80px]">
                                {task.assigneeId ? (
                                  task.assigneeId === workspace.ownerId ? "Me" : `ID: ${task.assigneeId.substring(0, 5)}`
                                ) : "Unassigned"}
                              </span>
                            </div>

                            {/* Due Date */}
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[9.5px]">
                                <Clock className="h-3 w-3 text-zinc-600" />
                                <span className={task.dueDate < Date.now() && task.status !== "done" ? "text-red-500 font-semibold" : ""}>
                                  {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Move arrows */}
                          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 text-zinc-600">
                            {col.id !== "todo" ? (
                              <button 
                                onClick={() => handleMoveStatus(task._id, task.status, "left")}
                                className="hover:text-indigo-400 p-0.5 rounded hover:bg-zinc-900"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                            ) : <div />}

                            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-650 font-mono">
                              Move
                            </span>

                            {col.id !== "done" ? (
                              <button 
                                onClick={() => handleMoveStatus(task._id, task.status, "right")}
                                className="hover:text-indigo-400 p-0.5 rounded hover:bg-zinc-900"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            ) : <div />}
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
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Create New Task</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Project / Campaign</label>
                <select 
                  value={taskProject} 
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
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
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Description</label>
                <textarea 
                  value={taskDesc} 
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Provide sub-tasks, URLs, or specifics..." 
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Assign Assistant</label>
                  <select 
                    value={taskAssignee} 
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === workspace.ownerId ? "Owner (You)" : `Assistant: ${m.userId.substring(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Due Date</label>
                  <input 
                    type="date" 
                    value={taskDueDate} 
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
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
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Edit Task</h3>
              <button onClick={() => { setActiveModal(null); setSelectedTask(null); }} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditTask} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Task Title</label>
                <input 
                  type="text" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Description</label>
                <textarea 
                  value={taskDesc} 
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Assign Assistant</label>
                  <select 
                    value={taskAssignee} 
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === workspace.ownerId ? "Owner (You)" : `Assistant: ${m.userId.substring(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Due Date</label>
                  <input 
                    type="date" 
                    value={taskDueDate} 
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Task Status</label>
                <select 
                  value={taskStatus} 
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div className="flex gap-2 justify-between pt-2 border-t border-zinc-900/60 mt-2">
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
          </div>
        </div>
      )}

    </div>
  );
}
