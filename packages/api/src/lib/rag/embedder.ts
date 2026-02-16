import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";

import { env } from "@lingo-dev/env/server";

export const BATCH_SIZE = 96;
export const EMBEDDING_DIMENSION = 1536;
const EMBEDDING_MODEL = "text-embedding-3-small";
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export type EmbeddingResult = {
  embeddings: number[][];
  texts: string[];
};

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const normalized = texts.map((text) => text.trim()).filter((text) => text.length > 0);
  const embeddings: number[][] = [];

  for (let index = 0; index < normalized.length; index += BATCH_SIZE) {
    const batch = normalized.slice(index, index + BATCH_SIZE);
    const result = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: batch,
    });

    for (const embedding of result.embeddings) {
      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Unexpected embedding dimension ${embedding.length}, expected ${EMBEDDING_DIMENSION}`
        );
      }
      embeddings.push(embedding);
    }
  }

  return {
    embeddings,
    texts: normalized,
  };
}
