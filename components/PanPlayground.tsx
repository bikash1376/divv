"use client"
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { PanFrame, panEndAt, type Kind } from "@/components/PanLoader";
import { SCENES, SceneArt, type Look } from "@/components/tossScenes";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const MORPH = { type: "spring", stiffness: 240, damping: 30 } as const;

/* ---------------------------------------------------------------- */
/* Options. Each axis is independent, so anything mixes with anything */
/* ---------------------------------------------------------------- */

const PALETTES = {
  wireframe: { label: "Wireframe", colors: Array(5).fill("#d4d4d4"), ink: "#d4d4d4", bg: "#FFFFFF" },
  pop: { label: "Pop", colors: ["#FF5A36", "#FFC21A", "#2F6BFF", "#FF7AC8", "#18C27A"], ink: "#1d1b19", bg: "#F2F2F2" },
  material: { label: "Material", colors: ["#F2B8B5", "#FDD663", "#A8C7FA", "#D0BCFF", "#A8DAB5"], ink: "#6750A4", bg: "#F7F2FA" },
  kit: { label: "Kit", colors: ["#FF6B9A", "#FF9F1C", "#7B61FF", "#2EC4B6", "#FFD60A"], ink: "#2b2118", bg: "#FFF8EC" },
};
type PaletteId = keyof typeof PALETTES;

const SHAPE_SETS: Record<"classic" | "kit" | "mix", { label: string; kinds: Kind[] }> = {
  classic: { label: "Classic", kinds: ["circle", "star", "triangle", "pentagon", "diamond"] },
  kit: { label: "Kit", kinds: ["heart", "donut", "plus", "flower", "bolt"] },
  mix: { label: "Mix", kinds: ["circle", "heart", "star", "donut", "triangle", "plus", "pentagon", "flower", "diamond", "bolt"] },
};
type ShapeSetId = keyof typeof SHAPE_SETS;

const VESSELS = [
  { id: "pan", label: "Pan" },
  ...SCENES.map((s) => ({ id: s.id, label: s.short })),
];

const DEFAULTS = {
  vessel: "pan",
  palette: "pop" as PaletteId,
  shapes: "classic" as ShapeSetId,
  speed: 1,
  size: 1,
};
type Settings = typeof DEFAULTS;

/* ---------------------------------------------------------------- */
/* Controls                                                          */
/* ---------------------------------------------------------------- */

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const pill = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-[#F2F2F2] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`relative min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] transition-colors ${
            o.id === value ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          {o.id === value && (
            <motion.span
              layoutId={pill}
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="relative flex h-11 cursor-ew-resize items-center justify-between overflow-hidden rounded-2xl bg-[#F2F2F2] px-4 text-sm">
      <span className="absolute inset-y-0 left-0 bg-[#E6E6E6]" style={{ width: `${pct}%` }} />
      <span className="relative text-neutral-500">{label}</span>
      <span className="relative font-medium tabular-nums text-neutral-800">{format(value)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 cursor-ew-resize opacity-0"
      />
    </label>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-sm text-neutral-500">{label}</p>
    {children}
  </div>
);

const IconButton = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="grid size-9 cursor-pointer place-items-center text-black/25 transition hover:text-black/45 active:scale-90 disabled:pointer-events-none disabled:opacity-40"
  >
    {children}
  </button>
);

/* ---------------------------------------------------------------- */
/* Playground                                                        */
/* ---------------------------------------------------------------- */

// Runs at `speed`, only while playing
function usePlayClock(playing: boolean, speed: number) {
  const [T, setT] = useState(0.7);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  });
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setT((v) => v + dt * speedRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return T;
}

export type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Where the card sits on screen; the stage grows out of it and shrinks back into it */
  origin: Rect | null;
  onExitComplete: () => void;
  playing: boolean;
  onTogglePlay: () => void;
};

const toRect = (r: DOMRect): Rect => ({ top: r.top, left: r.left, width: r.width, height: r.height });

const PanPlayground = ({ open, onClose, origin, onExitComplete, playing, onTogglePlay }: Props) => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const [tDone, setTDone] = useState<number | null>(null);

  const palette = PALETTES[settings.palette];
  const look: Look = { colors: palette.colors, ink: palette.ink, kinds: SHAPE_SETS[settings.shapes].kinds, scale: settings.size };

  const t = usePlayClock(open && playing, settings.speed);
  const scene = SCENES.find((s) => s.id === settings.vessel);

  // The ending runs until it's faded out, then the loop carries on from wherever it is
  const ending = settings.vessel === "pan" && tDone !== null && t <= panEndAt(tDone, look.kinds!.length) + 0.6 ? tDone : null;

  // The stage animates its real box (not a scale), so the drawing never stretches.
  // An empty slot in the layout says where it should end up.
  const slot = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  useEffect(() => {
    const el = slot.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(() => setTarget(toRect(el.getBoundingClientRect())));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence custom={origin} onExitComplete={onExitComplete}>
      {open && (
        <div key="playground" className="fixed inset-0 z-50" style={{ fontFamily: "var(--font-inter)" }}>
          <motion.div
            className="absolute inset-0 bg-[#FBFBFB]/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          <div className="pointer-events-none relative mx-auto flex h-full w-full max-w-[min(1240px,80vw)] flex-col max-md:max-w-none gap-3 p-3 md:flex-row md:gap-4 md:p-6">
            <div ref={slot} className="min-h-0 flex-1" />

            {/* The stage grows out of the shelf card and shrinks back into it */}
            <motion.div
              custom={origin}
              initial={origin ?? { opacity: 0 }}
              animate={target ?? origin ?? { opacity: 1 }}
              exit="back"
              variants={{ back: (o: Rect | null) => o ?? { opacity: 0 } }}
              transition={MORPH}
              className="pointer-events-auto fixed overflow-hidden transition-colors duration-500"
              style={{ borderRadius: 28, background: palette.bg }}
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center p-[6%]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.25 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <svg viewBox="0 0 300 300" className="h-full max-h-[260px] w-full max-w-[260px] overflow-visible" aria-hidden>
                  {scene ? <SceneArt scene={scene} t={t} look={look} /> : <PanFrame t={t} theme={look} count={look.kinds!.length} tDone={ending} />}
                </svg>
              </motion.div>

              <div className="absolute bottom-3 right-3 flex">
                {settings.vessel === "pan" && (
                  <IconButton label="Play the ending" onClick={() => setTDone(t)} disabled={ending !== null || !playing}>
                    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                      <path d="M3 8.4 L6.4 11.6 L13 4.6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </IconButton>
                )}
                <IconButton label={playing ? "Pause animation" : "Play animation"} onClick={onTogglePlay}>
                  <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor" aria-hidden>
                    {playing ? (
                      <>
                        <rect x={3} y={2} width={3.6} height={12} rx={1.2} />
                        <rect x={9.4} y={2} width={3.6} height={12} rx={1.2} />
                      </>
                    ) : (
                      <path d="M4.5 2.8 C4.5 1.9 5.4 1.4 6.2 1.9 L13.2 6.4 C13.9 6.9 13.9 8.1 13.2 8.6 L6.2 13.1 C5.4 13.6 4.5 13.1 4.5 12.2 Z" />
                    )}
                  </svg>
                </IconButton>
                <IconButton label="Close playground" onClick={onClose}>
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={2} />
                </IconButton>
              </div>
            </motion.div>

            {/* Control panel, sliding in from the side once the card has started growing */}
            <motion.aside
              className="pointer-events-auto flex max-h-[45vh] w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-white p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.18)] md:max-h-none md:w-[360px]"
              style={{ borderRadius: 28 }}
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.12, duration: 0.5, ease: EASE_OUT } }}
              exit={{ opacity: 0, x: 48, transition: { duration: 0.2, ease: "easeIn" } }}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Toss</h2>
                <button
                  type="button"
                  aria-label="Close playground"
                  onClick={onClose}
                  className="-mr-1 -mt-1 grid size-8 cursor-pointer place-items-center rounded-full text-neutral-400 transition hover:bg-[#F2F2F2] hover:text-neutral-700"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Shapes juggled by kitchen things. Pick a vessel, then mix any colours and shapes.
              </p>

              <div className="mt-6 space-y-5">
                <Row label="Vessel">
                  <Segmented label="Vessel" options={VESSELS} value={settings.vessel} onChange={(v) => set("vessel", v)} />
                </Row>
                <Row label="Colours">
                  <Segmented
                    label="Colours"
                    options={(Object.keys(PALETTES) as PaletteId[]).map((id) => ({ id, label: PALETTES[id].label }))}
                    value={settings.palette}
                    onChange={(v) => set("palette", v)}
                  />
                </Row>
                <Row label="Shapes">
                  <Segmented
                    label="Shapes"
                    options={(Object.keys(SHAPE_SETS) as ShapeSetId[]).map((id) => ({ id, label: SHAPE_SETS[id].label }))}
                    value={settings.shapes}
                    onChange={(v) => set("shapes", v)}
                  />
                </Row>
                <div className="space-y-2 pt-1">
                  <Slider label="Speed" value={settings.speed} min={0.25} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set("speed", v)} />
                  <Slider label="Size" value={settings.size} min={0.6} max={1.4} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("size", v)} />
                </div>
              </div>

            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PanPlayground;
