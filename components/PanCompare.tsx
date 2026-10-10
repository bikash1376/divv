"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { PanFrame, type LoaderTheme } from "@/components/PanLoader";
import PanPlayground, { type Rect } from "@/components/PanPlayground";

const WIREFRAME: LoaderTheme = {
  colors: Array(5).fill("#d4d4d4"),
  ink: "#d4d4d4",
};
const POP: LoaderTheme = {
  colors: ["#FF5A36", "#FFC21A", "#2F6BFF", "#FF7AC8", "#18C27A"],
  ink: "#1d1b19",
};

const POSTER_T = 0.7;
const ICON = "#cfcfcf"; // a shade darker than the card

// Server and browser trig differ in the last decimals, so draw only once mounted
const noop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

// One clock for both sides so the shapes line up across the divider
function useClock(playing: boolean) {
  const [t, setT] = useState(POSTER_T);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setT((v) => v + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return t;
}

const Art = ({ t, theme }: { t: number; theme: LoaderTheme }) => (
  <svg
    viewBox="0 0 300 300"
    className="absolute inset-0 m-auto w-[62%] overflow-visible"
    aria-hidden
  >
    <PanFrame t={t} theme={theme} />
  </svg>
);

// Wireframe on the left, Pop on the right, with a draggable divider between
const PanCompare = () => {
  const box = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const t = useClock(playing);
  const mounted = useMounted();

  // The playground grows out of this card. While it's open the card's own
  // content is hidden, as if the card had been lifted out of the shelf.
  const [expanded, setExpanded] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [origin, setOrigin] = useState<Rect | null>(null);
  const measure = () => {
    const r = box.current!.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };
  const openPlayground = () => {
    setOrigin(measure());
    setLifted(true);
    setExpanded(true);
  };
  const closePlayground = () => {
    setOrigin(measure());
    setExpanded(false);
  };

  const moveTo = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(
      Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100),
    );
  };

  return (
    <>
      <div
        ref={box}
        className="absolute inset-0 cursor-ew-resize touch-none select-none transition-opacity duration-150"
        style={{ opacity: lifted ? 0 : 1 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging && moveTo(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {mounted && (
          <>
            <Art t={t} theme={WIREFRAME} />
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
            >
              <Art t={t} theme={POP} />
            </div>
          </>
        )}

        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare wireframe and pop"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplit((v) => Math.max(v - 5, 0));
            if (e.key === "ArrowRight") setSplit((v) => Math.min(v + 5, 100));
          }}
          className="absolute inset-y-0 w-px -translate-x-1/2 bg-neutral-300 outline-none"
          style={{ left: `${split}%` }}
        >
          <div
            className={`absolute left-1/2 top-1/2 flex h-9 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[3px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform ${dragging ? "scale-110" : ""}`}
          >
            <span className="h-3 w-px bg-neutral-300" />
            <span className="h-3 w-px bg-neutral-300" />
          </div>
        </div>

        <div
          className="absolute bottom-3 right-3 flex"
          style={{ color: ICON }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause animation" : "Play animation"}
            className="grid size-9 cursor-pointer place-items-center transition active:scale-90"
          >
            <svg
              viewBox="0 0 16 16"
              width={16}
              height={16}
              fill="currentColor"
              aria-hidden
            >
              {playing ? (
                <>
                  <rect x={3} y={2} width={3.6} height={12} rx={1.2} />
                  <rect x={9.4} y={2} width={3.6} height={12} rx={1.2} />
                </>
              ) : (
                <path d="M4.5 2.8 C4.5 1.9 5.4 1.4 6.2 1.9 L13.2 6.4 C13.9 6.9 13.9 8.1 13.2 8.6 L6.2 13.1 C5.4 13.6 4.5 13.1 4.5 12.2 Z" />
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={openPlayground}
            aria-label="Open playground"
            className="grid size-9 cursor-pointer place-items-center transition active:scale-90"
          >
            <HugeiconsIcon
              icon={FilterHorizontalIcon}
              size={18}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Outside the card: React events bubble through portals, and the card's
        drag handler would otherwise grab every press in the playground */}
      <PanPlayground
        open={expanded}
        origin={origin}
        onClose={closePlayground}
        onExitComplete={() => setLifted(false)}
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
      />
    </>
  );
};

export default PanCompare;
