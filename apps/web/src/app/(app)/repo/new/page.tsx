"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  isPrivate: boolean;
  defaultBranch: string;
};

const INDEXING_STEPS = [
  "Cloning repository...",
  "Analyzing files...",
  "Generating embeddings...",
  "Storing vectors...",
  "Finishing up...",
];

const PAGE_SIZE = 10;

function IndexingProgress({ label, step }: { label: string; step: number }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 flex flex-col items-center justify-center gap-6 py-20">
        <Spinner className="size-6" />
        <div className="text-center">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {INDEXING_STEPS[step]}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          {INDEXING_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex size-5 shrink-0 items-center justify-center border text-[10px] transition-colors duration-200 ease-out ${i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground bg-muted/50"}`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={`text-xs transition-colors duration-200 ease-out ${i <= step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.replace("...", "")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewRepoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [indexingStep, setIndexingStep] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: repos = [], isLoading: loadingRepos } = useQuery<GitHubRepo[]>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos");
      const data = (await res.json()) as {
        repos?: GitHubRepo[];
        error?: string;
      };
      if (!res.ok || !data.repos)
        throw new Error(data.error ?? "Failed to fetch repos");
      return data.repos;
    },
  });

  const indexMutation = useMutation({
    mutationFn: async (repoUrl: string) => {
      const res = await fetch("/api/repository/index", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = (await res.json()) as {
        success: boolean;
        repositoryId?: string;
        error?: string;
      };
      if (!res.ok || !data.success)
        throw new Error(data.error ?? "Failed to index repository");
      return data;
    },
    onMutate: () => {
      setIndexingStep(0);
      let step = 0;
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      stepTimerRef.current = setInterval(() => {
        step++;
        if (step < INDEXING_STEPS.length) setIndexingStep(step);
      }, 4000);
    },
    onSuccess: (data) => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      toast.success("Repository indexed successfully");
      queryClient.invalidateQueries({
        queryKey: trpc.repository.list.queryOptions().queryKey,
      });
      router.push(`/repo/${data.repositoryId}` as never);
    },
    onError: (error) => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      toast.error(error.message);
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [repos, search]);

  const visibleRepos = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleRepos.length]);

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = manualUrl.trim();
    if (!/^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(trimmed)) {
      toast.error("Enter a valid GitHub URL (https://github.com/owner/repo)");
      return;
    }
    indexMutation.mutate(trimmed);
  };

  if (indexMutation.isPending) {
    const indexingRepo = repos.find((r) => r.url === indexMutation.variables);
    return (
      <IndexingProgress
        label={indexingRepo?.fullName ?? "Indexing repository"}
        step={indexingStep}
      />
    );
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">
          Index Repository
        </h1>
        <p className="text-xs text-muted-foreground">
          Select a repository from your GitHub account or enter a URL manually
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your Repositories</p>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length} repos
          </span>
        </div>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="pl-8"
            aria-label="Search repositories"
          />
        </div>

        {loadingRepos ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border border-border bg-card p-3"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center border border-dashed border-border py-12">
            <p className="text-xs text-muted-foreground">
              {search
                ? "No repositories match your search"
                : "No repositories found"}
            </p>
          </div>
        ) : (
          <div className="max-h-112 space-y-1 overflow-y-auto">
            {visibleRepos.map((repo) => (
              <button
                key={repo.id}
                disabled={indexMutation.isPending}
                onClick={() => indexMutation.mutate(repo.url)}
                className="flex w-full items-center justify-between border border-border bg-card p-3 text-left transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.99] disabled:opacity-50 motion-safe:transition-[background-color,transform] cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {repo.fullName}
                    </span>
                    {repo.isPrivate ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        <Lock className="mr-0.5 size-2.5" aria-hidden="true" />
                        Private
                      </Badge>
                    ) : null}
                  </div>
                  {repo.description ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {repo.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
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
                  </div>
                </div>
              </button>
            ))}
            {hasMore ? <div ref={sentinelRef} className="h-4" /> : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium">Manual URL</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            autoComplete="off"
            disabled={indexMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={indexMutation.isPending}>
            {indexMutation.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              "Index"
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}
