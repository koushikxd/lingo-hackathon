"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GitBranch, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: repos, isLoading } = useQuery(
    trpc.repository.list.queryOptions(),
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    owner: string;
    name: string;
  } | null>(null);

  const deleteMutation = useMutation(
    trpc.repository.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Repository deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.repository.list.queryOptions().queryKey,
        });
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete repository");
        setDeleteTarget(null);
      },
    }),
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  }, [deleteTarget, deleteMutation]);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-pretty">
            Repositories
          </h1>
          <p className="text-xs text-muted-foreground">
            Your indexed repositories
          </p>
        </div>
        <Link
          href={"/repo/new" as never}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Index Repo
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border bg-card p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : !repos || repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            No repositories indexed yet
          </p>
          <Link
            href={"/repo/new" as never}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Index Your First Repo
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) => (
            <ContextMenu key={repo.id}>
              <ContextMenuTrigger>
                <Link
                  href={`/repo/${repo.id}` as never}
                  className="block border border-neutral-700 bg-neutral-900 p-4 transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.99] motion-safe:transition-[background-color,transform]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {repo.owner}/{repo.name}
                    </span>
                    <Badge
                      variant={
                        repo.status === "indexed" ? "default" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {repo.status}
                    </Badge>
                  </div>
                  {repo.description ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {repo.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="size-2 bg-primary"
                          aria-hidden="true"
                        />
                        {repo.language}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 tabular-nums">
                      <Star className="size-3" aria-hidden="true" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <GitBranch className="size-3" aria-hidden="true" />
                      {repo.chunksIndexed} chunks
                    </span>
                  </div>
                </Link>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => router.push(`/repo/${repo.id}` as never)}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Open
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      id: repo.id,
                      owner: repo.owner,
                      name: repo.name,
                    })
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete repository?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteTarget?.owner}/{deleteTarget?.name} and
              all its indexed data, onboarding docs, and translations. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
