"use client"
import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import HoldToAnimate from "@/components/HoldToAnimate";
import MobileMenu from "@/components/MobileMenu";

// Leave `component` out for a slot that's still being made — it shows as "soon".
type Stuff = { name: string; component?: React.ReactNode };

const STUFF: Stuff[] = [
  { name: "Hold button", component: <HoldToAnimate /> },
  { name: "Mobile menu", component: <MobileMenu /> },
  { name: "Untitled" },
  { name: "Untitled" },
];

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
            <div className="flex aspect-[472/516] items-center justify-center overflow-hidden rounded-[28px] bg-[#F2F2F2]">
              {item.component ?? <span className="text-sm text-neutral-400">soon</span>}
            </div>
            <p className={`mt-3 px-1 text-sm tracking-tight ${item.component ? "text-neutral-800" : "text-neutral-400"}`}>
              {item.name}
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
