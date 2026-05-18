"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Person } from "@/lib/data";
import { setIdentity, updateMyProfile } from "@/app/actions";
import { PALETTE } from "@/lib/palette";

export function IdentityPicker({
  people,
  currentId,
}: {
  people: Person[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"profile" | "switch">("profile");
  const [optimisticId, setOptimisticId] = useState(currentId);
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const [optimisticColor, setOptimisticColor] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const baseCurrent =
    people.find((p) => p.id === optimisticId) ??
    people.find((p) => p.id === currentId) ??
    people[0];

  const current: Person = {
    ...baseCurrent,
    first: optimisticName ?? baseCurrent.first,
    color: optimisticColor ?? baseCurrent.color,
    initial: (optimisticName ?? baseCurrent.first).charAt(0).toUpperCase(),
  };

  // Reset optimistic name/color when the server-side current changes
  useEffect(() => {
    setOptimisticName(null);
    setOptimisticColor(null);
  }, [baseCurrent.id, baseCurrent.first, baseCurrent.color]);

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

  useEffect(() => {
    if (!open) setView("profile");
  }, [open]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1400);
    return () => clearTimeout(t);
  }, [savedFlash]);

  function commitName(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === baseCurrent.first) return;
    setOptimisticName(trimmed);
    setError(null);
    startTransition(async () => {
      const result = await updateMyProfile({ first: trimmed });
      if ("error" in result) {
        setError(result.error);
        setOptimisticName(null);
      } else {
        setSavedFlash(true);
      }
    });
  }

  function pickColor(c: string) {
    if (c === baseCurrent.color) return;
    setOptimisticColor(c);
    setError(null);
    startTransition(async () => {
      const result = await updateMyProfile({ color: c });
      if ("error" in result) {
        setError(result.error);
        setOptimisticColor(null);
      } else {
        setSavedFlash(true);
      }
    });
  }

  function switchTo(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    setOptimisticId(id);
    setOpen(false);
    startTransition(async () => {
      await setIdentity(id);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full border border-rule py-1 pl-1.5 pr-3.5 text-[12px] transition-colors hover:border-ink data-[open=true]:border-ink"
        data-open={open}
      >
        <span
          className="grid h-[26px] w-[26px] place-items-center rounded-full text-[12px] font-medium text-paper transition-colors"
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
          role="dialog"
          aria-label="Your profile"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[304px] overflow-hidden rounded-[12px] border border-rule bg-paper shadow-[0_16px_40px_-16px_rgba(60,40,20,0.18),0_2px_4px_-2px_rgba(60,40,20,0.05)]"
        >
          {view === "profile" ? (
            <ProfileView
              current={current}
              error={error}
              savedFlash={savedFlash}
              isPending={isPending}
              nameInputRef={nameInputRef}
              onCommitName={commitName}
              onPickColor={pickColor}
              onOpenSwitch={() => setView("switch")}
            />
          ) : (
            <SwitchView
              people={people}
              currentId={current.id}
              isPending={isPending}
              onPick={switchTo}
              onBack={() => setView("profile")}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProfileView({
  current,
  error,
  savedFlash,
  isPending,
  nameInputRef,
  onCommitName,
  onPickColor,
  onOpenSwitch,
}: {
  current: Person;
  error: string | null;
  savedFlash: boolean;
  isPending: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onCommitName: (name: string) => void;
  onPickColor: (color: string) => void;
  onOpenSwitch: () => void;
}) {
  return (
    <div className="p-5">
      <div className="mb-5 flex items-center gap-3.5">
        <div
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[20px] font-medium text-paper transition-colors"
          style={{ backgroundColor: current.color }}
        >
          {current.initial}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-faint">
            You
          </div>
          <div className="truncate text-[15px] font-medium">{current.first}</div>
        </div>
      </div>

      <Section label="Your name">
        <input
          ref={nameInputRef}
          type="text"
          key={current.first}
          defaultValue={current.first}
          onBlur={(e) => onCommitName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.currentTarget.value = current.first;
              e.currentTarget.blur();
            }
          }}
          maxLength={64}
          className="w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium tracking-[-0.005em] transition-colors focus:border-ink focus:outline-none"
        />
      </Section>

      <Section label="Colour">
        <div className="grid grid-cols-6 gap-2">
          {PALETTE.map((c) => {
            const isSelected = c === current.color;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onPickColor(c)}
                aria-label={`color ${c}`}
                aria-pressed={isSelected}
                className="grid h-[28px] w-[28px] place-items-center"
              >
                <span
                  className="h-[24px] w-[24px] rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    boxShadow: isSelected
                      ? `0 0 0 2px var(--color-paper), 0 0 0 3.5px ${c}`
                      : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Profile photo">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-[8px] border border-dashed border-rule px-3 py-2.5 text-left text-[12px] text-faint"
          title="Photo upload coming once Vercel Blob is wired up"
        >
          <span className="grid h-[24px] w-[24px] place-items-center rounded-full border border-dashed border-rule text-[14px] leading-none">
            +
          </span>
          <span className="flex-1">Add a photo</span>
          <span className="text-[10px] uppercase tracking-[0.14em]">soon</span>
        </button>
      </Section>

      <div className="-mt-1 mb-2 flex h-[16px] items-center text-[11px]">
        {error ? (
          <span className="italic text-faint">{error}</span>
        ) : savedFlash ? (
          <span className="text-muted">Saved</span>
        ) : isPending ? (
          <span className="text-muted">Saving…</span>
        ) : null}
      </div>

      <div className="-mx-2 border-t border-soft pt-2">
        <button
          type="button"
          onClick={onOpenSwitch}
          className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <span>
            Not {current.first}? <span className="text-faint">Switch person</span>
          </span>
          <span className="text-[14px] leading-none text-faint">›</span>
        </button>
      </div>
    </div>
  );
}

function SwitchView({
  people,
  currentId,
  isPending,
  onPick,
  onBack,
}: {
  people: Person[];
  currentId: string;
  isPending: boolean;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="p-2">
      <button
        type="button"
        onClick={onBack}
        className="mb-1 flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
      >
        <span className="text-[14px] leading-none">‹</span>
        <span>Back</span>
      </button>
      <div className="mx-2 my-1 h-px bg-soft" />
      <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-[0.14em] text-faint">
        Switch to
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {people.map((p) => {
          const isMe = p.id === currentId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={isPending}
              onClick={() => onPick(p.id)}
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
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">
        {label}
      </div>
      {children}
    </div>
  );
}
