"use client";

import {
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

type OptimisticBookingAction =
  | { type: "add"; booking: Booking }
  | { type: "remove"; id: string }
  | { type: "update"; booking: Booking };

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
  const [optimisticBookings, setOptimisticBookings] =
    useState<Booking[]>(initialBookings);

  function dispatchOptimisticBooking(action: OptimisticBookingAction) {
    setOptimisticBookings((state) => {
      if (action.type === "add") return [...state, action.booking];
      if (action.type === "remove")
        return state.filter((booking) => booking.id !== action.id);
      if (action.type === "update") {
        return state.map((booking) =>
          booking.id === action.booking.id ? action.booking : booking,
        );
      }
      return state;
    });
  }

  function saveBooking(start: string, end: string, id: string | null) {
    setServerError(null);
    startBookingTransition(async () => {
      if (id) {
        dispatchOptimisticBooking({
          type: "update",
          booking: { id, personId: meId, start, end },
        });
        const result = await updateBooking({ id, start, end });
        if ("error" in result) {
          setServerError(result.error);
        }
        return;
      }

      const optimisticId = crypto.randomUUID();
      dispatchOptimisticBooking({
        type: "add",
        booking: {
          id: optimisticId,
          personId: meId,
          start,
          end,
        },
      });
      const result = await createBooking({ start, end });
      if ("error" in result) {
        dispatchOptimisticBooking({ type: "remove", id: optimisticId });
        setServerError(result.error);
      } else {
        dispatchOptimisticBooking({
          type: "update",
          booking: { id: result.id, personId: meId, start, end },
        });
      }
    });
  }

  function removeBooking(id: string) {
    setServerError(null);
    startBookingTransition(async () => {
      dispatchOptimisticBooking({ type: "remove", id });
      const result = await deleteBookingAction(id);
      if ("error" in result) {
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
