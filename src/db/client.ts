import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Connect a Neon database via the Vercel dashboard (Storage → Create Database → Neon), then pull env vars with `vercel env pull .env.local`.",
  );
}

const sql = neon(url);
export const db = drizzle(sql, { schema });
