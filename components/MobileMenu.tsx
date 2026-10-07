"use client"
import { useEffect, useId, useRef, useState } from "react";
import { animate, AnimatePresence, motion, Transition, Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

// The phone menu from useiota.space/work, on its own: a chevron that flips, and
// links that drop out of it as separate bubbles — in a few flavours.
const LINKS = ["Services", "Our works", "Journal"];
const VARIANTS = ["subtle", "gooey", "quick"] as const;
type Variant = (typeof VARIANTS)[number];

// gap between bubbles (and under the button), the same for every variant
const GAP = 6;
const BUBBLE = 44;
// goo blur while the bubbles move; it fades to 0 once they settle, otherwise
// bubbles this close would stay melted together
const GOO_BLUR = 6;

const chevronTransition: Record<Variant, Transition> = {
  subtle: { type: "spring", stiffness: 420, damping: 28 },
  gooey: { type: "spring", stiffness: 300, damping: 14 },
  quick: { duration: 0.12, ease: "easeOut" },
};

const listVariants: Record<Variant, Variants> = {
  subtle: {
    open: { transition: { staggerChildren: 0.05 } },
    closed: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
  },
  gooey: {
    open: { transition: { staggerChildren: 0.07 } },
    closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
  },
  quick: { open: {}, closed: {} },
};

// how each bubble moves; gooey's blob and text layers share the motion, only opacity differs
const bubbleVariants = (variant: Variant, index: number, layer: "blob" | "text" | "full"): Variants => {
  if (variant === "gooey") {
    // start tucked inside the button, so the goo filter stretches them out of it
    const home = -(index + 1) * (BUBBLE + GAP);
    const spring = { type: "spring", stiffness: 260, damping: 18 } as const;
    return {
      open: {
        y: 0,
        scale: 1,
        opacity: 1,
        transition: { ...spring, opacity: { delay: layer === "text" ? 0.12 : 0, duration: 0.15 } },
      },
      closed: {
        y: home,
        scale: 0.6,
        opacity: layer === "text" ? 0 : 1,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.08 } },
      },
    };
  }
  if (variant === "quick") {
    return {
      open: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.12, ease: "easeOut" } },
      closed: { opacity: 0, y: -4, scale: 0.96, transition: { duration: 0.08, ease: "easeIn" } },
    };
  }
  return {
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 520, damping: 32 },
    },
    closed: {
      opacity: 0,
      y: -10,
      scale: 0.85,
      filter: "blur(6px)",
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
    },
  };
};

// "full" is the normal menu. Gooey draws it twice: a "blob" layer of plain white
// shapes under the goo filter (so touching shapes melt together) and a "text"
// layer on top with the labels, which the filter would otherwise smear.
type Layer = "full" | "blob" | "text";

const BUTTON_STYLE: Record<Layer, string> = {
  full: "bg-white/80 text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md transition-colors hover:bg-white",
  blob: "bg-white",
  text: "text-neutral-800",
};
const BUBBLE_STYLE: Record<Layer, string> = {
  full: "bg-white/85 text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_24px_-12px_rgba(10,30,70,0.35)] backdrop-blur-xl transition-colors active:bg-white",
  // the label is still there (invisible) so the blob is exactly the bubble's width
  blob: "bg-white text-transparent",
  text: "text-neutral-800",
};

const MenuLayer = ({
  layer,
  variant,
  open,
  onToggle,
  onPick,
}: {
  layer: Layer;
  variant: Variant;
  open: boolean;
  onToggle: () => void;
  onPick: () => void;
}) => {
  const interactive = layer !== "blob";
  return (
    <div className="flex h-full flex-col items-end" aria-hidden={!interactive || undefined}>
      <button
        type="button"
        tabIndex={interactive ? undefined : -1}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={onToggle}
        className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full cursor-pointer ${BUTTON_STYLE[layer]}`}
      >
        {layer !== "blob" && (
          <motion.span
            className="flex"
            animate={{ rotate: open ? 180 : 0 }}
            transition={chevronTransition[variant]}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={2.5} />
          </motion.span>
        )}
      </button>

      {/* Each link is its own bubble, sized to its label and pinned to the right
          under the chevron. They come out one after another and fold back in reverse. */}
      <AnimatePresence>
        {open && (
          <motion.ul
            className="flex flex-col items-end"
            style={{ marginTop: GAP, gap: GAP }}
            initial="closed"
            animate="open"
            exit="closed"
            variants={listVariants[variant]}
          >
            {LINKS.map((label, i) => (
              <motion.li
                key={label}
                style={{ transformOrigin: variant === "gooey" ? "center right" : "top right" }}
                variants={bubbleVariants(variant, i, layer)}
              >
                <button
                  type="button"
                  tabIndex={interactive ? undefined : -1}
                  onClick={onPick}
                  className={`inline-flex h-11 items-center whitespace-nowrap rounded-full px-5 text-[15px] font-medium cursor-pointer ${BUBBLE_STYLE[layer]}`}
                >
                  {label}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>("subtle");
  const ref = useRef<HTMLDivElement>(null);
  const gooId = `goo-${useId().replace(/:/g, "")}`;
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);

  // Gooey: full blur while the bubbles squeeze out (or back in), then once they've
  // landed it eases to 0 so they come apart into crisp separate bubbles.
  useEffect(() => {
    if (variant !== "gooey") return;
    const set = (v: number) => blurRef.current?.setAttribute("stdDeviation", String(v));
    const from = Number(blurRef.current?.getAttribute("stdDeviation") ?? GOO_BLUR);
    const controls = open
      ? animate(GOO_BLUR, 0, { delay: 0.3, duration: 0.45, ease: "easeOut", onUpdate: set })
      : // quick ramp back up as they start folding in, so they melt into the button
        animate(from, GOO_BLUR, { duration: 0.1, onUpdate: set });
    return () => controls.stop();
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // a tap anywhere outside the button and its bubbles closes the menu
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const layerProps = {
    variant,
    open,
    onToggle: () => setOpen((o) => !o),
    onPick: () => setOpen(false),
  };

  return (
    <>
      {/* blur, then crank up alpha contrast: overlapping soft edges fuse into one shape */}
      <svg aria-hidden className="absolute size-0">
        <filter id={gooId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation={GOO_BLUR} result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      {/* fixed box so opening the menu never shifts the card's layout */}
      <div ref={ref} className="relative h-[220px] w-40">
        {variant === "gooey" ? (
          <>
            <div className="absolute inset-0" style={{ filter: `url(#${gooId})` }}>
              <MenuLayer layer="blob" {...layerProps} />
            </div>
            <div className="absolute inset-0">
              <MenuLayer layer="text" {...layerProps} />
            </div>
          </>
        ) : (
          <MenuLayer layer="full" {...layerProps} />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <div className="flex gap-1 rounded-full bg-white/70 p-1 text-xs">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setOpen(false);
                setVariant(v);
              }}
              className={`rounded-full px-2.5 py-1 transition-colors cursor-pointer ${
                v === variant ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
