import { PEOPLE, BOOKINGS } from "./data";
import type { Person, Booking } from "./data";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchCalendarData(
  year: number,
  month: number,
): Promise<{
  people: Person[];
  bookings: Booking[];
  today: string;
  connected: boolean;
}> {
  const today = todayISO();
  if (process.env.DATABASE_URL) {
    const { getPeople, getBookingsForMonth } = await import("@/db/queries");
    const [people, bookings] = await Promise.all([
      getPeople(),
      getBookingsForMonth(year, month),
    ]);
    return { people, bookings, today, connected: true };
  }
  return { people: PEOPLE, bookings: BOOKINGS, today, connected: false };
}
