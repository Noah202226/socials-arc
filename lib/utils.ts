import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveColumnColor(dbColor: string): { bgBorder: string; text: string } {
  const color = dbColor.toLowerCase();
  
  if (color.includes("zinc") || color.includes("todo") || color.includes("draft")) {
    return {
      bgBorder: "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800",
      text: "text-zinc-750 dark:text-zinc-350"
    };
  }
  if (color.includes("indigo") || color.includes("in_progress") || color.includes("internal_review")) {
    return {
      bgBorder: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30",
      text: "text-indigo-750 dark:text-indigo-350"
    };
  }
  if (color.includes("amber") || color.includes("client_review")) {
    return {
      bgBorder: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/20",
      text: "text-amber-750 dark:text-amber-350"
    };
  }
  if (color.includes("rose") || color.includes("changes_requested")) {
    return {
      bgBorder: "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/20",
      text: "text-rose-750 dark:text-rose-350"
    };
  }
  if (color.includes("emerald") || color.includes("done") || color.includes("approved")) {
    return {
      bgBorder: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20",
      text: "text-emerald-750 dark:text-emerald-350"
    };
  }
  if (color.includes("sky") || color.includes("scheduled")) {
    return {
      bgBorder: "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200/50 dark:border-sky-900/20",
      text: "text-sky-750 dark:text-sky-350"
    };
  }
  if (color.includes("teal") || color.includes("published")) {
    return {
      bgBorder: "bg-teal-50/50 dark:bg-teal-950/10 border-teal-200/50 dark:border-teal-900/20",
      text: "text-teal-750 dark:text-teal-350"
    };
  }
  if (color.includes("purple")) {
    return {
      bgBorder: "bg-purple-50/50 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-900/20",
      text: "text-purple-750 dark:text-purple-350"
    };
  }

  return {
    bgBorder: dbColor,
    text: "text-zinc-750 dark:text-zinc-350"
  };
}

