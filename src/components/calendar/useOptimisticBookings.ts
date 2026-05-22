"use client";

import {
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createBooking,
  deleteBooking as deleteBookingAction,
  updateBooking,
} from "@/app/actions";
import type { Booking } from "@/lib/data";

export function useOptimisticBookings({
  initialBookings,
  meId,
  setServerError,
}: {
  initialBookings: Booking[];
  meId: string;
  setServerError: Dispatch<SetStateAction<string | null>>;
}) {
  const [isBookingPending, startBookingTransition] = useTransition();
  const [localBookings, setLocalBookings] = useState<Map<string, Booking>>(
    () => new Map(),
  );
  const [removedBookingIds, setRemovedBookingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const optimisticBookings = useMemo(() => {
    const byId = new Map(initialBookings.map((booking) => [booking.id, booking]));
    for (const id of removedBookingIds) byId.delete(id);
    for (const [id, booking] of localBookings) {
      if (!removedBookingIds.has(id)) byId.set(id, booking);
    }
    return Array.from(byId.values());
  }, [initialBookings, localBookings, removedBookingIds]);

  function upsertLocalBooking(booking: Booking) {
    setRemovedBookingIds((current) => {
      if (!current.has(booking.id)) return current;
      const next = new Set(current);
      next.delete(booking.id);
      return next;
    });
    setLocalBookings((current) => {
      const next = new Map(current);
      next.set(booking.id, booking);
      return next;
    });
  }

  function replaceLocalBookingId(tempId: string, booking: Booking) {
    setLocalBookings((current) => {
      const next = new Map(current);
      next.delete(tempId);
      next.set(booking.id, booking);
      return next;
    });
    setRemovedBookingIds((current) => {
      if (!current.has(tempId)) return current;
      const next = new Set(current);
      next.delete(tempId);
      return next;
    });
  }

  function removeLocalBooking(id: string) {
    setLocalBookings((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setRemovedBookingIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function markBookingRemoved(id: string) {
    setRemovedBookingIds((current) => new Set(current).add(id));
    setLocalBookings((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  function restoreRemovedBooking(id: string) {
    setRemovedBookingIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function bookingById(id: string): Booking | undefined {
    return optimisticBookings.find((booking) => booking.id === id);
  }

  function saveBooking(start: string, end: string, id: string | null) {
    setServerError(null);
    if (id) {
      const previous = bookingById(id);
      upsertLocalBooking({ id, personId: meId, start, end });
      startBookingTransition(async () => {
        const result = await updateBooking({ id, start, end });
        if ("error" in result) {
          if (previous) upsertLocalBooking(previous);
          else removeLocalBooking(id);
          setServerError(result.error);
        }
      });
      return;
    }

    const optimisticId = crypto.randomUUID();
    upsertLocalBooking({
      id: optimisticId,
      personId: meId,
      start,
      end,
    });
    startBookingTransition(async () => {
      const result = await createBooking({ start, end });
      if ("error" in result) {
        removeLocalBooking(optimisticId);
        setServerError(result.error);
      } else {
        replaceLocalBookingId(optimisticId, {
          id: result.id,
          personId: meId,
          start,
          end,
        });
      }
    });
  }

  function removeBooking(id: string) {
    setServerError(null);
    markBookingRemoved(id);
    startBookingTransition(async () => {
      const result = await deleteBookingAction(id);
      if ("error" in result) {
        restoreRemovedBooking(id);
        setServerError(result.error);
      }
    });
  }

  return {
    optimisticBookings,
    isBookingPending,
    saveBooking,
    removeBooking,
  };
}
