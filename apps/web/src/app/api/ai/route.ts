import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { createContext } from "@lingo-dev/api/context";
import { calculateAvailableTokens, countTokens } from "@lingo-dev/api/lib/ai/token-counter";
import { appRouter } from "@lingo-dev/api/routers/index";
import { streamText, type UIMessage, convertToModelMessages, wrapLanguageModel } from "ai";
import type { NextRequest } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    repositoryId?: string;
  };
  const { messages, repositoryId } = body;
  const latestMessage = messages[messages.length - 1];
  const latestPrompt = JSON.stringify(latestMessage?.parts ?? latestMessage ?? "");

  let system: string | undefined;
  if (repositoryId) {
    try {
      const context = await createContext(req);
      const caller = appRouter.createCaller(context);
      const promptTokens = countTokens(JSON.stringify(messages));
      const maxTokens = calculateAvailableTokens("gpt-4o-mini", promptTokens, 2048, 1024);
      const retrieval = await caller.repository.query({
        repositoryId,
        query: latestPrompt,
        limit: 5,
        maxTokens,
      });

      if (retrieval.sources.length > 0) {
        const contextText = retrieval.sources
          .map((source, index) => {
            return `[Source ${index + 1}] ${source.metadata.filePath}\n${source.content}`;
          })
          .join("\n\n");

        system = `Answer using this repository context when relevant:\n\n${contextText}`;
      }
    } catch (_error) {
      system = undefined;
    }
  }

  const model = wrapLanguageModel({
    model: google("gemini-2.5-flash"),
    middleware: devToolsMiddleware(),
  });
  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    system,
  });

  return result.toUIMessageStreamResponse();
}
