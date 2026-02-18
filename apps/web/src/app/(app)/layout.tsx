"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronsUpDown, Globe, LogOut, Plus } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type BreadcrumbEntry = { label: string; href?: string };

function buildBreadcrumbs(
  pathname: string,
  activeRepo: { owner: string; name: string; id: string } | null | undefined,
): BreadcrumbEntry[] {
  const crumbs: BreadcrumbEntry[] = [{ label: "Repositories", href: "/" }];

  if (pathname === "/") return crumbs;

  if (pathname === "/bot") {
    return [{ label: "lingo-bolt" }];
  }

  if (pathname === "/repo/new") {
    crumbs.push({ label: "Index New" });
    return crumbs;
  }

  if (activeRepo) {
    crumbs.push({
      label: `${activeRepo.owner}/${activeRepo.name}`,
      href: `/repo/${activeRepo.id}`,
    });

    if (pathname.endsWith("/onboarding")) {
      crumbs.push({ label: "Onboarding" });
    } else if (pathname.endsWith("/markdown")) {
      crumbs.push({ label: "Markdown" });
    }
  }

  return crumbs;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { data: repos, isLoading: loadingRepos } = useQuery(trpc.repository.list.queryOptions());

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const repoIdMatch = pathname.match(/^\/repo\/([^/]+)/);
  const activeRepoId = repoIdMatch?.[1] !== "new" ? repoIdMatch?.[1] : null;
  const activeRepo = activeRepoId ? repos?.find((r) => r.id === activeRepoId) : null;
  const breadcrumbs = buildBreadcrumbs(pathname, activeRepo);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center">
                  <Globe className="size-3.5" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-tight">lingo bolt</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Repositories</SidebarGroupLabel>
            <SidebarGroupAction render={<Link href={"/repo/new" as never} />} title="Index New">
              <Plus aria-hidden="true" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {loadingRepos ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  ))
                ) : repos && repos.length > 0 ? (
                  repos.map((repo) => (
                    <SidebarMenuItem key={repo.id}>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground/70"
                        isActive={activeRepoId === repo.id}
                        render={<Link href={`/repo/${repo.id}` as never} />}
                      >
                        <span className="truncate">
                          {repo.owner}/{repo.name}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">No repos yet</p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Bot</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground/70"
                    isActive={pathname === "/bot"}
                    render={<Link href={"/bot" as never} />}
                  >
                    <Bot className="size-3.5" aria-hidden="true" />
                    <span>lingo-bolt</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {session?.user ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                      />
                    }
                  >
                    <Avatar size="sm">
                      <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                      <AvatarFallback className="text-[10px]">
                        {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate text-xs font-medium">{session.user.name}</span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" side="top" align="end" sideOffset={4}>
                    <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                      <Avatar size="sm">
                        <AvatarImage
                          src={session.user.image ?? undefined}
                          alt={session.user.name}
                        />
                        <AvatarFallback className="text-[10px]">
                          {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate text-xs font-medium">{session.user.name}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {session.user.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : null}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <BreadcrumbItem key={crumb.label}>
                    {i > 0 ? <BreadcrumbSeparator /> : null}
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href as never} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto px-3">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
