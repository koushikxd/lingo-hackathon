import { queryRepository } from "@lingo-dev/api/lib/rag/index";
import prisma from "@lingo-dev/db";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  repositoryId: z.string().min(1),
});

const RAG_QUERIES = [
  "project overview, README, purpose, what this project does, description",
  "folder structure, directory layout, key files and what each folder handles",
  "setup instructions, installation, development commands, getting started, build",
];

const SYSTEM_PROMPT = `You are a senior developer writing onboarding documentation for a new team member. Your goal: help them understand and start working with this codebase as fast as possible.

Rules:
- Write in a natural, direct tone. Like a helpful colleague, not a textbook.
- Be concise. Every sentence must add value. No filler, no fluff, no "this project is a great example of..."
- Use simple language. Explain jargon only when unavoidable.
- Include actual file paths, folder names, and commands from the provided context. Never invent them.
- Do not add disclaimers, caveats, or meta-commentary like "based on the provided context".
- Do not repeat information across sections.
- Use markdown formatting with clear headings.

Generate these sections:

## What This Project Does
2-3 sentences max. What it is, who it's for, what problem it solves.

## Tech Stack
Bullet list of key technologies. No descriptions unless the choice is non-obvious.

## Project Structure
Show the top-level folder layout with a one-line description per folder. Use a code block for the tree. Only include folders that actually exist in the context.

## Getting Started
Numbered steps with actual commands. Include prerequisites (Node version, env vars, databases, etc). Keep it to what's strictly needed to run the project locally.

## Key Concepts
Only include this section if the codebase has unique patterns, conventions, or architectural decisions worth knowing. Skip entirely if there's nothing non-obvious. Keep each point to 1-2 sentences.`;

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findUnique({
      where: { id: body.repositoryId },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }
    if (repository.status !== "indexed" || repository.chunksIndexed === 0) {
      return NextResponse.json(
        { error: "Repository is not indexed yet. Index the repository before generating docs." },
        { status: 409 },
      );
    }

    const ragResults = await Promise.all(
      RAG_QUERIES.map((query) =>
        queryRepository({
          query,
          repositoryId: repository.id,
          limit: 8,
          maxTokens: 4000,
        }),
      ),
    );

    const sources = ragResults
      .flatMap((result) => result.sources)
      .filter(
        (source, index, all) =>
          index ===
          all.findIndex(
            (item) =>
              item.metadata.filePath === source.metadata.filePath &&
              item.metadata.chunkIndex === source.metadata.chunkIndex,
          ),
      );
    if (sources.length === 0) {
      return NextResponse.json(
        { error: "No relevant repository context found. Try indexing again." },
        { status: 422 },
      );
    }
    const contextBlocks = sources
      .map(
        (source) =>
          `--- ${source.metadata.filePath} (${source.metadata.type}) ---\n${source.content}`,
      )
      .join("\n\n");

    const userPrompt = `Here is the repository information:
- Name: ${repository.name}
- Owner: ${repository.owner}
- Description: ${repository.description ?? "No description provided"}
- Primary Language: ${repository.language ?? "Not specified"}

Here is the codebase context retrieved from the repository:

${contextBlocks}

Generate the onboarding documentation now.`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide a repositoryId." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to generate docs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
