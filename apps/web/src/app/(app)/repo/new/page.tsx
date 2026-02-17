"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function NewRepoPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [search, setSearch] = useState("");
  const [indexingId, setIndexingId] = useState<number | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    fetch("/api/github/repos")
      .then((res) => res.json())
      .then((data: { repos?: GitHubRepo[]; error?: string }) => {
        if (data.repos) setRepos(data.repos);
        else toast.error(data.error ?? "Failed to fetch repos");
      })
      .catch(() => toast.error("Failed to fetch repos"))
      .finally(() => setLoadingRepos(false));
  }, []);

  const filtered = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const handleIndex = useCallback(
    async (repo: GitHubRepo) => {
      setIndexingId(repo.id);
      try {
        const res = await fetch("/api/repository/index", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoUrl: repo.url }),
        });
        const data = (await res.json()) as {
          success: boolean;
          repositoryId?: string;
          error?: string;
        };
        if (!res.ok || !data.success) {
          toast.error(data.error ?? "Failed to index repository");
          setIndexingId(null);
          return;
        }
        toast.success("Repository indexed successfully");
        router.push(`/repo/${data.repositoryId}` as never);
      } catch {
        toast.error("Failed to index repository");
        setIndexingId(null);
      }
    },
    [router],
  );

  const handleManualSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = manualUrl.trim();
      if (!/^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(trimmed)) {
        toast.error("Enter a valid GitHub URL (https://github.com/owner/repo)");
        return;
      }
      setManualLoading(true);
      try {
        const res = await fetch("/api/repository/index", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoUrl: trimmed }),
        });
        const data = (await res.json()) as {
          success: boolean;
          repositoryId?: string;
          error?: string;
        };
        if (!res.ok || !data.success) {
          toast.error(data.error ?? "Failed to index repository");
          setManualLoading(false);
          return;
        }
        toast.success("Repository indexed successfully");
        router.push(`/repo/${data.repositoryId}` as never);
      } catch {
        toast.error("Failed to index repository");
        setManualLoading(false);
      }
    },
    [manualUrl, router],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Index Repository
        </h1>
        <p className="text-xs text-muted-foreground">
          Select a repository from your GitHub account or enter a URL manually
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Repositories</CardTitle>
          <CardDescription>
            Public and private repos from your GitHub account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="pl-8"
            />
          </div>

          {loadingRepos ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {search
                ? "No repositories match your search"
                : "No repositories found"}
            </p>
          ) : (
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  disabled={indexingId !== null}
                  onClick={() => handleIndex(repo)}
                  className="flex w-full items-center justify-between border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {repo.fullName}
                      </span>
                      {repo.isPrivate ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          <Lock className="mr-0.5 size-2.5" />
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
                          <span className="size-2 bg-primary" />
                          {repo.language}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Star className="size-3" />
                        {repo.stars}
                      </span>
                    </div>
                  </div>
                  {indexingId === repo.id ? (
                    <Spinner className="ml-3 size-4 shrink-0" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual URL</CardTitle>
          <CardDescription>Or paste any GitHub repository URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
              disabled={manualLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={manualLoading}>
              {manualLoading ? <Spinner className="size-3.5" /> : "Index"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
