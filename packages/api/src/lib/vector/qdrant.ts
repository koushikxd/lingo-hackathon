import { QdrantClient } from "@qdrant/js-client-rest";

import { env } from "@lingo-dev/env/server";

let client: QdrantClient | null = null;

export function getQdrantClient() {
  if (client) {
    return client;
  }

  client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

  return client;
}

export async function checkQdrantHealth() {
  const headers: Record<string, string> = {};
  if (env.QDRANT_API_KEY) {
    headers["api-key"] = env.QDRANT_API_KEY;
  }

  const response = await fetch(new URL("/health", env.QDRANT_URL), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Qdrant health check failed with status ${response.status}`);
  }
}
