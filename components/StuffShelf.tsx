"use client"
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import HoldToAnimate from "@/components/HoldToAnimate";
import MobileMenu from "@/components/MobileMenu";
import PanCompare from "@/components/PanCompare";
import ScratchCard, { THEMES } from "@/components/ScratchCard";

// Leave `component` out for a slot that's still being made — it shows as "soon".
// `href` turns the name into a link to the thing's own page.
type Stuff = { name: string; component?: React.ReactNode; href?: string };

const STUFF: Stuff[] = [
  { name: "Hold button", component: <HoldToAnimate /> },
  { name: "Mobile menu", component: <MobileMenu /> },
  { name: "Pan loader", component: <PanCompare /> },
  { name: "Scratch card", component: <ScratchStuff />, href: "/scratch-card" },
  { name: "Untitled" },
];

// matches the pan loader card's control icons
const ICON = "#cfcfcf";

// Phosphor arrows-clockwise (regular)
const REFRESH_ICON =
  "M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h28.69L182.06,73.37a79.56,79.56,0,0,0-56.13-23.43h-.45A79.52,79.52,0,0,0,69.59,72.71,8,8,0,0,1,58.41,61.27a96,96,0,0,1,135,.79L208,76.69V48a8,8,0,0,1,16,0ZM186.41,183.29a80,80,0,0,1-112.47-.66L59.31,168H88a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l14.63,14.63A95.43,95.43,0,0,0,130,222.06h.53a95.36,95.36,0,0,0,67.07-27.33,8,8,0,0,0-11.18-11.44Z";

const SCRATCH_THEMES = Object.keys(THEMES) as (keyof typeof THEMES)[];

// A scratch card with a refresh button that deals a fresh one (remounts it),
// cycling through the colour variants
function ScratchStuff() {
  const [round, setRound] = useState(0);
  return (
    <>
      <ScratchCard
        key={round}
        round={round}
        theme={SCRATCH_THEMES[round % SCRATCH_THEMES.length]}
        refilled={round > 0}
      />
      <button
        type="button"
        aria-label="New scratch card"
        onClick={() => setRound((r) => r + 1)}
        // same bare icon button as the pan loader card's controls
        className="absolute right-3 bottom-3 grid size-9 cursor-pointer place-items-center transition active:scale-90"
        style={{ color: ICON }}
      >
        <motion.svg
          viewBox="0 0 256 256"
          fill="currentColor"
          width={18}
          height={18}
          aria-hidden
          animate={{ rotate: round * 180 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <path d={REFRESH_ICON} />
        </motion.svg>
      </button>
    </>
  );
}

// same column as the hero, so the first card lines up with its left edge
const COLUMN = 820;
const GUTTER = `max(1rem, calc((100% - ${COLUMN}px) / 2))`;
const GAP = 20;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const ArrowButton = ({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof ArrowLeft01Icon;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="flex size-9 items-center justify-center rounded-full bg-[#F2F2F2] text-neutral-800 transition-all hover:bg-[#EAEAEA] active:scale-96 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
  >
    <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
  </button>
);

const StuffShelf = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, []);

  // one card (plus the gap) per click; snapping takes care of the alignment
  const scrollByCard = (direction: 1 | -1) => {
    const el = scroller.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({ left: direction * (card.offsetWidth + GAP), behavior: "smooth" });
  };

  return (
    <motion.section
      id="stuff"
      className="relative bg-[#FBFBFB] py-24"
      style={{ fontFamily: "var(--font-inter)" }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <div className="mx-auto mb-6 flex w-full items-baseline justify-between px-4 tracking-tight" style={{ maxWidth: COLUMN + 32 }}>
        <h2 className="text-lg text-neutral-800">Stuff</h2>
        <span className="text-sm text-neutral-400">little things to poke at</span>
      </div>

      <div
        ref={scroller}
        onScroll={updateArrows}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap: GAP, paddingInline: GUTTER, scrollPaddingInline: GUTTER }}
      >
        {STUFF.map((item, i) => (
          <div key={i} className="w-[min(78vw,360px)] shrink-0 snap-start">
            <div className="group relative flex aspect-[472/516] items-center justify-center overflow-hidden rounded-[28px] bg-[#F2F2F2]">
              {item.component ?? <span className="text-sm text-neutral-400">soon</span>}
            </div>
            <p className={`mt-3 px-1 text-sm tracking-tight ${item.component ? "text-neutral-800" : "text-neutral-400"}`}>
              {item.href ? (
                <Link href={item.href} className="inline-flex items-center gap-0.5 transition-colors hover:text-neutral-500">
                  {item.name}
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
                </Link>
              ) : (
                item.name
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 flex w-full gap-2 px-4" style={{ maxWidth: COLUMN + 32 }}>
        <ArrowButton icon={ArrowLeft01Icon} label="Previous" disabled={!canPrev} onClick={() => scrollByCard(-1)} />
        <ArrowButton icon={ArrowRight01Icon} label="Next" disabled={!canNext} onClick={() => scrollByCard(1)} />
      </div>
    </motion.section>
  );
};

export default StuffShelf;
