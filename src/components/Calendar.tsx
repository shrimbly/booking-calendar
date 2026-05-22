"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Booking, Person, Photo } from "@/lib/data";
import { DOW_MON_FIRST } from "@/lib/calendar";
import type { PaymentConfig } from "@/lib/payment";
import {
  ChoiceBar,
  ConfirmBar,
} from "./calendar/Overlays";
import { CalendarGrid } from "./calendar/CalendarGrid";
import {
  buildBookingRows,
  firstVisibleCellByBooking,
} from "./calendar/ribbons";
import { useStayPhotos } from "./calendar/useStayPhotos";
import { CalendarPhotoSheet } from "./calendar/CalendarPhotoSheet";
import { useOptimisticBookings } from "./calendar/useOptimisticBookings";
import { useBookingSelection } from "./calendar/useBookingSelection";
import { ServerErrorToast } from "./calendar/ServerErrorToast";

const RIBBON_EXIT_ANIMATION_MS = 220;
const RIBBON_EXIT_START_DELAY_MS = 80;
const BOOKING_SELECTION_ATTRIBUTE = "data-booking-selection-active";

export function Calendar({
  year,
  month,
  initialBookings,
  initialPhotos,
  people,
  meId,
  today,
  paymentConfig,
}: {
  year: number;
  month: number;
  initialBookings: Booking[];
  initialPhotos: Photo[];
  people: Person[];
  meId: string;
  today: string;
  paymentConfig: PaymentConfig | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectionEditControlsOpen, setSelectionEditControlsOpen] =
    useState(false);
  const [exitingBookingIds, setExitingBookingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const bookingExitTimers = useRef<number[]>([]);
  const {
    optimisticPhotos,
    photosByDate,
    photoContext,
    setPhotoContext,
    photoPending,
    handleUploadPhoto,
    handleDeletePhoto,
  } = useStayPhotos({ initialPhotos, meId, setServerError });
  const {
    optimisticBookings,
    isBookingPending,
    saveBooking: persistBooking,
    removeBooking,
  } = useOptimisticBookings({ initialBookings, meId, setServerError });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const timers = bookingExitTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const me = people.find((p) => p.id === meId);
  const allBookings = optimisticBookings;

  const {
    cells,
    preview,
    previewRows,
    exitingPreviewRows,
    exitingPreviewAvatar,
    baseRowCount,
    scrollRows,
    conflict,
    pickStart,
    pickEnd,
    isDragging,
    actioningId,
    setActioningId,
    editingId,
    paymentReview,
    setPaymentReview,
    setHovered,
    cancel,
    confirm,
    pickDate,
    editBooking,
    clearHovered,
    adjustStart,
    adjustEnd,
    canAdjustStart,
    canAdjustEnd,
  } = useBookingSelection({
    year,
    month,
    bookings: allBookings,
    people,
    me,
    today,
    hasPaymentConfig: Boolean(paymentConfig),
    onSave: persistBooking,
  });

  const bookingRows = useMemo(
    () => buildBookingRows({ bookings: allBookings, cells, people, editingId }),
    [allBookings, cells, people, editingId],
  );

  // For each booking, the iso of the first cell visible in this month —
  // that cell hosts the avatar, so any photo thumbnail there must shift
  // right to clear it.
  const firstVisibleCellByBookingMap = useMemo(
    () => firstVisibleCellByBooking(cells),
    [cells],
  );
  const actioningBooking = actioningId
    ? optimisticBookings.find((booking) => booking.id === actioningId) ?? null
    : null;
  const deletingBooking = deletingId
    ? optimisticBookings.find((booking) => booking.id === deletingId) ?? null
    : null;
  const editingBooking = editingId
    ? optimisticBookings.find((booking) => booking.id === editingId) ?? null
    : null;
  const selectionHasChanges = editingBooking
    ? editingBooking.start !== pickStart || editingBooking.end !== pickEnd
    : true;
  const canShowPaymentReview = paymentReview != null && paymentConfig != null;

  useEffect(() => {
    if (paymentReview && !paymentConfig) {
      setPaymentReview(null);
    }
  }, [paymentReview, paymentConfig, setPaymentReview]);

  useEffect(() => {
    if (pickStart) {
      document.documentElement.setAttribute(BOOKING_SELECTION_ATTRIBUTE, "true");
      return () => {
        document.documentElement.removeAttribute(BOOKING_SELECTION_ATTRIBUTE);
      };
    }
    document.documentElement.removeAttribute(BOOKING_SELECTION_ATTRIBUTE);
    return undefined;
  }, [pickStart]);

  function confirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    setServerError(null);
    setDeletingId(null);
    setActioningId(null);
    const startExitTimer = window.setTimeout(() => {
      setExitingBookingIds((prev) => new Set(prev).add(id));
      const removeTimer = window.setTimeout(() => {
        setExitingBookingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        removeBooking(id);
      }, RIBBON_EXIT_ANIMATION_MS);
      bookingExitTimers.current.push(removeTimer);
    }, RIBBON_EXIT_START_DELAY_MS);
    bookingExitTimers.current.push(startExitTimer);
  }

  useEffect(() => {
    if (!serverError) return;
    const t = setTimeout(() => setServerError(null), 4000);
    return () => clearTimeout(t);
  }, [serverError]);

  useEffect(() => {
    if (!deletingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeletingId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deletingId]);

  if (!me) return null;

  return (
    <>
      <CalendarGrid
        cells={cells}
        dayLabels={DOW_MON_FIRST}
        preview={preview}
        previewRows={previewRows}
        exitingPreviewRows={exitingPreviewRows}
        exitingPreviewAvatar={exitingPreviewAvatar}
        baseRowCount={baseRowCount}
        scrollRows={scrollRows}
        bookingRows={bookingRows}
        photosByDate={photosByDate}
        firstVisibleCellByBooking={firstVisibleCellByBookingMap}
        exitingBookingIds={exitingBookingIds}
        me={me}
        meId={meId}
        pickStart={pickStart}
        pickEnd={pickEnd}
        actioningId={actioningId}
        deletingId={deletingId}
        editingId={editingId}
        previewEditing={
          editingId != null || (pickEnd != null && selectionEditControlsOpen)
        }
        isDragging={isDragging}
        onPointerLeave={clearHovered}
        onHoverDate={setHovered}
        onPickDate={pickDate}
        onSelectBooking={setActioningId}
        onOpenPhotos={(bookingId, date, mode) =>
          setPhotoContext({ bookingId, date, mode })
        }
      />

      {mounted
        ? createPortal(
            <>
              {pickStart || canShowPaymentReview ? (
                <ConfirmBar
                  start={pickStart ?? paymentReview?.start ?? ""}
                  end={pickEnd ?? pickStart ?? paymentReview?.end ?? ""}
                  locked={pickEnd != null || canShowPaymentReview}
                  person={me}
                  conflict={canShowPaymentReview ? null : conflict}
                  onCancel={() => {
                    setSelectionEditControlsOpen(false);
                    if (canShowPaymentReview) {
                      setPaymentReview(null);
                      return;
                    }
                    cancel();
                  }}
                  onConfirm={() => {
                    setSelectionEditControlsOpen(false);
                    if (canShowPaymentReview) {
                      setPaymentReview(null);
                      return;
                    }
                    confirm();
                  }}
                  onAdjustStart={adjustStart}
                  onAdjustEnd={adjustEnd}
                  canAdjustStart={canAdjustStart}
                  canAdjustEnd={canAdjustEnd}
                  pending={isBookingPending}
                  mode={editingId ? "edit" : "create"}
                  hasChanges={canShowPaymentReview ? true : selectionHasChanges}
                  payment={paymentConfig}
                  paymentMode={canShowPaymentReview}
                  onPaymentConfirm={() => setPaymentReview(null)}
                  onEditControlsChange={setSelectionEditControlsOpen}
                />
              ) : actioningId || deletingId ? (
                <ChoiceBar
                  booking={actioningBooking ?? deletingBooking}
                  person={me}
                  deleting={deletingId != null}
                  pending={isBookingPending}
                  onCancel={() => {
                    setActioningId(null);
                    setDeletingId(null);
                  }}
                  onEdit={() => editBooking(actioningBooking)}
                  onDelete={() => {
                    setDeletingId(actioningId);
                  }}
                  onConfirmDelete={confirmDelete}
                />
              ) : null}

              <CalendarPhotoSheet
                context={photoContext}
                bookings={optimisticBookings}
                people={people}
                photos={optimisticPhotos}
                meId={meId}
                pending={photoPending}
                onClose={() => setPhotoContext(null)}
                onUpload={handleUploadPhoto}
                onDelete={handleDeletePhoto}
              />

              <ServerErrorToast
                message={serverError}
                onDismiss={() => setServerError(null)}
              />
            </>,
            document.body,
          )
        : null}
    </>
  );
}
