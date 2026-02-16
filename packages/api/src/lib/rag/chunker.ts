import fs from "node:fs/promises";
import path from "node:path";

import { MDocument } from "@mastra/rag";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 100;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".scss",
  ".html",
  ".sql",
  ".prisma",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".rb",
  ".php",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".sh",
  ".env",
]);
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".7z",
  ".mp4",
  ".mp3",
  ".mov",
  ".avi",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".exe",
  ".dylib",
  ".so",
  ".bin",
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
]);

export type CodeChunkType = "markdown" | "code" | "text";

export type CodeChunk = {
  repositoryId: string;
  repositoryUrl: string;
  filePath: string;
  fileExtension: string;
  chunkIndex: number;
  type: CodeChunkType;
  content: string;
  tokenEstimate: number;
};

function estimateTokens(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function getChunkType(ext: string): CodeChunkType {
  if (MARKDOWN_EXTENSIONS.has(ext)) {
    return "markdown";
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return "code";
  }
  return "text";
}

function isIgnoredPath(relativePath: string) {
  const segments = relativePath.split(path.sep);
  return segments.some((segment) => IGNORED_DIRECTORIES.has(segment));
}

function isBinaryFile(filePath: string, buffer: Buffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }
  return buffer.includes(0);
}

async function listFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (isIgnoredPath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await listFiles(rootPath, fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractChunkText(chunk: unknown) {
  if (typeof chunk === "string") {
    return chunk;
  }
  if (!chunk || typeof chunk !== "object") {
    return "";
  }

  if ("text" in chunk && typeof chunk.text === "string") {
    return chunk.text;
  }

  if (
    "pageContent" in chunk &&
    typeof (chunk as { pageContent?: unknown }).pageContent === "string"
  ) {
    return (chunk as { pageContent: string }).pageContent;
  }

  return "";
}

async function chunkFileContent(content: string, type: CodeChunkType) {
  const document =
    type === "markdown" ? MDocument.fromMarkdown(content) : MDocument.fromText(content);

  const result = await document.chunk({
    strategy: "recursive",
    maxSize: CHUNK_SIZE,
    overlap: CHUNK_OVERLAP,
  });

  const chunks = Array.isArray(result) ? result : [];
  const texts = chunks.map(extractChunkText).filter((text) => text.trim().length > 0);
  if (texts.length > 0) {
    return texts;
  }
  return content.trim() ? [content] : [];
}

export async function chunkRepositoryFiles(input: {
  repoPath: string;
  repositoryId: string;
  repositoryUrl: string;
}) {
  const { repoPath, repositoryId, repositoryUrl } = input;
  const files = await listFiles(repoPath);
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_FILE_SIZE) {
      continue;
    }

    const buffer = await fs.readFile(file);
    if (isBinaryFile(file, buffer)) {
      continue;
    }

    const content = buffer.toString("utf8");
    if (!content.trim()) {
      continue;
    }

    const relativePath = path.relative(repoPath, file);
    const extension = path.extname(relativePath).toLowerCase();
    const type = getChunkType(extension);
    const fileChunks = await chunkFileContent(content, type);

    for (const [chunkIndex, chunkContent] of fileChunks.entries()) {
      chunks.push({
        repositoryId,
        repositoryUrl,
        filePath: relativePath,
        fileExtension: extension,
        chunkIndex,
        type,
        content: chunkContent,
        tokenEstimate: estimateTokens(chunkContent),
      });
    }
  }

  return chunks;
}
