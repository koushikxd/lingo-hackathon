"use client";

import { useRouter } from "next/navigation";
import { Globe, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2">
            <Globe className="size-4" />
            <span className="text-sm font-semibold tracking-tight">lingo-dev</span>
          </a>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
    </>
  );
}
