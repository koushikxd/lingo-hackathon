import fs from "node:fs/promises";
import path from "node:path";

import { cloneRepository } from "@lingo-dev/api/lib/indexing/codebase";
import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { env } from "@lingo-dev/env/server";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);
const IGNORED_DIRECTORIES = new Set([
  ".git", "node_modules", ".next", "dist", "build", "coverage", ".turbo", ".vercel",
]);

const supportedLocales = [
  "en", "es", "fr", "de", "pt-BR", "zh-CN", "ja", "ko",
  "hi", "ar", "ru", "it", "nl", "tr", "pl",
] as const;

const bodySchema = z.object({
  repositoryId: z.string().min(1),
  targetLocale: z.enum(supportedLocales),
});

const engine = new LingoDotDevEngine({ apiKey: env.LINGODOTDEV_API_KEY });

async function findMarkdownFiles(
  rootPath: string,
  currentPath = rootPath,
): Promise<string[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    const segments = relativePath.split(path.sep);

    if (segments.some((s) => IGNORED_DIRECTORIES.has(s))) continue;

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(rootPath, fullPath)));
    } else if (
      entry.isFile() &&
      MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function POST(req: Request) {
  let repoPath: string | null = null;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findFirst({
      where: { id: body.repositoryId, userId: session.user.id },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }
    if (repository.status !== "indexed" || repository.chunksIndexed === 0) {
      return NextResponse.json({ error: "Repository is not indexed yet." }, { status: 409 });
    }

    repoPath = await cloneRepository({ repoUrl: repository.url });

    const mdFiles = await findMarkdownFiles(repoPath);
    if (mdFiles.length === 0) {
      return NextResponse.json({ files: [], locale: body.targetLocale });
    }

    const translatedFiles: { path: string; content: string }[] = [];

    for (const filePath of mdFiles) {
      const content = await fs.readFile(filePath, "utf8");
      if (!content.trim()) continue;

      const translated = await engine.localizeText(content, {
        sourceLocale: "en",
        targetLocale: body.targetLocale,
        fast: true,
      });

      translatedFiles.push({
        path: path.relative(repoPath, filePath),
        content: translated,
      });
    }

    await prisma.markdownTranslation.create({
      data: {
        locale: body.targetLocale,
        files: translatedFiles,
        repositoryId: repository.id,
      },
    });

    return NextResponse.json({ files: translatedFiles, locale: body.targetLocale });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide repositoryId and targetLocale." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Markdown translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (repoPath) {
      await fs.rm(repoPath, { recursive: true, force: true });
    }
  }
}
