"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/utils/trpc";

const TITLE_TEXT = ``;

export default function Home() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidGitHubUrl = (value: string) => {
    return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(value.trim());
  };

  const handleIndexRepository = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedUrl = repoUrl.trim();
    if (!isValidGitHubUrl(trimmedUrl)) {
      toast.error(
        "Enter a valid GitHub URL in format https://github.com/owner/repo",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/repository/index", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: trimmedUrl,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        repositoryId?: string;
        chunksIndexed?: number;
        error?: string;
      };

      if (!response.ok || !result.success) {
        toast.error(result.error ?? "Failed to index repository");
        return;
      }

      toast.success(
        `Repository indexed. ID: ${result.repositoryId} (${result.chunksIndexed ?? 0} chunks)`,
      );
      setRepoUrl("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to index repository";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {healthCheck.isLoading
                ? "Checking..."
                : healthCheck.data
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Index GitHub Repository</h2>
          <form className="flex gap-2" onSubmit={handleIndexRepository}>
            <Input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Indexing...
                </span>
              ) : (
                "Index Repository"
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
