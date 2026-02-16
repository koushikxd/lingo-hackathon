import fs from "node:fs/promises";

import prisma from "@lingo-dev/db";

import { cloneRepository } from "../indexing/codebase";
import { indexRepository } from "../rag";

type RepositoryMetadata = {
  name: string;
  owner: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
};

type IndexPublicRepositoryInput = {
  repoUrl: string;
  branch: string;
  metadata: RepositoryMetadata;
};

export async function indexPublicRepository(input: IndexPublicRepositoryInput) {
  const { repoUrl, branch, metadata } = input;

  let repository = await prisma.repository.upsert({
    where: { url: metadata.url },
    update: {
      name: metadata.name,
      owner: metadata.owner,
      description: metadata.description,
      stars: metadata.stars,
      language: metadata.language,
      status: "indexing",
    },
    create: {
      name: metadata.name,
      owner: metadata.owner,
      url: metadata.url,
      description: metadata.description,
      stars: metadata.stars,
      language: metadata.language,
      status: "indexing",
    },
  });

  let repoPath: string | null = null;
  try {
    repoPath = await cloneRepository({
      repoUrl,
      branch,
    });

    const vectorIds = await indexRepository({
      repoPath,
      repositoryId: repository.id,
      repositoryUrl: metadata.url,
    });

    repository = await prisma.repository.update({
      where: { id: repository.id },
      data: {
        chunksIndexed: vectorIds.length,
        status: "indexed",
        indexedAt: new Date(),
      },
    });

    return {
      repository,
      chunksIndexed: vectorIds.length,
    };
  } catch (error) {
    await prisma.repository.update({
      where: { id: repository.id },
      data: {
        status: "failed",
      },
    });

    throw error;
  } finally {
    if (repoPath) {
      await fs.rm(repoPath, { recursive: true, force: true });
    }
  }
}
