import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  DATABASE_URL: z.string(),
  COOKIE_SECRET: z.string(),
  LIVEBLOCKS_SECRET_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
