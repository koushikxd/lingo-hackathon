import { indexPublicRepository } from "@lingo-dev/api/lib/repository/indexer";
import { auth } from "@lingo-dev/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import {
  fetchGitHubRepositoryMetadata,
  parseGitHubRepositoryUrl,
} from "@/lib/github";

const bodySchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());
    const parsed = parseGitHubRepositoryUrl(body.repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Invalid GitHub URL. Use format https://github.com/owner/repo" },
        { status: 400 },
      );
    }

    const metadata = await fetchGitHubRepositoryMetadata(parsed);
    const branch = body.branch ?? metadata.defaultBranch;
    const indexed = await indexPublicRepository({
      repoUrl: parsed.normalizedUrl,
      branch,
      metadata,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      repositoryId: indexed.repository.id,
      chunksIndexed: indexed.chunksIndexed,
      repository: indexed.repository,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body. Provide repoUrl and optional branch." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Repository indexing failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
