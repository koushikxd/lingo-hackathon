import { nanoid } from "nanoid";

import { getQdrantClient } from "../vector/qdrant";
import type { CodeChunkType } from "./chunker";
import { EMBEDDING_DIMENSION } from "./embedder";

export const DEFAULT_COLLECTION_NAME = "lingo-dev";

type ChunkPayload = {
  repositoryId: string;
  repositoryUrl: string;
  filePath: string;
  fileExtension: string;
  chunkIndex: number;
  type: CodeChunkType;
  content: string;
  tokenEstimate: number;
};

export type VectorPoint = {
  id?: string;
  vector: number[];
  payload: ChunkPayload;
};

export type SearchFilters = {
  repositoryId: string;
  filePath?: string;
  type?: string;
};

type SearchInput = {
  collectionName?: string;
  embedding: number[];
  filters: SearchFilters;
  limit: number;
  scoreThreshold?: number;
};

export type VectorSearchResult = {
  id: string;
  score: number;
  payload: ChunkPayload;
};

async function collectionExists(collectionName: string) {
  const client = getQdrantClient();
  const collections = await client.getCollections();
  return collections.collections.some((collection) => collection.name === collectionName);
}

export async function ensureCollection(collectionName = DEFAULT_COLLECTION_NAME) {
  const client = getQdrantClient();
  const exists = await collectionExists(collectionName);

  if (!exists) {
    await client.createCollection(collectionName, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine",
      },
    });

    await Promise.all([
      client.createPayloadIndex(collectionName, {
        field_name: "repositoryId",
        field_schema: "keyword",
        wait: true,
      }),
      client.createPayloadIndex(collectionName, {
        field_name: "filePath",
        field_schema: "keyword",
        wait: true,
      }),
      client.createPayloadIndex(collectionName, {
        field_name: "type",
        field_schema: "keyword",
        wait: true,
      }),
    ]);
  }
}

export async function upsertVectors(points: VectorPoint[], collectionName = DEFAULT_COLLECTION_NAME) {
  if (points.length === 0) {
    return [];
  }

  await ensureCollection(collectionName);
  const client = getQdrantClient();
  const normalized = points.map((point) => ({
    id: point.id ?? nanoid(),
    vector: point.vector,
    payload: point.payload,
  }));

  await client.upsert(collectionName, {
    wait: true,
    points: normalized,
  });

  return normalized.map((point) => point.id);
}

export async function searchVectors(input: SearchInput): Promise<VectorSearchResult[]> {
  const { collectionName = DEFAULT_COLLECTION_NAME, embedding, filters, limit, scoreThreshold } = input;
  await ensureCollection(collectionName);

  const client = getQdrantClient();
  const must: Array<{ key: string; match: { value: string } }> = [
    {
      key: "repositoryId",
      match: { value: filters.repositoryId },
    },
  ];

  if (filters.filePath) {
    must.push({
      key: "filePath",
      match: { value: filters.filePath },
    });
  }

  if (filters.type) {
    must.push({
      key: "type",
      match: { value: filters.type },
    });
  }

  const results = await client.search(collectionName, {
    vector: embedding,
    limit,
    score_threshold: scoreThreshold,
    with_payload: true,
    filter: { must },
  });

  return results
    .filter((item) => typeof item.id === "string" && item.payload && typeof item.score === "number")
    .map((item) => ({
      id: item.id as string,
      score: item.score,
      payload: item.payload as ChunkPayload,
    }));
}

export async function deleteVectors(
  vectorIds: string[],
  collectionName = DEFAULT_COLLECTION_NAME
) {
  if (vectorIds.length === 0) {
    return;
  }

  await ensureCollection(collectionName);
  const client = getQdrantClient();
  await client.delete(collectionName, {
    wait: true,
    points: vectorIds,
  });
}

export async function deleteVectorsByRepository(
  repositoryId: string,
  collectionName = DEFAULT_COLLECTION_NAME
) {
  await ensureCollection(collectionName);
  const client = getQdrantClient();
  await client.delete(collectionName, {
    wait: true,
    filter: {
      must: [
        {
          key: "repositoryId",
          match: { value: repositoryId },
        },
      ],
    },
  });
}
