import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    QDRANT_URL: z.url().default("http://localhost:6333"),
    QDRANT_API_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    GITHUB_TOKEN: z.string().min(1),
    LINGODOTDEV_API_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
