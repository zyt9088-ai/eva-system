"use client";

import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** Preferred side; flips automatically when there isn't room. */
  side?: "top" | "bottom";
  /** Delay before it appears, ms. */
  delay?: number;
  /** Extra classes for the inline wrapper — use when the trigger must stay
   *  block-level or shrinkable (e.g. around truncated text). */
  className?: string;
}

type Placement = { top: number; left: number; arrow: number; side: "top" | "bottom" };

const MARGIN = 8; // keeps the bubble clear of the viewport edges
const GAP = 8; // distance between the bubble and its trigger

// Replaces the browser's native `title` bubble, which is slow, unstyled and
// renders left-to-right. Portalled to <body> with fixed positioning so a card's
// `overflow-hidden` can never clip it, and clamped inside the viewport so a
// trigger near the edge still shows the whole label.
export function Tooltip({ content, children, side = "top", delay = 120, className = "" }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Runs after the bubble is in the DOM (so it can be measured) but before the
  // browser paints, so the corrected position is the first one seen.
  useLayoutEffect(() => {
    if (!rect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlacement(null);
      return;
    }
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const { offsetWidth: width, offsetHeight: height } = bubble;
    const centre = rect.left + rect.width / 2;

    // Clamp horizontally, then point the arrow back at the trigger's centre.
    const maxLeft = window.innerWidth - width - MARGIN;
    const left = Math.max(MARGIN, Math.min(centre - width / 2, Math.max(MARGIN, maxLeft)));

    // Flip below the trigger when the bubble wouldn't fit above it.
    const fitsAbove = rect.top - height - GAP >= MARGIN;
    const fitsBelow = rect.bottom + height + GAP <= window.innerHeight - MARGIN;
    const resolved = side === "top" ? (fitsAbove || !fitsBelow ? "top" : "bottom") : fitsBelow || !fitsAbove ? "bottom" : "top";

    setPlacement({
      top: resolved === "top" ? rect.top - height - GAP : rect.bottom + GAP,
      left,
      arrow: Math.max(12, Math.min(centre - left, width - 12)),
      side: resolved,
    });
  }, [rect, side]);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (bounds) setRect(bounds);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRect(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        // Clicking the trigger dismisses the bubble — the event bubbles up from
        // whatever is inside, so no cloneElement gymnastics are needed.
        onClick={hide}
        className={className || "inline-flex"}
      >
        {children}
      </span>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {rect && (
              <motion.div
                ref={bubbleRef}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: placement ? 1 : 0, scale: placement ? 1 : 0.94 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.13, ease: "easeOut" }}
                dir="rtl"
                role="tooltip"
                style={{
                  position: "fixed",
                  // Parked off-screen for the measuring pass, then corrected in
                  // the layout effect above before the first paint.
                  top: placement?.top ?? -9999,
                  left: placement?.left ?? -9999,
                  zIndex: 100000,
                  pointerEvents: "none",
                }}
              >
                <div className="relative px-3 py-1.5 rounded-xl bg-[#0D4435] text-white text-[11px] font-bold leading-relaxed max-w-[280px] text-center shadow-lg shadow-black/25 border border-white/10">
                  {content}
                  <span
                    className={`absolute w-2 h-2 rotate-45 bg-[#0D4435] border-white/10 ${
                      placement?.side === "bottom" ? "-top-1 border-r border-t" : "-bottom-1 border-l border-b"
                    }`}
                    style={{ left: placement?.arrow ?? 0, marginLeft: -4 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
