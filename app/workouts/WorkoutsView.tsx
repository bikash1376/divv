"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { REPS, clipUrl, week, type Exercise } from "./data";

const noop = () => () => {};
const ORDER = [1, 2, 3, 4, 5, 6, 0];
// Lightbox width: as wide as possible while the 16:9 clip plus caption still fit the screen height.
const FIT = "min(64rem, 100%, calc((100dvh - 10rem) * 16 / 9))";

type Item = Exercise & { muscle: string };

const amount = (e: Exercise) => `${e.sets} × ${e.reps ?? REPS}`;

/** Grid clip: fetched once it nears the viewport, playing only while visible. */
function Clip({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const loader = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: "600px 0px",
    });
    const player = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    loader.observe(video);
    player.observe(video);
    return () => {
      loader.disconnect();
      player.disconnect();
    };
  }, []);

  // Play only after the src is attached — calling play() before that fails silently.
  useEffect(() => {
    const video = ref.current;
    if (!video || !near) return;
    if (visible) video.play().catch(() => {});
    else video.pause();
  }, [near, visible]);

  return (
    <video
      ref={ref}
      src={near ? src : undefined}
      muted
      loop
      playsInline
      preload="metadata"
      className="aspect-video w-full rounded-xl bg-foreground/5 object-cover"
    />
  );
}

function Lightbox({ items, index, onIndex, onClose }: {
  items: Item[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const prev = () => onIndex((index - 1 + items.length) % items.length);
  const next = () => onIndex((index + 1) % items.length);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
      else if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, items.length, onIndex, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/90 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: FIT }}
        className="relative"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.video
            key={item.id}
            src={clipUrl(item.id, 1280)}
            autoPlay
            muted
            loop
            playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="aspect-video w-full rounded-2xl bg-white/5 object-cover"
          />
        </AnimatePresence>
      </motion.div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: FIT }}
        className="flex max-w-full items-center justify-between gap-4 text-white"
      >
        <button onClick={prev} aria-label="Previous" className="rounded-full p-3 hover:bg-white/10">
          <Chevron dir="left" />
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="text-xs uppercase tracking-wider text-white/50">
            {item.muscle} · {index + 1} / {items.length}
          </span>
          <span className="text-lg font-medium">{item.name}</span>
          <span className="text-sm tabular-nums text-white/60">{amount(item)}</span>
        </div>
        <button onClick={next} aria-label="Next" className="rounded-full p-3 hover:bg-white/10">
          <Chevron dir="right" />
        </button>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </motion.div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
    </svg>
  );
}

// ── Done ticks: saved in localStorage as "<day>:<exercise id>", cleared each new week (Monday).
const DONE_KEY = "workouts:done";
const doneListeners = new Set<() => void>();

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function subscribeDone(cb: () => void) {
  doneListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    doneListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const readDone = () => localStorage.getItem(DONE_KEY) ?? "";

function parseDone(raw: string): Set<string> {
  try {
    const saved = JSON.parse(raw) as { week: string; ids: string[] };
    return new Set(saved.week === weekStart() ? saved.ids : []);
  } catch {
    return new Set();
  }
}

function toggleDone(id: string) {
  const ids = parseDone(readDone());
  if (!ids.delete(id)) ids.add(id);
  localStorage.setItem(DONE_KEY, JSON.stringify({ week: weekStart(), ids: [...ids] }));
  doneListeners.forEach((cb) => cb());
}

function DoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" className="size-14">
      <path
        fill="currentColor"
        d="m18 21.414l-3.536-3.535l1.414-1.414L18 18.585l9.9-9.898l1.414 1.414zm-8-1L3.636 14.05l1.414-1.414l4.95 4.95l9.9-9.9l1.414 1.415z"
      />
    </svg>
  );
}

/** Single click opens the lightbox; a double click / double tap toggles the done tick. */
function ExerciseCard({ exercise, done, onOpen, onToggle }: {
  exercise: Exercise;
  done: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onToggle();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onOpen();
    }, 250);
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-zoom-in touch-manipulation select-none flex-col gap-2 text-left transition-transform active:scale-[0.98]"
    >
      <span className="relative block w-full">
        <Clip src={clipUrl(exercise.id, 640)} />
        <AnimatePresence>
          {done && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-green-400"
            >
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.5 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.4 }}
              >
                <DoneIcon />
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="flex w-full items-baseline justify-between gap-3 px-1 text-sm">
        <span className={`font-medium transition-opacity ${done ? "opacity-50" : ""}`}>{exercise.name}</span>
        <span className="shrink-0 tabular-nums text-foreground/50">{amount(exercise)}</span>
      </span>
    </button>
  );
}

export default function WorkoutsView() {
  // Today on the client, Monday for the server render; a tapped tab wins.
  const today = useSyncExternalStore(noop, () => new Date().getDay(), () => 1);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const day = picked ?? today;
  const doneRaw = useSyncExternalStore(subscribeDone, readDone, () => "");
  const done = useMemo(() => parseDone(doneRaw), [doneRaw]);
  const current = week[day];
  const items: Item[] = current.groups.flatMap((g) => g.exercises.map((e) => ({ ...e, muscle: g.muscle })));

  // Rest day is shorter than the viewport, so the scrollbar would vanish and
  // shift everything sideways — reserve its space while this page is open.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollbarGutter;
    html.style.scrollbarGutter = "stable";
    return () => {
      html.style.scrollbarGutter = prev;
    };
  }, []);

  let n = 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <nav className="flex gap-1 overflow-x-auto">
        {ORDER.map((i) => (
          <button
            key={i}
            onClick={() => setPicked(i)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              i === day ? "bg-foreground text-background" : "text-foreground/50 hover:bg-foreground/10"
            }`}
          >
            {week[i].short}
          </button>
        ))}
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">{current.name}</h1>
        <p className="text-foreground/50">{current.title}</p>
      </header>

      {current.groups.length === 0 ? (
        <p className="text-foreground/50">Rest day. Eat, sleep, recover.</p>
      ) : (
        current.groups.map((group) => (
          <section key={group.muscle} className="flex flex-col gap-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-foreground/40">{group.muscle}</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.exercises.map((exercise) => {
                const i = n++;
                return (
                  <li key={exercise.id}>
                    <ExerciseCard
                      exercise={exercise}
                      done={done.has(`${day}:${exercise.id}`)}
                      onOpen={() => setOpen(i)}
                      onToggle={() => toggleDone(`${day}:${exercise.id}`)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <AnimatePresence>
        {open !== null && items[open] && (
          <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
