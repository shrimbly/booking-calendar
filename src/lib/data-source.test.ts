import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => {
  throw new Error("DB queries should not be imported in demo mode");
});

describe("demo data source", () => {
  it("loads calendar data without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { fetchCalendarData } = await import("./data-source");
    const data = await fetchCalendarData(2026, 4);

    expect(data.connected).toBe(false);
    expect(data.people.length).toBeGreaterThan(0);
    expect(data.bookings.length).toBeGreaterThan(0);
    expect(data.photos).toEqual([]);
  });

  it("loads year calendar data without photos in demo mode", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { fetchCalendarYearData } = await import("./data-source");
    const data = await fetchCalendarYearData(2026);

    expect(data.connected).toBe(false);
    expect(data.people.length).toBeGreaterThan(0);
    expect(data.bookings.map((booking) => booking.id)).toContain("seed-tom-1");
    expect(data).not.toHaveProperty("photos");
  });

  it("loads Mary data without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { fetchMaryData } = await import("./data-source");
    const data = await fetchMaryData({ costPerNight: 50, currency: "NZD", accountName: "", accountNumber: "", reference: "", note: "" });

    expect(data.connected).toBe(false);
    expect(data.stays.length).toBeGreaterThan(0);
    expect(data.stays[0]).toMatchObject({
      currency: "NZD",
      paymentSettled: false,
    });
  });
});
