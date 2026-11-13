"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// A self-contained popover color picker (no external deps, CSP-safe): a
// saturation/value area, a hue slider, a hex field, quick swatches and, where
// supported, the native eyedropper. Drop-in replacement for `<input type=color>`.

const PRESETS = [
  "#0057fc",
  "#18181b",
  "#ffffff",
  "#71717a",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#0ea5e9",
  "#a3e635",
];

// --- color math -----------------------------------------------------------
type HSV = { h: number; s: number; v: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeHex(hex: string): string | null {
  let s = hex.trim().toLowerCase();
  if (s[0] !== "#") s = `#${s}`;
  if (/^#[0-9a-f]{3}$/.test(s))
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

function hexToRgb(hex: string) {
  const s = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(s.slice(1, 3), 16),
    g: parseInt(s.slice(3, 5), 16),
    b: parseInt(s.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function hsvToRgb({ h, s, v }: HSV) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = (
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  ).map((n) => (n + m) * 255);
  return { r, g, b };
}

const hsvToHex = (hsv: HSV) => {
  const { r, g, b } = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
};

// --- drag helper ----------------------------------------------------------
// Tracks pointer within an element's box, reporting fractional x/y in [0,1].
function useAreaDrag(onMove: (fx: number, fy: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onMove(
        clamp((e.clientX - r.left) / r.width, 0, 1),
        clamp((e.clientY - r.top) / r.height, 0, 1),
      );
    },
    [onMove],
  );
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    handle(e);
    const move = (ev: PointerEvent) => handle(ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return { ref, onPointerDown };
}

// --- popover --------------------------------------------------------------
function ColorPopover({
  value,
  onChange,
  anchor,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  anchor: DOMRect;
  onClose: () => void;
}) {
  const [hsv, setHsv] = useState<HSV>(() => {
    const { r, g, b } = hexToRgb(value);
    return rgbToHsv(r, g, b);
  });
  const [hexText, setHexText] = useState(value);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const set = (next: HSV) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    onChange(hex);
  };

  const { ref: svRef, onPointerDown: svDown } = useAreaDrag((fx, fy) =>
    set({ ...hsv, s: fx, v: 1 - fy }),
  );
  const { ref: hueRef, onPointerDown: hueDown } = useAreaDrag((fx) =>
    set({ ...hsv, h: fx * 360 }),
  );

  // Place near the anchor, flipping above / clamping horizontally to stay on screen.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const w = el.offsetWidth,
      h = el.offsetHeight,
      gap = 8,
      m = 8;
    let left = anchor.right - w;
    let top = anchor.bottom + gap;
    if (top + h > window.innerHeight - m) top = anchor.top - gap - h;
    left = clamp(left, m, window.innerWidth - w - m);
    top = clamp(top, m, window.innerHeight - h - m);
    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const current = hsvToHex(hsv);

  const commitHex = (t: string) => {
    setHexText(t);
    const norm = normalizeHex(t);
    if (norm) {
      const { r, g, b } = hexToRgb(norm);
      setHsv(rgbToHsv(r, g, b));
      onChange(norm);
    }
  };

  const eyedrop = async () => {
    const ED = (
      window as unknown as {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (!ED) return;
    try {
      const { sRGBHex } = await new ED().open();
      commitHex(sRGBHex);
    } catch {}
  };

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div
      ref={panelRef}
      role="dialog"
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-60 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {/* Saturation / value area */}
      <div
        ref={svRef}
        onPointerDown={svDown}
        className="relative h-32 w-full cursor-crosshair touch-none overflow-hidden rounded-lg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`,
        }}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: current,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={hueDown}
        className="relative mt-3 h-3 w-full cursor-pointer touch-none rounded-full"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: hueHex }}
        />
      </div>

      {/* Hex + swatch + eyedropper */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-md border border-neutral-200"
          style={{ background: current }}
        />
        <input
          value={hexText}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck={false}
          className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] uppercase outline-none focus:border-neutral-400"
        />
        {hasEyeDropper && (
          <button
            onClick={eyedrop}
            title="Pick from screen"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m2 22 1-1h3l9-9" />
              <path d="M3 21v-3l9-9" />
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick swatches */}
      <div className="mt-3 grid grid-cols-8 gap-1.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => commitHex(c)}
            title={c}
            className={`h-5 w-full rounded border transition-transform hover:scale-110 ${
              current.toLowerCase() === c.toLowerCase()
                ? "border-neutral-900"
                : "border-neutral-200"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorSwatch({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open && btnRef.current)
      setAnchor(btnRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Pick color"
        className={cn(
          "relative h-5 w-8 cursor-pointer overflow-hidden rounded border border-neutral-200",
          className,
        )}
      >
        <span className="absolute inset-0" style={{ background: value }} />
      </button>
      {open &&
        anchor &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onPointerDown={() => setOpen(false)}
            />
            <ColorPopover
              value={value}
              onChange={onChange}
              anchor={anchor}
              onClose={() => setOpen(false)}
            />
          </>,
          document.body,
        )}
    </>
  );
}
