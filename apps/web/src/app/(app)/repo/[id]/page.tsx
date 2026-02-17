"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, GitBranch, Languages, Star } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: repo, isLoading } = useQuery(
    trpc.repository.getById.queryOptions({ id }),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Repository not found
      </p>
    );
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">
          {repo.owner}/{repo.name}
        </h1>
        {repo.description ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {repo.description}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <Badge
            variant={repo.status === "indexed" ? "default" : "outline"}
            className="text-[10px]"
          >
            {repo.status}
          </Badge>
          {repo.language ? (
            <span className="flex items-center gap-1">
              <span className="size-2 bg-primary" aria-hidden="true" />
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/repo/${id}/onboarding` as never}
          className="group flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4 transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.99] motion-safe:transition-[background-color,transform]"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="size-4" aria-hidden="true" />
              Onboarding Docs
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              AI-powered onboarding documentation
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {repo.onboardingDocs.length > 0
                ? `${repo.onboardingDocs.length} doc${repo.onboardingDocs.length === 1 ? "" : "s"} generated`
                : "Auto-generating..."}
            </span>
            <ArrowRight
              className="size-3.5 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </Link>

        <Link
          href={`/repo/${id}/markdown` as never}
          className="group flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4 transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.99] motion-safe:transition-[background-color,transform]"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4" aria-hidden="true" />
              Markdown Translation
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Translate markdown files via lingo.dev
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {repo.markdownTranslations.length > 0
                ? `${repo.markdownTranslations.length} translation${repo.markdownTranslations.length === 1 ? "" : "s"} saved`
                : "No translations yet"}
            </span>
            <ArrowRight
              className="size-3.5 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </Link>
      </div>

      {repo.onboardingDocs.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Recent Onboarding Docs</h2>
          <div className="space-y-1.5">
            {repo.onboardingDocs.slice(0, 5).map((doc) => (
              <Link
                key={doc.id}
                href={`/repo/${id}/onboarding` as never}
                className="flex items-center justify-between border border-neutral-700 bg-neutral-900 px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {doc.locale}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">View</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
