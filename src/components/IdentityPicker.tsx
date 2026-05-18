"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Person } from "@/lib/data";
import { setIdentity } from "@/app/actions";

export function IdentityPicker({
  people,
  currentId,
}: {
  people: Person[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticId, setOptimisticId] = useState(currentId);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const current =
    people.find((p) => p.id === optimisticId) ??
    people.find((p) => p.id === currentId) ??
    people[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full border border-rule py-1 pl-1.5 pr-3.5 text-[12px] transition-colors hover:border-ink data-[open=true]:border-ink"
        data-open={open}
      >
        <span
          className="grid h-[26px] w-[26px] place-items-center rounded-full text-[12px] font-medium text-paper"
          style={{ backgroundColor: current.color }}
        >
          {current.initial}
        </span>
        <span>{current.first}</span>
        <span
          className={
            open
              ? "text-[10px] text-faint rotate-180 transition-transform"
              : "text-[10px] text-faint transition-transform"
          }
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[244px] rounded-[10px] border border-rule bg-paper p-1.5 shadow-[0_12px_32px_-12px_rgba(60,40,20,0.18),0_2px_4px_-2px_rgba(60,40,20,0.05)]"
        >
          <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-faint">
            You are
          </div>
          {people.map((p) => {
            const isMe = p.id === current.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={isMe}
                disabled={isPending}
                onClick={() => {
                  if (p.id === current.id) {
                    setOpen(false);
                    return;
                  }
                  setOptimisticId(p.id);
                  setOpen(false);
                  startTransition(async () => {
                    await setIdentity(p.id);
                  });
                }}
                className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className="grid h-[26px] w-[26px] place-items-center rounded-full text-[11px] font-semibold text-paper"
                  style={{ backgroundColor: p.color }}
                >
                  {p.initial}
                </span>
                <span className="flex-1 font-medium">{p.first}</span>
                {isMe ? (
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
          <div className="mx-2 my-1.5 h-px bg-soft" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
          >
            <span className="grid h-[26px] w-[26px] place-items-center rounded-[5px] border border-dashed border-rule text-[14px] leading-none text-faint">
              +
            </span>
            <span>Add someone</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
