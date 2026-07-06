"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { SignInButton, SignUpButton, UserButton, useUser, SignOutButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Shield, PlusCircle, LayoutDashboard } from "lucide-react";

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
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-950 font-sans text-zinc-50 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
            S
          </div>
          <span className="font-semibold text-lg tracking-tight">Socials Ark</span>
        </div>
        <div className="flex items-center gap-4">
          {isSignedIn && <UserButton />}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Checking authentication status...</p>
          </div>
        ) : !isSignedIn ? (
          /* Hero Section for Unauthenticated Users */
          <div className="max-w-2xl text-center flex flex-col items-center gap-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-indigo-400 font-medium">
              <Shield className="h-3 w-3" /> Powered by Clerk & Convex
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
              One place for planning, approving, & tracking content
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl">
              Socials Ark is the ultimate PM SaaS for social media agencies. Plan campaigns, draft posts, orchestrate passwordless client approvals, and track cents-accurate P&L.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xs sm:max-w-none">
              <SignInButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all duration-300">
                  Get Started
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-300">
                  Create Account
                </Button>
              </SignUpButton>
            </div>
          </div>
        ) : !isConvexAuthenticated ? (
          /* Clerk Signed In, but Convex failed to authenticate */
          <div className="w-full max-w-md p-8 rounded-2xl border border-red-900/30 bg-red-950/5 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl z-10">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-white font-sans">Session Out of Sync</h2>
              <p className="text-sm text-zinc-400 leading-relaxed animate-fade-in">
                You are signed in to Clerk, but Convex hasn't verified your active session tokens.
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                If the Convex integration was just enabled, active sessions must be refreshed. Please sign out and sign back in to complete the sync.
              </p>
            </div>
            <SignOutButton>
              <Button size="lg" className="w-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20">
                Sign Out & Refresh Session
              </Button>
            </SignOutButton>
          </div>
        ) : (
          /* Authenticated Workspace Synced View */
          <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl z-10">
            {syncStatus === "syncing" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold text-white">Syncing Workspace</h2>
                  <p className="text-sm text-zinc-400">Setting up your space and seeding roles...</p>
                </div>
              </>
            )}

            {syncStatus === "success" && workspace && (
              <>
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <h2 className="text-2xl font-bold text-white font-sans">Workspace Synced!</h2>
                  <p className="text-sm text-zinc-400">Your agency workspace is ready.</p>
                </div>
                
                {/* Workspace Card details */}
                <div className="w-full p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Name</span>
                    <span className="font-semibold text-zinc-200">{workspace.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Slug</span>
                    <span className="font-semibold text-zinc-200">{workspace.slug}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Billing Plan</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20 capitalize">
                      {workspace.plan}
                    </span>
                  </div>
                </div>

                <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 mt-2">
                  <LayoutDashboard className="h-4 w-4 mr-2" /> Enter Workspace Dashboard
                </Button>
              </>
            )}

            {syncStatus === "error" && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold text-white font-sans">Sync Failed</h2>
                  <p className="text-xs text-red-400 font-mono p-2 bg-red-950/20 rounded-lg border border-red-900/30">
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
      <footer className="py-6 border-t border-zinc-900 bg-zinc-950 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Socials Ark. All rights reserved.
      </footer>
    </div>
  );
}
