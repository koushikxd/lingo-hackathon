import { countTokens } from "../ai/token-counter";
import { chunkRepositoryFiles, type CodeChunk } from "./chunker";
import { generateEmbeddings } from "./embedder";
import {
  DEFAULT_COLLECTION_NAME,
  deleteVectors,
  deleteVectorsByRepository,
  searchVectors,
  upsertVectors,
} from "./vector-store";

type IndexRepositoryInput = {
  repoPath: string;
  repositoryId: string;
  repositoryUrl: string;
  collectionName?: string;
};

type QueryRepositoryInput = {
  query: string;
  repositoryId: string;
  limit?: number;
  scoreThreshold?: number;
  collectionName?: string;
  maxTokens?: number;
};

export type Source = {
  id: string;
  content: string;
  score: number;
  metadata: Omit<CodeChunk, "content">;
};

export type SearchResult = {
  query: string;
  sources: Source[];
};

export async function indexRepository(input: IndexRepositoryInput) {
  const { repoPath, repositoryId, repositoryUrl, collectionName = DEFAULT_COLLECTION_NAME } = input;

  console.log(`[RAG] chunking repository ${repositoryId}`);
  const chunks = await chunkRepositoryFiles({
    repoPath,
    repositoryId,
    repositoryUrl,
  });
  console.log(`[RAG] generated chunks: ${chunks.length}`);

  const texts = chunks.map((chunk) => chunk.content);
  const embeddingResult = await generateEmbeddings(texts);
  console.log(`[RAG] created embeddings: ${embeddingResult.embeddings.length}`);

  const points = chunks.flatMap((chunk, index) => {
    const vector = embeddingResult.embeddings[index];
    if (!vector) {
      return [];
    }
    return [
      {
        vector,
        payload: chunk,
      },
    ];
  });

  const vectorIds = await upsertVectors(points, collectionName);
  console.log(`[RAG] stored vectors: ${vectorIds.length}`);
  return vectorIds;
}

export async function queryRepository(input: QueryRepositoryInput): Promise<SearchResult> {
  const {
    query,
    repositoryId,
    limit = 5,
    scoreThreshold,
    collectionName = DEFAULT_COLLECTION_NAME,
    maxTokens,
  } = input;

  const safeLimit = Math.max(3, Math.min(15, limit));
  const queryEmbedding = await generateEmbeddings([query]);
  const [embedding] = queryEmbedding.embeddings;
  if (!embedding) {
    return {
      query,
      sources: [],
    };
  }

  const vectorResults = await searchVectors({
    collectionName,
    embedding,
    filters: { repositoryId },
    limit: safeLimit,
    scoreThreshold,
  });

  const sources: Source[] = [];
  let usedTokens = 0;

  for (const result of vectorResults) {
    const tokenCount = countTokens(result.payload.content);
    if (typeof maxTokens === "number" && usedTokens + tokenCount > maxTokens) {
      continue;
    }

    usedTokens += tokenCount;
    const { content, ...metadata } = result.payload;
    sources.push({
      id: result.id,
      content,
      score: result.score,
      metadata,
    });
  }

  return {
    query,
    sources,
  };
}

export async function deleteFromVectorStore(
  vectorIds: string[],
  collectionName = DEFAULT_COLLECTION_NAME,
) {
  await deleteVectors(vectorIds, collectionName);
}

export async function deleteRepositoryFromVectorStore(
  repositoryId: string,
  collectionName = DEFAULT_COLLECTION_NAME,
) {
  await deleteVectorsByRepository(repositoryId, collectionName);
}

export function extractVectorIds(items: Array<string | { id?: string }>) {
  return items
    .map((item) => (typeof item === "string" ? item : item.id))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}
