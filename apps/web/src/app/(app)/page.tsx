"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Plus, Star } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";

export default function DashboardPage() {
  const { data: repos, isLoading } = useQuery(trpc.repository.list.queryOptions());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Repositories</h1>
          <p className="text-xs text-muted-foreground">
            Your indexed repositories
          </p>
        </div>
        <Link
          href={"/repo/new" as never}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="size-3.5" />
          Index Repo
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-5" />
        </div>
      ) : !repos || repos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-sm text-muted-foreground">
              No repositories indexed yet
            </p>
            <Link
              href={"/repo/new" as never}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Index Your First Repo
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {repos.map((repo) => (
            <Link key={repo.id} href={`/repo/${repo.id}` as never}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {repo.owner}/{repo.name}
                    </CardTitle>
                    <Badge
                      variant={repo.status === "indexed" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {repo.status}
                    </Badge>
                  </div>
                  {repo.description ? (
                    <CardDescription className="text-xs line-clamp-1">
                      {repo.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
