"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, GitBranch, Languages, Star } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

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
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5" />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {repo.owner}/{repo.name}
        </h1>
        {repo.description ? (
          <p className="text-xs text-muted-foreground">{repo.description}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant={repo.status === "indexed" ? "secondary" : "outline"}>
            {repo.status}
          </Badge>
          {repo.language ? (
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              {repo.language}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Star className="size-3" />
            {repo.stars}
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="size-3" />
            {repo.chunksIndexed} chunks
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/repo/${id}/onboarding` as never}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Languages className="size-4" />
                Onboarding Docs
              </CardTitle>
              <CardDescription className="text-xs">
                Generate AI-powered onboarding documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {repo.onboardingDocs.length > 0
                  ? `${repo.onboardingDocs.length} doc${repo.onboardingDocs.length === 1 ? "" : "s"} generated`
                  : "No docs generated yet"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/repo/${id}/markdown` as never}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <FileText className="size-4" />
                Markdown Translation
              </CardTitle>
              <CardDescription className="text-xs">
                Batch translate markdown files via lingo.dev
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {repo.markdownTranslations.length > 0
                  ? `${repo.markdownTranslations.length} translation${repo.markdownTranslations.length === 1 ? "" : "s"} saved`
                  : "No translations yet"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {repo.onboardingDocs.length > 0 ? (
        <>
          <Separator />
          <div>
            <h2 className="mb-3 text-sm font-semibold">Recent Onboarding Docs</h2>
            <div className="space-y-2">
              {repo.onboardingDocs.slice(0, 5).map((doc) => (
                <Link
                  key={doc.id}
                  href={`/repo/${id}/onboarding?doc=${doc.id}` as never}
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {doc.locale}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={buttonVariants({ variant: "ghost", size: "sm" }) + " text-xs"}
                      >
                        View
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
