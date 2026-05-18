"use server";

import { and, eq, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBooking(input: {
  personId: string;
  start: string;
  end: string;
}): Promise<{ id: string } | { error: string }> {
  if (!ISO_DATE.test(input.start) || !ISO_DATE.test(input.end)) {
    return { error: "Invalid date format" };
  }
  if (input.start > input.end) {
    return { error: "Start date is after end date" };
  }

  // Server-side conflict check: any booking whose range overlaps [start, end]
  // overlap if existing.start <= input.end AND existing.end >= input.start
  const conflicts = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        lte(bookings.startDate, input.end),
        gte(bookings.endDate, input.start),
      ),
    )
    .limit(1);

  if (conflicts.length > 0) {
    return { error: "Those dates overlap an existing stay" };
  }

  const id = crypto.randomUUID();
  await db.insert(bookings).values({
    id,
    personId: input.personId,
    startDate: input.start,
    endDate: input.end,
  });

  revalidatePath("/");
  return { id };
}

export async function deleteBooking(id: string): Promise<{ ok: true } | { error: string }> {
  await db.delete(bookings).where(eq(bookings.id, id));
  revalidatePath("/");
  return { ok: true };
}
