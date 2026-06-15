import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DEVICE_INGEST_TOKEN: z.string().optional(),
  OFFLINE_AFTER_SECONDS: z.coerce.number().default(300),
  MOCK_MODE: z.coerce.boolean().default(false)
});

export const env = EnvSchema.parse(process.env);
