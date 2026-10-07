"use client"
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

// The phone menu from useiota.space/work, on its own: a chevron that flips, and
// links that drop out of it as separate bubbles.
const LINKS = ["Services", "Our works", "Journal"];

const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    // nudged up so the button and its open bubbles sit centred in the card together
    <div ref={ref} className="relative -translate-y-14">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md transition-colors hover:bg-white cursor-pointer"
      >
        <motion.span
          className="flex"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={2.5} />
        </motion.span>
      </button>

      {/* Each link is its own bubble, sized to its label and pinned to the right
          under the chevron. They spring out of the button one after another
          (scaling from their top-right corner) and fold back in reverse. */}
      <AnimatePresence>
        {open && (
          <motion.ul
            className="absolute top-full right-0 mt-2 flex flex-col items-end gap-1.5"
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { transition: { staggerChildren: 0.05 } },
              closed: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
            }}
          >
            {LINKS.map((label) => (
              <motion.li
                key={label}
                style={{ transformOrigin: "top right" }}
                variants={{
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
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-white/85 px-5 text-[15px] font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_24px_-12px_rgba(10,30,70,0.35)] backdrop-blur-xl transition-colors active:bg-white cursor-pointer"
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

export default MobileMenu;
