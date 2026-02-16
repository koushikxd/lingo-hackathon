"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

const isValidGitHubUrl = (value: string) =>
  /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(value.trim());

export default function NewRepoPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = repoUrl.trim();
      if (!isValidGitHubUrl(trimmed)) {
        toast.error("Enter a valid GitHub URL (https://github.com/owner/repo)");
        return;
      }

      setLoading(true);
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
          setLoading(false);
          return;
        }

        toast.success("Repository indexed successfully");
        router.push(`/repo/${data.repositoryId}` as never);
      } catch {
        toast.error("Failed to index repository");
        setLoading(false);
      }
    },
    [repoUrl, router],
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Index Repository</h1>
        <p className="text-xs text-muted-foreground">
          Paste a public GitHub repository URL to index and generate docs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repository URL</CardTitle>
          <CardDescription>
            Public GitHub repository to generate docs for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
              disabled={loading}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="size-3.5" />
                  Indexing...
                </>
              ) : (
                "Index Repository"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
