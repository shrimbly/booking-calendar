"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, Person } from "@/lib/data";
import { DOW_MON_FIRST, buildMonthCells } from "@/lib/calendar";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DOW_SUN_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${DOW_SUN_FIRST[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function nightsBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000));
}

function edgeClasses(isStart: boolean, isEnd: boolean): string {
  if (isStart && isEnd) return "left-1.5 right-1.5 rounded-[6px]";
  if (isStart) return "left-1.5 right-0 rounded-l-[6px]";
  if (isEnd) return "left-0 right-1.5 rounded-r-[6px]";
  return "left-0 right-0";
}

export function Calendar({
  year,
  month,
  initialBookings,
  people,
  meId,
  today,
}: {
  year: number;
  month: number;
  initialBookings: Booking[];
  people: Person[];
  meId: string;
  today: string;
}) {
  const [extraBookings, setExtraBookings] = useState<Booking[]>([]);
  const [pickStart, setPickStart] = useState<string | null>(null);
  const [pickEnd, setPickEnd] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const me = people.find((p) => p.id === meId);

  const allBookings = useMemo(
    () => [...initialBookings, ...extraBookings],
    [initialBookings, extraBookings],
  );

  const cells = useMemo(
    () => buildMonthCells(year, month, allBookings, people, today),
    [year, month, allBookings, people, today],
  );

  const preview = useMemo(() => {
    if (!pickStart) return null;
    let s = pickStart;
    let e = pickStart;
    if (pickEnd) {
      s = pickStart <= pickEnd ? pickStart : pickEnd;
      e = pickStart <= pickEnd ? pickEnd : pickStart;
    } else if (hovered) {
      if (hovered >= pickStart) e = hovered;
      else s = hovered;
    }
    return { start: s, end: e };
  }, [pickStart, pickEnd, hovered]);

  const conflict = useMemo(() => {
    if (!preview) return null;
    for (const b of allBookings) {
      if (preview.start <= b.end && preview.end >= b.start) {
        const p = people.find((q) => q.id === b.personId);
        return p?.first ?? "another stay";
      }
    }
    return null;
  }, [preview, allBookings, people]);

  type RowRibbon = {
    gridRow: number;
    startCol: number;
    endCol: number;
    startCellIso: string;
    roundLeft: boolean;
    roundRight: boolean;
  };

  type RealRow = {
    bookingKey: string;
    color: string;
    initial: string;
    name: string;
    gridRow: number;
    startCol: number;
    endCol: number;
    isBookingStart: boolean;
    roundLeft: boolean;
    roundRight: boolean;
  };

  const realRows = useMemo<RealRow[]>(() => {
    const allRows: RealRow[] = [];
    allBookings.forEach((booking) => {
      const person = people.find((p) => p.id === booking.personId);
      if (!person) return;

      const bookingCells: { iso: string; gridRow: number; col: number }[] = [];
      cells.forEach((c, idx) => {
        if (!c.inMonth) return;
        if (c.iso < booking.start || c.iso > booking.end) return;
        bookingCells.push({
          iso: c.iso,
          gridRow: Math.floor(idx / 7) + 2,
          col: (idx % 7) + 1,
        });
      });
      if (bookingCells.length === 0) return;

      const bookingRows: RealRow[] = [];
      bookingCells.forEach((bc) => {
        const last = bookingRows[bookingRows.length - 1];
        if (last && last.gridRow === bc.gridRow && bc.col === last.endCol) {
          last.endCol = bc.col + 1;
        } else {
          bookingRows.push({
            bookingKey: `${person.id}-${booking.start}-${bc.gridRow}-${bc.col}`,
            color: person.color,
            initial: person.initial,
            name: person.first,
            gridRow: bc.gridRow,
            startCol: bc.col,
            endCol: bc.col + 1,
            isBookingStart: false,
            roundLeft: false,
            roundRight: false,
          });
        }
      });

      const firstCellIso = bookingCells[0].iso;
      const lastCellIso = bookingCells[bookingCells.length - 1].iso;
      bookingRows[0].isBookingStart = firstCellIso === booking.start;
      bookingRows[0].roundLeft = firstCellIso === booking.start;
      bookingRows[bookingRows.length - 1].roundRight =
        lastCellIso === booking.end;

      allRows.push(...bookingRows);
    });
    return allRows;
  }, [allBookings, cells, people]);

  const previewRows = useMemo<RowRibbon[]>(() => {
    if (!preview) return [];
    const inPreviewIso = new Set<string>();
    cells.forEach((c) => {
      if (
        c.inMonth &&
        !c.booking &&
        c.iso >= preview.start &&
        c.iso <= preview.end
      ) {
        inPreviewIso.add(c.iso);
      }
    });
    const rrs: RowRibbon[] = [];
    cells.forEach((c, idx) => {
      if (!inPreviewIso.has(c.iso)) return;
      const gridRow = Math.floor(idx / 7) + 2; // DOW header is row 1
      const col = (idx % 7) + 1;
      const last = rrs[rrs.length - 1];
      if (last && last.gridRow === gridRow && col === last.endCol) {
        last.endCol = col + 1;
      } else {
        rrs.push({
          gridRow,
          startCol: col,
          endCol: col + 1,
          startCellIso: c.iso,
          roundLeft: false,
          roundRight: false,
        });
      }
    });
    rrs.forEach((rr) => {
      const startIdx = cells.findIndex((c) => c.iso === rr.startCellIso);
      const prev = cells[startIdx - 1];
      rr.roundLeft = !prev || !inPreviewIso.has(prev.iso);
      const endIdx = startIdx + (rr.endCol - rr.startCol) - 1;
      const next = cells[endIdx + 1];
      rr.roundRight = !next || !inPreviewIso.has(next.iso);
    });
    return rrs;
  }, [preview, cells]);

  function cancel() {
    setPickStart(null);
    setPickEnd(null);
    setHovered(null);
    setIsDragging(false);
  }

  function cellMouseDown(iso: string, inMonth: boolean, hasBooking: boolean) {
    if (!inMonth || hasBooking || pickEnd) return;
    if (!pickStart) {
      setPickStart(iso);
      setHovered(iso);
      setIsDragging(true);
      return;
    }
    // pickStart already set, second click commits end (swap if before start)
    if (iso === pickStart) return;
    if (iso > pickStart) {
      setPickEnd(iso);
    } else {
      setPickEnd(pickStart);
      setPickStart(iso);
    }
  }

  function commitDragEnd() {
    if (!isDragging || !pickStart || pickEnd) {
      setIsDragging(false);
      return;
    }
    const end = hovered;
    if (!end || end === pickStart) {
      setIsDragging(false);
      return;
    }
    const cell = cells.find((c) => c.iso === end);
    if (!cell || !cell.inMonth || cell.booking) {
      setIsDragging(false);
      return;
    }
    if (end > pickStart) {
      setPickEnd(end);
    } else {
      setPickEnd(pickStart);
      setPickStart(end);
    }
    setIsDragging(false);
  }

  function confirm() {
    if (!pickStart || !pickEnd || conflict || !me) return;
    setExtraBookings((bs) => [
      ...bs,
      {
        id: crypto.randomUUID(),
        personId: meId,
        start: pickStart,
        end: pickEnd,
      },
    ]);
    cancel();
  }

  useEffect(() => {
    if (!pickStart) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickStart]);

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => commitDragEnd();
    const onCancel = () => setIsDragging(false);
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      let cur: Element | null = el;
      while (cur && !cur.hasAttribute("data-iso")) {
        cur = cur.parentElement;
      }
      const iso = cur?.getAttribute("data-iso");
      if (iso && iso !== hovered) setHovered(iso);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, hovered, pickStart, pickEnd, cells]);

  if (!me) return null;

  return (
    <>
      <div
        className="grid grid-cols-7 border-t border-ink select-none"
        onPointerLeave={() => {
          if (!isDragging) setHovered(null);
        }}
      >
        {DOW_MON_FIRST.map((d) => (
          <div
            key={d}
            className="px-3 pt-3.5 pb-4 text-[11px] font-medium text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((c, idx) => {
          const real = c.booking;
          const inPreview =
            preview != null &&
            c.inMonth &&
            !real &&
            c.iso >= preview.start &&
            c.iso <= preview.end;
          const interactive = c.inMonth && !real && !pickEnd;
          const showGhost = interactive && !inPreview;

          return (
            <div
              key={c.iso}
              data-iso={c.iso}
              onPointerEnter={() => setHovered(c.iso)}
              onPointerDown={(e) => {
                e.preventDefault();
                const target = e.target as Element;
                if (target.hasPointerCapture?.(e.pointerId)) {
                  target.releasePointerCapture(e.pointerId);
                }
                cellMouseDown(c.iso, c.inMonth, !!real);
              }}
              style={{
                gridRow: Math.floor(idx / 7) + 2,
                gridColumn: (idx % 7) + 1,
                touchAction: "none",
              }}
              className={[
                "relative min-h-[68px] sm:min-h-[104px] border-t border-soft px-2 pt-2 pb-1.5 sm:px-3 sm:pt-3.5 sm:pb-3",
                interactive ? "cursor-pointer" : "",
                showGhost ? "group" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "relative inline-block text-[14px] sm:text-[18px] leading-none tabular-nums tracking-[-0.01em]",
                  !c.inMonth
                    ? "text-faint"
                    : c.isToday
                      ? "font-semibold text-ink"
                      : "font-medium text-ink",
                ].join(" ")}
              >
                {c.day}
                {c.isToday ? (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-sm bg-ink" />
                ) : null}
              </span>

              {showGhost ? (
                <div className="pointer-events-none absolute bottom-1.5 sm:bottom-2.5 left-1 right-1 sm:left-1.5 sm:right-1.5 flex h-[20px] sm:h-[26px] items-center justify-center rounded-[5px] sm:rounded-[6px] border border-dashed border-rule text-[12px] sm:text-[14px] leading-none text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  +
                </div>
              ) : null}
            </div>
          );
        })}

        {realRows.map((rr) => (
          <div
            key={rr.bookingKey}
            className={[
              "pointer-events-none z-[4] flex h-[20px] sm:h-[26px] items-center self-end overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em] mb-1.5 sm:mb-2.5 pr-1.5 sm:pr-2",
              rr.isBookingStart ? "pl-[30px] sm:pl-[42px]" : "pl-1.5 sm:pl-2",
              rr.roundLeft ? "ml-1 sm:ml-1.5" : "",
              rr.roundRight ? "mr-1 sm:mr-1.5" : "",
              rr.roundLeft && rr.roundRight
                ? "rounded-[5px] sm:rounded-[6px]"
                : rr.roundLeft
                  ? "rounded-l-[5px] sm:rounded-l-[6px]"
                  : rr.roundRight
                    ? "rounded-r-[5px] sm:rounded-r-[6px]"
                    : "",
            ].join(" ")}
            style={{
              gridColumn: `${rr.startCol} / ${rr.endCol}`,
              gridRow: rr.gridRow,
              backgroundColor: `color-mix(in srgb, ${rr.color} 22%, var(--color-paper) 78%)`,
              color: `color-mix(in srgb, ${rr.color} 92%, var(--color-ink) 8%)`,
            }}
          >
            {rr.isBookingStart ? (
              <span className="block truncate">{rr.name}</span>
            ) : null}
          </div>
        ))}

        {realRows
          .filter((rr) => rr.isBookingStart)
          .map((rr) => (
            <div
              key={`av-${rr.bookingKey}`}
              className="pointer-events-none z-[8] grid h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] place-items-center self-end justify-self-start rounded-[5px] sm:rounded-[6px] text-[11px] sm:text-[12px] font-semibold text-paper mb-1.5 sm:mb-2.5 ml-1 sm:ml-1.5"
              style={{
                gridColumn: rr.startCol,
                gridRow: rr.gridRow,
                backgroundColor: rr.color,
              }}
            >
              {rr.initial}
            </div>
          ))}

        {previewRows.map((rr, i) => (
          <div
            key={`pr-${rr.startCellIso}`}
            className={[
              "pointer-events-none z-[5] flex h-[20px] sm:h-[26px] origin-left items-center self-end overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em] opacity-70 animate-ribbon-grow mb-1.5 sm:mb-2.5 pr-1.5 sm:pr-2",
              i === 0 ? "pl-[30px] sm:pl-[42px]" : "pl-1.5 sm:pl-2",
              rr.roundLeft ? "ml-1 sm:ml-1.5" : "",
              rr.roundRight ? "mr-1 sm:mr-1.5" : "",
              rr.roundLeft && rr.roundRight
                ? "rounded-[5px] sm:rounded-[6px]"
                : rr.roundLeft
                  ? "rounded-l-[5px] sm:rounded-l-[6px]"
                  : rr.roundRight
                    ? "rounded-r-[5px] sm:rounded-r-[6px]"
                    : "",
            ].join(" ")}
            style={{
              gridColumn: `${rr.startCol} / ${rr.endCol}`,
              gridRow: rr.gridRow,
              backgroundColor: `color-mix(in srgb, ${me.color} 22%, var(--color-paper) 78%)`,
              color: `color-mix(in srgb, ${me.color} 92%, var(--color-ink) 8%)`,
              animationDelay: `${i * 130}ms`,
            }}
          >
            {i === 0 ? (
              <span className="block truncate">{me.first}</span>
            ) : null}
          </div>
        ))}

        {previewRows[0] ? (
          <div
            key="preview-avatar"
            className="pointer-events-none z-10 grid h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] place-items-center self-end justify-self-start rounded-[5px] sm:rounded-[6px] text-[11px] sm:text-[12px] font-semibold text-paper opacity-70 animate-avatar-pop mb-1.5 sm:mb-2.5 ml-1 sm:ml-1.5"
            style={{
              gridColumn: previewRows[0].startCol,
              gridRow: previewRows[0].gridRow,
              backgroundColor: me.color,
            }}
          >
            {me.initial}
          </div>
        ) : null}
      </div>

      {pickStart ? (
        <ConfirmBar
          start={pickStart}
          end={pickEnd ?? pickStart}
          locked={pickEnd != null}
          person={me}
          conflict={conflict}
          onCancel={cancel}
          onConfirm={confirm}
        />
      ) : null}
    </>
  );
}

function RibbonAndAvatar({
  color,
  initial,
  name,
  isStart,
  isEnd,
  tentative,
  delayMs,
}: {
  color: string;
  initial: string;
  name: string;
  isStart: boolean;
  isEnd: boolean;
  tentative?: boolean;
  delayMs?: number;
}) {
  const delay = tentative && delayMs ? `${delayMs}ms` : undefined;
  return (
    <>
      <div
        className={[
          "pointer-events-none absolute bottom-1.5 sm:bottom-2.5 flex h-[20px] sm:h-[26px] items-center overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em]",
          isStart ? "pl-[30px] sm:pl-[42px] pr-1.5 sm:pr-2" : "px-1.5 sm:px-2",
          edgeClasses(isStart, isEnd),
          tentative ? "origin-left opacity-70 animate-ribbon-grow" : "",
        ].join(" ")}
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 22%, var(--color-paper) 78%)`,
          color: `color-mix(in srgb, ${color} 92%, var(--color-ink) 8%)`,
          animationDelay: delay,
        }}
      >
        {isStart ? <span className="block truncate">{name}</span> : null}
      </div>
      {isStart ? (
        <div
          className={[
            "pointer-events-none absolute bottom-1.5 sm:bottom-2.5 left-1 sm:left-1.5 z-10 grid h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] place-items-center rounded-[5px] sm:rounded-[6px] text-[11px] sm:text-[12px] font-semibold text-paper",
            tentative ? "opacity-70 animate-avatar-pop" : "",
          ].join(" ")}
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>
      ) : null}
    </>
  );
}

function ConfirmBar({
  start,
  end,
  locked,
  person,
  conflict,
  onCancel,
  onConfirm,
}: {
  start: string;
  end: string;
  locked: boolean;
  person: Person;
  conflict: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const nights = nightsBetween(start, end);
  const sameDay = start === end;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-6 z-30 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 rounded-[12px] sm:rounded-[14px] border border-rule bg-paper px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_16px_40px_-16px_rgba(60,40,20,0.18),0_2px_4px_-2px_rgba(60,40,20,0.05)] max-w-[calc(100vw-1.5rem)]">
        <div
          className="grid h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] place-items-center rounded-[5px] sm:rounded-[6px] text-[11px] sm:text-[12px] font-semibold text-paper shrink-0"
          style={{ backgroundColor: person.color }}
        >
          {person.initial}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[12px] sm:text-[13px] font-medium">
            {sameDay ? fmtDay(start) : `${fmtDay(start)} → ${fmtDay(end)}`}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted">
            {locked
              ? `${nights} night${nights === 1 ? "" : "s"} as ${person.first}`
              : `pick an end date · ${person.first}`}
          </span>
        </div>
        {conflict ? (
          <div className="basis-full sm:basis-auto sm:ml-1 sm:max-w-[160px] text-[10px] sm:text-[11px] italic text-faint">
            overlaps {conflict}&rsquo;s stay
          </div>
        ) : null}
        <div className="ml-auto sm:ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px] text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!locked || !!conflict}
            className="rounded-full bg-ink px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
