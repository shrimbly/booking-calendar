"use client";

import { useState, useTransition } from "react";
import { setBookingPaymentSettled } from "@/app/actions";
import type { MaryStay } from "@/db/queries";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtDay(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTH_SHORT[month - 1]}`;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(Number.isInteger(value) ? 0 : 2)}`;
  }
}

export function MaryChecklist({
  stays,
}: {
  stays: MaryStay[];
}) {
  const [optimistic, setOptimistic] = useState(stays);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string, settled: boolean) {
    setError(null);
    setSavingId(id);
    setOptimistic((rows) =>
      rows.map((stay) =>
        stay.id === id ? { ...stay, paymentSettled: settled } : stay,
      ),
    );
    startTransition(async () => {
      const result = await setBookingPaymentSettled({ id, settled });
      if ("error" in result) {
        setError(result.error);
        setOptimistic(stays);
      }
      setSavingId(null);
    });
  }

  const openStays = optimistic.filter((stay) => !stay.paymentSettled);
  const settledStays = optimistic.filter((stay) => stay.paymentSettled);

  if (stays.length === 0) {
    return (
      <p className="mt-10 text-[13px] text-muted">
        No stays yet. Mary mode is ready when the calendar fills up.
      </p>
    );
  }

  return (
    <div className="mt-8 border-t border-ink">
      {error ? (
        <p className="my-4 rounded-[8px] border border-rule bg-soft px-3 py-2 text-[12px] text-ink">
          {error}
        </p>
      ) : null}
      <StayRows
        stays={openStays}
        savingId={savingId}
        isPending={isPending}
        onToggle={toggle}
      />
      {settledStays.length > 0 ? (
        <div className={openStays.length > 0 ? "border-t border-soft" : ""}>
          <button
            type="button"
            onClick={() => setShowSettled((value) => !value)}
            className="flex w-full items-center justify-between py-3 text-left text-[12px] font-medium text-muted transition-colors hover:text-ink"
            aria-expanded={showSettled}
          >
            <span>
              Paid stays{" "}
              <span className="font-normal text-faint">
                ({settledStays.length})
              </span>
            </span>
            <span
              className={[
                "text-[12px] text-faint transition-transform",
                showSettled ? "rotate-180" : "",
              ].join(" ")}
            >
              ▾
            </span>
          </button>
          {showSettled ? (
            <StayRows
              stays={settledStays}
              savingId={savingId}
              isPending={isPending}
              onToggle={toggle}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StayRows({
  stays,
  savingId,
  isPending,
  onToggle,
}: {
  stays: MaryStay[];
  savingId: string | null;
  isPending: boolean;
  onToggle: (id: string, settled: boolean) => void;
}) {
  return (
    <div className="divide-y divide-soft">
      {stays.map((stay) => (
        <label
          key={stay.id}
          className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-4"
        >
          <input
            type="checkbox"
            checked={stay.paymentSettled}
            disabled={isPending && savingId === stay.id}
            onChange={(event) => onToggle(stay.id, event.currentTarget.checked)}
            className="h-4 w-4 accent-ink"
          />
          <span className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
            <span className="block truncate text-[14px] font-medium text-ink">
              {stay.personName}
            </span>
            <span className="block text-[12px] text-muted">
              {fmtDay(stay.start)} to {fmtDay(stay.end)} · {stay.nights} night
              {stay.nights === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-[13px] font-medium tabular-nums text-ink">
            {stay.cost == null
              ? "No cost"
              : formatMoney(stay.cost, stay.currency)}
          </span>
          <span className="hidden text-[11px] text-muted sm:block">
            {stay.paymentSettled ? "paid" : "open"}
          </span>
        </label>
      ))}
    </div>
  );
}
