"use client";

import { useEffect, useRef, useState } from "react";

// Cross-fades between month names so the swap doesn't feel abrupt.
// The outgoing label stays mounted briefly (absolutely positioned over
// the incoming one) and runs a blur-fade-out animation while the
// incoming label runs blur-fade-flat.
export function MonthTitle({
  month,
  months,
  className,
}: {
  month: number;
  months: string[];
  className?: string;
}) {
  const [current, setCurrent] = useState(month);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const rootRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Detect the prop change and snapshot the outgoing label.
  useEffect(() => {
    if (month === current) return;
    const t = window.setTimeout(() => {
      setOutgoing(current);
      setCurrent(month);
    }, 0);
    return () => window.clearTimeout(t);
  }, [month, current]);

  // Schedule the outgoing label's removal on its own effect so the
  // timeout isn't cancelled by the unrelated state changes above.
  useEffect(() => {
    if (outgoing === null) return;
    const t = window.setTimeout(() => setOutgoing(null), 520);
    return () => window.clearTimeout(t);
  }, [outgoing]);

  useEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    const parent = root?.parentElement;
    if (!root || !measure || !parent) return;
    const fitRoot = root;
    const fitParent = parent;
    const fitMeasure = measure;

    function fitTitle() {
      const sibling = fitRoot.nextElementSibling;
      const parentStyle = window.getComputedStyle(fitParent);
      const columnGap = Number.parseFloat(parentStyle.columnGap) || 0;
      const siblingWidth =
        sibling instanceof HTMLElement
          ? sibling.getBoundingClientRect().width
          : 0;
      const available =
        fitParent.getBoundingClientRect().width - siblingWidth - columnGap - 8;
      let widest = 0;
      fitMeasure.style.fontSize = "100px";
      for (const label of months) {
        fitMeasure.textContent = label;
        widest = Math.max(widest, fitMeasure.getBoundingClientRect().width);
      }
      if (available <= 0 || widest <= 0) return;
      const next = Math.min(150, Math.max(40, (available / widest) * 100));
      setFontSize(next);
    }

    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(fitParent);
    return () => observer.disconnect();
  }, [months]);

  return (
    <h1
      ref={rootRef}
      className={`relative m-0 block min-w-0 max-w-full ${className ?? ""}`}
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
    >
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap opacity-0"
      />
      {/* Reserve layout for the current label; outgoing overlays it. */}
      <span
        key={`cur-${current}`}
        className="block whitespace-nowrap"
        style={{
          animation:
            "blur-fade-flat 720ms cubic-bezier(0.16, 0.84, 0.44, 1) both",
        }}
      >
        {months[current]}
      </span>
      {outgoing !== null ? (
        <span
          key={`out-${outgoing}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 whitespace-nowrap"
          style={{
            animation:
              "blur-fade-out 480ms cubic-bezier(0.4, 0, 0.6, 1) both",
          }}
        >
          {months[outgoing]}
        </span>
      ) : null}
    </h1>
  );
}
