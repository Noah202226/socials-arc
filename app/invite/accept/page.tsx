"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation } from "convex/react";
import { SignInButton, SignUpButton, SignOutButton, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldAlert, ArrowRight, UserCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get("workspaceId");

  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const acceptInvite = useMutation(api.members.acceptInvite);

  const [status, setStatus] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated && workspaceId && status === "idle") {
      setStatus("accepting");
      acceptInvite({ workspaceId: workspaceId as any })
        .then((ws) => {
          setWorkspace(ws);
          setStatus("success");
        })
        .catch((err) => {
          console.error("Failed to accept invite:", err);
          setErrorMsg(err.message || "Unknown error occurred");
          setStatus("error");
        });
    }
  }, [isAuthenticated, workspaceId, status, acceptInvite]);

  // Loading state
  if (!isClerkLoaded || (isAuthenticated && isConvexLoading)) {
    return (
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Verifying invitation status...</p>
      </div>
    );
  }

  // Missing workspace ID in link
  if (!workspaceId) {
    return (
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Invalid Invite Link</h2>
          <p className="text-sm text-zinc-400">
            This invitation link is missing the workspace identifier. Please request a new invite link from your administrator.
          </p>
        </div>
        <Link href="/" className="w-full">
          <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
            Return to Portal
          </Button>
        </Link>
      </div>
    );
  }

  // Unauthenticated user landing
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/25">
          <UserCheck className="h-6 w-6" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Workspace Invitation</h2>
          <p className="text-sm text-zinc-400">
            You've been invited to join a collaborative workspace on Socials Ark.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Please sign in or create an account with the email address that received the invitation to accept.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <SignInButton mode="modal">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20">
              Sign In to Accept
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline" className="w-full border-zinc-800 hover:bg-zinc-900 text-zinc-300">
              Create Account
            </Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl flex flex-col items-center gap-6 text-center shadow-2xl">
      {status === "accepting" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-white">Accepting Invitation</h2>
            <p className="text-sm text-zinc-400">Verifying credentials and adding you to the workspace...</p>
          </div>
        </>
      )}

      {status === "success" && workspace && (
        <>
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white font-sans">Welcome Aboard!</h2>
            <p className="text-sm text-zinc-400">
              You are now a registered teammate of <strong className="text-zinc-200">{workspace.name}</strong>.
            </p>
          </div>
          
          <Link href={`/${workspace.slug}`} className="w-full">
            <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20">
              Enter Workspace Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-white font-sans">Failed to Join</h2>
            <p className="text-xs text-red-400 font-mono p-3 bg-red-950/20 rounded-lg border border-red-900/30 text-left">
              {errorMsg}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed mt-2 text-left">
              This usually happens if the email you are logged in with (<strong>{user?.primaryEmailAddress?.emailAddress}</strong>) does not match the email address that received the workspace invitation.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 w-full mt-2">
            <SignOutButton>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                Sign Out & Use Another Email
              </Button>
            </SignOutButton>
          </div>
        </>
      )}
    </div>
  );
}

export default function InviteAcceptPage() {
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
        
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Resolving invitation details...</p>
          </div>
        }>
          <InviteAcceptContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-900 bg-zinc-950 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Socials Ark. All rights reserved.
      </footer>
    </div>
  );
}
