"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPhotosForBookingIds } from "@/app/actions";
import type { Booking, Person, Photo } from "@/lib/data";
import {
  adjacentMonth,
  bookingOverlapsRange,
  monthHref,
  MONTH_NAMES,
  paddedCalendarMonthRange,
} from "@/lib/calendar";
import type { PaymentConfig } from "@/lib/payment";
import { Calendar } from "@/components/Calendar";
import { IdentityPicker } from "@/components/IdentityPicker";
import { MonthSwiper } from "@/components/MonthSwiper";
import { MonthTitle } from "@/components/MonthTitle";
import { ThemeToggle } from "@/components/ThemeToggle";

type LoadedPhotoMonth = {
  status: "loading" | "loaded";
  bookingIds: string[];
};

function parseMonthParam(value: string | null): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, rawMonth] = value.split("-").map(Number);
  if (rawMonth < 1 || rawMonth > 12) return null;
  return { year, month: rawMonth - 1 };
}

function photoMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function visiblePhotoBookingIds(
  year: number,
  month: number,
  bookings: Booking[],
): string[] {
  const range = paddedCalendarMonthRange(year, month);
  return bookings
    .filter((booking) => bookingOverlapsRange(booking, range.start, range.end))
    .map((booking) => booking.id);
}

export function CalendarShell({
  initialYear,
  initialMonth,
  loadedYear,
  bookings,
  people,
  me,
  today,
  paymentConfig,
  showMaryMode,
  footerLinkText,
  footerSuffix,
  siteRepoUrl,
}: {
  initialYear: number;
  initialMonth: number;
  loadedYear: number;
  bookings: Booking[];
  people: Person[];
  me: Person;
  today: string;
  paymentConfig: PaymentConfig | null;
  showMaryMode: boolean;
  footerLinkText: string;
  footerSuffix: string;
  siteRepoUrl: string;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [photoCache, setPhotoCache] = useState<Map<string, Photo>>(
    () => new Map(),
  );
  const [loadedPhotoMonths, setLoadedPhotoMonths] = useState<
    Map<string, LoadedPhotoMonth>
  >(() => new Map());
  const [calendarAnimating, setCalendarAnimating] = useState(false);
  const animationTimer = useRef<number | null>(null);
  const currentPhotoIds = useMemo(
    () => visiblePhotoBookingIds(visible.year, visible.month, bookings),
    [bookings, visible.month, visible.year],
  );
  const currentPhotos = useMemo(() => {
    const ids = new Set(currentPhotoIds);
    return Array.from(photoCache.values()).filter((photo) =>
      ids.has(photo.bookingId),
    );
  }, [currentPhotoIds, photoCache]);

  const navigateMonth = useCallback(
    (target: { year: number; month: number }) => {
      if (target.year !== loadedYear) {
        router.push(monthHref(target.year, target.month));
        return;
      }

      setVisible(target);
      window.history.pushState(null, "", monthHref(target.year, target.month));
      setCalendarAnimating(false);
      window.requestAnimationFrame(() => setCalendarAnimating(true));
      if (animationTimer.current != null) {
        window.clearTimeout(animationTimer.current);
      }
      animationTimer.current = window.setTimeout(
        () => setCalendarAnimating(false),
        520,
      );
    },
    [loadedYear, router],
  );

  useEffect(() => {
    return () => {
      if (animationTimer.current != null) {
        window.clearTimeout(animationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    function onPopState() {
      const target = parseMonthParam(
        new URLSearchParams(window.location.search).get("m"),
      );
      if (!target) return;
      if (target.year === loadedYear) {
        setVisible(target);
      } else {
        router.push(monthHref(target.year, target.month));
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadedYear, router]);

  const loadPhotosForMonth = useCallback(
    async (year: number, month: number) => {
      const key = photoMonthKey(year, month);
      const bookingIds = visiblePhotoBookingIds(year, month, bookings);
      if (bookingIds.length === 0) {
        setLoadedPhotoMonths((current) => {
          const next = new Map(current);
          next.set(key, { status: "loaded", bookingIds });
          return next;
        });
        return;
      }

      const existing = loadedPhotoMonths.get(key);
      if (
        existing?.status === "loading" ||
        (existing?.status === "loaded" &&
          bookingIds.every((id) => existing.bookingIds.includes(id)))
      ) {
        return;
      }

      setLoadedPhotoMonths((current) => {
        const next = new Map(current);
        next.set(key, { status: "loading", bookingIds });
        return next;
      });

      const result = await fetchPhotosForBookingIds(bookingIds);
      if ("photos" in result) {
        setPhotoCache((current) => {
          const next = new Map(current);
          for (const photo of result.photos) next.set(photo.id, photo);
          return next;
        });
      }
      setLoadedPhotoMonths((current) => {
        const next = new Map(current);
        next.set(key, { status: "loaded", bookingIds });
        return next;
      });
    },
    [bookings, loadedPhotoMonths],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhotosForMonth(visible.year, visible.month);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPhotosForMonth, visible.month, visible.year]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = adjacentMonth(visible.year, visible.month, "next");
      const prev = adjacentMonth(visible.year, visible.month, "prev");
      if (next.year === loadedYear) void loadPhotosForMonth(next.year, next.month);
      if (prev.year === loadedYear) void loadPhotosForMonth(prev.year, prev.month);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadPhotosForMonth, loadedYear, visible.month, visible.year]);

  return (
    <main className="flex-1 px-4 sm:px-10 pt-4 sm:pt-8 pb-4 sm:pb-6">
      <MonthSwiper
        year={visible.year}
        month={visible.month}
        onNavigateMonth={navigateMonth}
      />
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 sm:mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:gap-8">
          <MonthTitle
            month={visible.month}
            months={MONTH_NAMES}
            className="text-[52px] font-semibold leading-[0.88] tracking-[-0.05em] sm:tracking-[-0.06em]"
          />
          <div className="flex flex-col items-end gap-2 sm:gap-6">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <IdentityPicker
                people={people}
                currentId={me.id}
                showMaryMode={showMaryMode}
              />
            </div>
            <div className="inline-flex items-center gap-2.5 sm:gap-3.5 pb-0 sm:pb-1.5">
              <YearArrow
                href={monthHref(visible.year - 1, visible.month)}
                label="previous year"
              >
                ‹
              </YearArrow>
              <span
                key={`year-${visible.year}`}
                className="text-[18px] sm:text-[22px] font-medium tabular-nums tracking-[-0.01em] animate-blur-fade"
              >
                {visible.year}
              </span>
              <YearArrow
                href={monthHref(visible.year + 1, visible.month)}
                label="next year"
              >
                ›
              </YearArrow>
            </div>
          </div>
        </header>

        <nav className="mb-0 sm:mb-0 flex items-center justify-between gap-1 pb-2 sm:pb-2 text-[13px] sm:text-[12px] overflow-x-auto">
          {MONTH_NAMES.map((name, idx) => {
            const isCurrent = idx === visible.month;
            return (
              <button
                key={name}
                type="button"
                onClick={() => navigateMonth({ year: visible.year, month: idx })}
                className={
                  isCurrent
                    ? "rounded-full bg-ink px-3 sm:px-2.5 py-1.5 sm:py-1 font-medium text-paper shadow-control shrink-0"
                    : "rounded-full px-2 sm:px-1.5 py-1.5 sm:py-1 text-muted transition-colors hover:text-ink shrink-0"
                }
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </nav>

        <div className={calendarAnimating ? "animate-blur-fade" : undefined}>
          <Calendar
            year={visible.year}
            month={visible.month}
            initialBookings={bookings}
            initialPhotos={currentPhotos}
            people={people}
            meId={me.id}
            today={today}
            paymentConfig={paymentConfig}
          />
        </div>

        <footer className="mt-16 sm:mt-24 flex items-center justify-center text-[12px] text-muted">
          <Link
            href={siteRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink"
          >
            {footerLinkText}
          </Link>
          {footerSuffix ? <span className="ml-1">{footerSuffix}</span> : null}
        </footer>
      </div>
    </main>
  );
}

function YearArrow({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-rule bg-paper/70 text-[13px] text-muted shadow-control transition-colors hover:border-ink hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}
