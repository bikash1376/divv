"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TextMorph } from "torph/react";

// Tailwind neutral palette, violet-400 accent.
const PAGE = "oklch(14.5% 0 0)"; // neutral-950
const SURFACE = "oklch(20.5% 0 0)"; // neutral-900
const BORDER = "oklch(26.9% 0 0)"; // neutral-800
const CHECK_RING = "oklch(37.1% 0 0)"; // neutral-700
const MUTED = "oklch(70.8% 0 0)"; // neutral-400
const ACTIVE = "oklch(98.5% 0 0)"; // neutral-50
const CHECK_ON = "oklch(70.2% 0.183 293.541)"; // violet-400

const CARD_WIDTH = 296;
// Shared feel for every Torph text morph on the page.
const MORPH = { duration: 350, ease: "cubic-bezier(0.19, 1, 0.22, 1)" } as const;

type ChainId = "ethereum" | "base" | "polygon" | "optimism";
type IconProps = { className?: string };

// Dark-gray Ethereum mark with a white diamond, as in the reference.
function EthereumIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#454a54" />
      <g fill="#fff" fillRule="nonzero">
        <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
        <path d="M16.498 4L9 16.22l7.498-3.35z" />
        <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
        <path d="M16.498 27.995v-6.028L9 17.616z" />
        <path fillOpacity=".2" d="m16.498 20.573l7.497-4.353l-7.497-3.348z" />
        <path fillOpacity=".602" d="m9 16.22l7.498 4.353v-7.701z" />
      </g>
    </svg>
  );
}

// Round Base mark: blue disc, white ring, bar from the left edge to the centre.
function BaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#0052ff" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.4" />
      <rect x="7" y="14.8" width="9.5" height="2.4" rx="1.2" fill="#fff" />
    </svg>
  );
}

function PolygonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden>
      <circle cx="18" cy="18" r="18" fill="#8247e5" />
      <path
        fill="#fff"
        d="M24.172 13.954c-.438-.25-1.002-.25-1.504 0l-3.509 2.068l-2.38 1.316l-3.447 2.068c-.439.25-1.003.25-1.504 0l-2.695-1.63a1.530 1.530 0 0 1-.752-1.315v-3.133c0-.502.25-1.003.752-1.316l2.695-1.567c.438-.25 1.002-.25 1.504 0l2.694 1.630c.439.25.752.751.752 1.315v2.068l2.381-1.378v-2.130c0-.502-.25-1.004-.752-1.317l-5.013-2.945c-.438-.25-1.002-.25-1.504 0l-5.138 3.008c-.501.25-.752.752-.752 1.253v5.890c0 .502.25 1.003.752 1.316l5.076 2.946c.438.25 1.002.25 1.504 0l3.446-2.006l2.381-1.378l3.447-2.006c.438-.25 1.002-.25 1.504 0l2.694 1.567c.439.25.752.752.752 1.316v3.133c0 .501-.25 1.003-.752 1.316l-2.632 1.567c-.438.25-1.002.25-1.504 0l-2.694-1.567a1.530 1.530 0 0 1-.752-1.316v-2.005L16.840 22.100v2.067c0 .502.25 1.003.752 1.316l5.075 2.946c.439.25 1.003.25 1.504 0l5.076-2.946c.439-.25.752-.752.752-1.316v-5.953c0-.5-.25-1.002-.752-1.316l-5.076-2.945z"
      />
    </svg>
  );
}

// Round Optimism mark: red disc, thin white ring, a white disc split by an
// S-curve, and a red diamond in the middle.
function OptimismIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#ff0420" />
      <circle cx="16" cy="16" r="12.6" fill="none" stroke="#fff" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="9.6" fill="#fff" />
      <path fill="#ff0420" d="M16 6.4A9.6 9.6 0 0 1 16 25.6A4.8 4.8 0 0 0 16 16A4.8 4.8 0 0 1 16 6.4Z" />
      <path fill="#ff0420" d="M16 13.2L18.8 16L16 18.8L13.2 16Z" />
    </svg>
  );
}

const CHAINS: { id: ChainId; name: string; Icon: (p: IconProps) => ReactNode }[] = [
  { id: "ethereum", name: "Ethereum", Icon: EthereumIcon },
  { id: "base", name: "Base", Icon: BaseIcon },
  { id: "polygon", name: "Polygon", Icon: PolygonIcon },
  { id: "optimism", name: "Optimism", Icon: OptimismIcon },
];
const ALL_IDS = CHAINS.map((c) => c.id);
const byId = Object.fromEntries(CHAINS.map((c) => [c.id, c])) as Record<ChainId, (typeof CHAINS)[number]>;

// Static 2x2 of the four marks, no tile behind (card's "All Chains" row).
function ChainGrid() {
  return (
    <span className="grid h-6 w-6 shrink-0 grid-cols-2 gap-[2px]" aria-hidden>
      {CHAINS.map(({ id, Icon }) => (
        <Icon key={id} className="h-full w-full" />
      ))}
    </span>
  );
}

// ---- Animated icon cluster for the trigger --------------------------------

const BOX = 24; // cluster box, px
const BASE = 24; // icons render at this size and are scaled to fit each slot

type Slot = { x: number; y: number; size: number };

// Where each icon sits for a given selection count.
function slotsFor(count: number, grid: boolean): Slot[] {
  if (grid) {
    const s = 11;
    const b = BOX - s;
    return [
      { x: 0, y: 0, size: s },
      { x: b, y: 0, size: s },
      { x: 0, y: b, size: s },
      { x: b, y: b, size: s },
    ];
  }
  if (count === 1) return [{ x: 0, y: 0, size: 24 }];
  if (count === 2)
    // first shrinks to the top-left, second sits diagonally over its bottom-right
    return [
      { x: 0, y: 0, size: 16 },
      { x: 8, y: 8, size: 16 },
    ];
  // three: Venn-style, two on top and one centred underneath
  const s = 14;
  return [
    { x: 0, y: 1, size: s },
    { x: BOX - s, y: 1, size: s },
    { x: (BOX - s) / 2, y: BOX - s, size: s },
  ];
}

const spring = { type: "spring", duration: 0.45, bounce: 0.2 } as const;

function IconCluster({ order }: { order: ChainId[] }) {
  const grid = order.length === 0 || order.length === CHAINS.length;
  const shown = grid ? ALL_IDS : order;
  const slots = slotsFor(shown.length, grid);

  return (
    <span className="relative shrink-0" style={{ width: BOX, height: BOX }} aria-hidden>
      <AnimatePresence initial={false}>
        {shown.map((id, i) => {
          const { Icon } = byId[id];
          const slot = slots[i];
          const overlaps = !grid && i > 0;
          return (
            <motion.span
              key={id}
              className="absolute top-0 left-0 rounded-full"
              style={{ width: BASE, height: BASE, originX: 0, originY: 0, zIndex: i + 1 }}
              // new icons emerge from the bottom-right corner
              initial={{ x: BOX - 4, y: BOX - 4, scale: 0, opacity: 0 }}
              animate={{
                x: slot.x,
                y: slot.y,
                scale: slot.size / BASE,
                opacity: 1,
                boxShadow: overlaps ? "-2px -2px 5px rgba(0,0,0,0.55)" : "0px 0px 0px rgba(0,0,0,0)",
              }}
              exit={{ scale: 0, opacity: 0, x: slot.x + slot.size / 2, y: slot.y + slot.size / 2 }}
              transition={spring}
            >
              <Icon className="block h-full w-full" />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

// ---------------------------------------------------------------------------

// Selected: filled accent circle with a white tick. Unselected: empty ring.
function Check({ on }: { on: boolean }) {
  return on ? (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
      style={{ background: CHECK_ON }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  ) : (
    <span
      className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px]"
      style={{ borderColor: CHECK_RING }}
      aria-hidden
    />
  );
}

// The neutral-950 backdrop the dropdown is designed against.
export const CHAIN_MULTISELECT_BG = PAGE;

// `width` sizes the anchor box (and so the card); the button hugs its content.
export default function ChainMultiselect({ width = CARD_WIDTH }: { width?: number | string }) {
  const [open, setOpen] = useState(false);
  // Individually picked chains, in selection order (first pick stays "first"
  // in the cluster). Empty means "All Chains" mode: only that row is checked.
  const [order, setOrder] = useState<ChainId[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const allOn = order.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Picking a chain leaves All mode. Unpicking the last one returns to it, and
  // picking all four individually collapses back into All Chains.
  const toggle = (id: ChainId) =>
    setOrder((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length === CHAINS.length ? [] : next;
    });
  const toggleAll = () => setOrder([]);

  const label =
    allOn || order.length === 0 ? "All Chains" : order.length === 1 ? byId[order[0]].name : `${order.length} Chains`;

  return (
    // Fixed-width anchor: the button hugs its content on the left, so its width
    // changing (label / icon cluster) never moves the anchor or the card.
    <div ref={rootRef} className="relative flex max-w-full flex-col items-start" style={{ width }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-11 cursor-pointer items-center rounded-full border pr-3.5 pl-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        style={{ background: SURFACE, borderColor: BORDER, color: ACTIVE }}
      >
        <IconCluster order={order} />
        <TextMorph {...MORPH} className="ml-2.5 whitespace-nowrap">
          {label}
        </TextMorph>
        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-2.5 h-4 w-4 shrink-0" style={{ color: MUTED }} aria-hidden>
          <path d="M18.2072 9.0428 12.0001 2.83569 5.793 9.0428 7.20721 10.457 12.0001 5.66412 16.793 10.457 18.2072 9.0428ZM5.79285 14.9572 12 21.1643 18.2071 14.9572 16.7928 13.543 12 18.3359 7.20706 13.543 5.79285 14.9572Z" />
        </svg>
      </button>

      {/* Opens with a scale-in; unmounts instantly on close (no exit animation). */}
      {open && (
        <motion.div
          role="listbox"
          aria-multiselectable
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.25, bounce: 0 }}
          className="absolute top-full left-0 z-10 mt-2.5 w-full origin-top-left overflow-hidden rounded-2xl border text-base"
          style={{ background: SURFACE, borderColor: BORDER }}
        >
          <button
            type="button"
            role="option"
            aria-selected={allOn}
            onClick={toggleAll}
            className="flex h-14 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-white/[0.03]"
            style={{ color: allOn ? ACTIVE : MUTED }}
          >
            <Check on={allOn} />
            <ChainGrid />
            All Chains
          </button>
          {/* inset divider */}
          <div className="mx-3.5 h-px" style={{ background: BORDER }} />
          <div className="py-1.5">
            {CHAINS.map(({ id, name, Icon }) => {
              const on = order.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(id)}
                  className="flex h-11 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-white/[0.03]"
                  style={{ color: on ? ACTIVE : MUTED }}
                >
                  <Check on={on} />
                  <Icon className="h-6 w-6 shrink-0" />
                  {name}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
