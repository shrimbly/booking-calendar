import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { PEOPLE, BOOKINGS } from "../lib/data";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
}

const conn = neon(url);
const db = drizzle(conn, { schema });

async function main() {
  console.log("🌱 Seeding…");

  // Clear existing rows in dependency order
  await db.execute(sql`TRUNCATE TABLE ${schema.bookings} RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.people} RESTART IDENTITY CASCADE`);

  await db.insert(schema.people).values(
    PEOPLE.map((p) => ({
      id: p.id,
      firstName: p.first,
      color: p.color,
    })),
  );

  await db.insert(schema.bookings).values(
    BOOKINGS.map((b) => ({
      id: b.id,
      personId: b.personId,
      startDate: b.start,
      endDate: b.end,
    })),
  );

  console.log(
    `   inserted ${PEOPLE.length} people and ${BOOKINGS.length} bookings`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
