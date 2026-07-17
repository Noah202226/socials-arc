"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8 rounded-lg border border-zinc-900 bg-transparent shrink-0 animate-pulse" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 rounded-lg border border-zinc-250 dark:border-[#16181d] hover:border-zinc-350 dark:hover:border-zinc-800 flex items-center justify-center text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100/50 dark:bg-[#0d0e12]/40 hover:bg-zinc-200/50 dark:hover:bg-[#12141a] transition-all shrink-0 cursor-pointer"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5 text-amber-400 animate-in spin-in-12 duration-300" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 animate-in spin-in-12 duration-300" />
      )}
    </button>
  );
}
