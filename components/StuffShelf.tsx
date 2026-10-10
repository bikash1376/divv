"use client"
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import HoldToAnimate from "@/components/HoldToAnimate";
import MobileMenu from "@/components/MobileMenu";
import PanCompare from "@/components/PanCompare";
import ScratchCard, { THEMES, type Look } from "@/components/ScratchCard";

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

// Phosphor arrows-clockwise (bold)
const REFRESH_ICON =
  "M228,48V96a12,12,0,0,1-12,12H168a12,12,0,0,1,0-24h19l-7.8-7.8a75.55,75.55,0,0,0-53.32-22.26h-.43A75.49,75.49,0,0,0,72.39,75.57,12,12,0,1,1,55.61,58.41a99.38,99.38,0,0,1,69.87-28.47H126A99.42,99.42,0,0,1,196.2,59.23L204,67V48a12,12,0,0,1,24,0ZM183.61,180.43a75.49,75.49,0,0,1-53.09,21.63h-.43A75.55,75.55,0,0,1,76.77,179.8L69,172H88a12,12,0,0,0,0-24H40a12,12,0,0,0-12,12v48a12,12,0,0,0,24,0V189l7.8,7.8A99.42,99.42,0,0,0,130,226.06h.56a99.38,99.38,0,0,0,69.87-28.47,12,12,0,0,0-16.78-17.16Z";

// the four flat cards from /scratch-card, then every colour in the glossy look
const SCRATCH_DECK: { theme: keyof typeof THEMES; look: Look }[] = [
  ...(["blue", "green", "red", "gold"] as const).map((theme) => ({ theme, look: "flat" as const })),
  ...(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((theme) => ({ theme, look: "glossy" as const })),
];

// A scratch card with a refresh button that deals a fresh one (remounts it),
// cycling through the colour variants
function ScratchStuff() {
  const [round, setRound] = useState(0);
  return (
    <>
      <ScratchCard
        key={round}
        round={round}
        {...SCRATCH_DECK[round % SCRATCH_DECK.length]}
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
