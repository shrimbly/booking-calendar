import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT b.id, p.first_name AS person, b.start_date, b.end_date, b.created_at
    FROM bookings b
    JOIN people p ON p.id = b.person_id
    ORDER BY b.created_at
  `;
  console.table(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
