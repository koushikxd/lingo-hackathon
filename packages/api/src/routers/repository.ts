import fs from "node:fs/promises";

import prisma from "@lingo-dev/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { cloneRepository } from "../lib/indexing/codebase";
import {
  deleteRepositoryFromVectorStore,
  indexRepository,
  queryRepository,
} from "../lib/rag";
import { publicProcedure, router } from "../index";

const createRepositoryInput = z.object({
  repositoryUrl: z.url(),
  name: z.string().min(1).max(255),
  owner: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  stars: z.number().int().min(0).default(0),
  language: z.string().nullable().optional(),
  branch: z.string().min(1).max(255).default("main"),
});

const indexRepositoryInput = z.object({
  repositoryId: z.string().min(1),
  branch: z.string().min(1).max(255).default("main"),
});

const queryRepositoryInput = z.object({
  repositoryId: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().min(3).max(15).default(5),
  scoreThreshold: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
});

const deleteIndexInput = z.object({
  repositoryId: z.string().min(1),
});

function serializeRepository(repository: {
  id: string;
  name: string;
  owner: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  chunksIndexed: number;
  status: unknown;
  indexedAt: Date;
  createdAt: Date;
}) {
  return {
    id: repository.id,
    name: repository.name,
    owner: repository.owner,
    url: repository.url,
    description: repository.description,
    stars: repository.stars,
    language: repository.language,
    chunksIndexed: repository.chunksIndexed,
    status: String(repository.status),
    indexedAt: repository.indexedAt,
    createdAt: repository.createdAt,
  };
}

export const repositoryRouter = router({
  create: publicProcedure.input(createRepositoryInput).mutation(async ({ input }) => {
    const repository = await prisma.repository.create({
      data: {
        name: input.name,
        owner: input.owner,
        url: input.repositoryUrl,
        description: input.description ?? null,
        stars: input.stars,
        language: input.language ?? null,
        status: "indexed",
      },
    });

    return { repository: serializeRepository(repository) };
  }),

  index: publicProcedure.input(indexRepositoryInput).mutation(async ({ input }) => {
    const repository = await prisma.repository.findUnique({
      where: {
        id: input.repositoryId,
      },
    });
    if (!repository) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Repository not found",
      });
    }

    await prisma.repository.update({
      where: { id: repository.id },
      data: {
        status: "indexing",
      },
    });

    let repoPath: string | null = null;
    try {
      repoPath = await cloneRepository({
        repoUrl: repository.url,
        branch: input.branch,
      });

      const vectorIds = await indexRepository({
        repoPath,
        repositoryId: repository.id,
        repositoryUrl: repository.url,
      });

      const updated = await prisma.repository.update({
        where: { id: repository.id },
        data: {
          status: "indexed",
          indexedAt: new Date(),
          chunksIndexed: vectorIds.length,
        },
      });

      return {
        repository: serializeRepository(updated),
        vectorCount: vectorIds.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to index repository";
      await prisma.repository.update({
        where: { id: repository.id },
        data: {
          status: `failed:${message}`,
        },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message,
      });
    } finally {
      if (repoPath) {
        await fs.rm(repoPath, { recursive: true, force: true });
      }
    }
  }),

  query: publicProcedure.input(queryRepositoryInput).query(async ({ input }) => {
    const repository = await prisma.repository.findUnique({
      where: {
        id: input.repositoryId,
      },
    });
    if (!repository) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Repository not found",
      });
    }

    const result = await queryRepository({
      query: input.query,
      repositoryId: repository.id,
      limit: input.limit,
      scoreThreshold: input.scoreThreshold,
      maxTokens: input.maxTokens,
    });

    return {
      repositoryId: repository.id,
      ...result,
    };
  }),

  deleteIndex: publicProcedure.input(deleteIndexInput).mutation(async ({ input }) => {
    const repository = await prisma.repository.findUnique({
      where: {
        id: input.repositoryId,
      },
    });
    if (!repository) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Repository not found",
      });
    }

    await deleteRepositoryFromVectorStore(repository.id);

    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data: {
        status: "indexed",
        chunksIndexed: 0,
      },
    });

    return { repository: serializeRepository(updated) };
  }),
});
