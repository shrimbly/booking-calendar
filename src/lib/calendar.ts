import type { Booking, Person } from "./data";

export type Cell = {
  iso: string;
  day: number;
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
  monthOffset: number;
  virtualState: "resolved" | "preview" | null;
  booking: {
    id: string;
    person: Person;
    isStart: boolean;
    isEnd: boolean;
  } | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DOW_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function monthHref(year: number, month: number): string {
  return `?m=${year}-${String(month + 1).padStart(2, "0")}`;
}

export function adjacentMonth(
  year: number,
  month: number,
  direction: "next" | "prev",
): { year: number; month: number } {
  if (direction === "next") {
    return {
      year: month + 1 > 11 ? year + 1 : year,
      month: month + 1 > 11 ? 0 : month + 1,
    };
  }
  return {
    year: month - 1 < 0 ? year - 1 : year,
    month: month - 1 < 0 ? 11 : month - 1,
  };
}

export function monthRange(year: number, month: number): {
  start: string;
  end: string;
} {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: iso(start.getFullYear(), start.getMonth(), start.getDate()),
    end: iso(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}

export function paddedCalendarMonthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  return {
    start: monthRange(year, month).start,
    end: monthRange(year, month + 1).end,
  };
}

export function bookingOverlapsRange(
  booking: Booking,
  start: string,
  end: string,
): boolean {
  return booking.start <= end && booking.end >= start;
}

export function buildMonthCells(
  year: number,
  month: number,
  bookings: Booking[],
  people: Person[],
  today: string,
  options: {
    resolvedNextRows?: number;
    includeNextPreviewRow?: boolean;
    selectTrailingNextMonth?: boolean;
  } = {},
): Cell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const maxNextRows = maxNextRowsForMonth(year, month);
  const resolvedNextRows = Math.min(
    maxNextRows,
    Math.max(0, options.resolvedNextRows ?? 0),
  );
  const includeNextPreviewRow =
    !!options.includeNextPreviewRow && resolvedNextRows < maxNextRows;
  const extraRows = resolvedNextRows + (includeNextPreviewRow ? 1 : 0);
  const previewRowIndex = includeNextPreviewRow
    ? Math.ceil(total / 7) + resolvedNextRows
    : null;
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const bookingByIso = buildBookingByIso(bookings);

  const cells: Cell[] = [];
  for (let i = 0; i < total + extraRows * 7; i++) {
    const dayNum = i - startOffset + 1;
    const date = new Date(year, month, dayNum);
    const cellIso = iso(date.getFullYear(), date.getMonth(), date.getDate());
    const inMonth = date.getMonth() === month;
    const monthOffset =
      (date.getFullYear() - year) * 12 + (date.getMonth() - month);
    const rowIndex = Math.floor(i / 7);
    const virtualState =
      rowIndex >= Math.ceil(total / 7)
        ? rowIndex === previewRowIndex
          ? "preview"
          : "resolved"
        : null;
    const selectable =
      inMonth ||
      (monthOffset === 1 &&
        (virtualState === "resolved" ||
          (virtualState === null && !!options.selectTrailingNextMonth)));

    let booking: Cell["booking"] = null;
    if (selectable || monthOffset === 1) {
      const b = bookingByIso.get(cellIso);
      if (b) {
        const person = peopleById.get(b.personId);
        if (person) {
          booking = {
            id: b.id,
            person,
            isStart: cellIso === b.start,
            isEnd: cellIso === b.end,
          };
        }
      }
    }

    cells.push({
      iso: cellIso,
      day: date.getDate(),
      inMonth,
      selectable,
      isToday: cellIso === today,
      monthOffset,
      virtualState,
      booking,
    });
  }
  return cells;
}

function buildBookingByIso(bookings: Booking[]): Map<string, Booking> {
  const map = new Map<string, Booking>();
  for (const booking of bookings) {
    const start = parseIsoDate(booking.start);
    const end = parseIsoDate(booking.end);
    if (!start || !end) continue;
    for (
      let date = start;
      date.getTime() <= end.getTime();
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    ) {
      map.set(iso(date.getFullYear(), date.getMonth(), date.getDate()), booking);
    }
  }
  return map;
}

function parseIsoDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function maxNextRowsForMonth(year: number, month: number): number {
  return rowsBetween(
    lastVisibleBaseDate(year, month),
    new Date(year, month + 2, 0),
  );
}

export function nextRowsNeededForIso(
  year: number,
  month: number,
  value: string,
): number {
  const date = new Date(`${value}T00:00:00`);
  const monthOffset =
    (date.getFullYear() - year) * 12 + (date.getMonth() - month);
  if (monthOffset < 1) return 0;
  if (monthOffset > 1) return maxNextRowsForMonth(year, month);
  return rowsBetween(lastVisibleBaseDate(year, month), date);
}

function lastVisibleBaseDate(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  return new Date(year, month, total - startOffset);
}

function rowsBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil((end.getTime() - start.getTime()) / dayMs);
  return Math.ceil(days / 7);
}
