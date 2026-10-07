"use client"
import Image from "next/image";
import Link from "next/link";
import BrickBreaker from "@/components/BrickBreaker";
import StuffShelf from "@/components/StuffShelf";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import React, { startTransition, useEffect, useRef, useState, ViewTransition } from "react";
import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

type Album = {
  id: number;
  name: string;
  description: string;
  image: string;
  // tilt while sitting in the stack
  stackRotate: number;
  // where the card ends up once scattered, relative to the stack (vw / vh / deg)
  scatter: { x: number; y: number; rotate: number };
};

const SPRING = { stiffness: 150, damping: 15, mass: 0.1 };
const STRENGTH = 0.12;
// how much page there is to scroll through while the cards animate (vh)
const SCROLL_LENGTH = 70;
// fraction of that scroll at which the cards are fully scattered
const SCATTER_END = 0.85;
// low damping = visible overshoot/bounce as the cards fly out
const SCATTER_SPRING = { stiffness: 120, damping: 12, mass: 0.8 };
// card size while sitting in the stack (1 = full size)
const STACK_SCALE = 0.2;
// card opacity while sitting in the stack
const STACK_OPACITY = 0;
// final card opacity once scattered
const SCATTERED_OPACITY = 0.8;
// fraction of the section's scroll at which the cards have finished rising
const RISE_END = 0.4;
// vertical gap between cards in the risen column (vh)
const COLUMN_GAP = 12;

// slow start, fast middle, slow finish — applied to scroll progress so a small
// scroll eases the cards out of the stack instead of moving them linearly
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// card size while in the risen column
const COLUMN_SCALE = 0.6;

// shared across cards so whichever one you drag last ends up on top
let topZ = 1;

const AlbumCard = ({
  album,
  index,
  total,
  progress,
}: {
  album: Album;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  // Two phases: 0 → RISE_END the cards float straight up into a column
  // (first card highest, top-of-stack card lowest), then RISE_END → SCATTER_END
  // they spread out sideways to their final spots.
  const columnY = -(total - index) * COLUMN_GAP;
  const phases = [0, RISE_END, SCATTER_END];

  // Scroll sets where each card *should* be; the springs chase those targets,
  // so the cards lag behind, overshoot and settle instead of tracking 1:1.
  const scatterXTarget = useTransform(progress, phases, [0, 0, album.scatter.x]);
  const scatterYTarget = useTransform(progress, phases, [0, columnY, album.scatter.y]);
  const rotateTarget = useTransform(progress, phases, [album.stackRotate, 0, album.scatter.rotate]);
  const scaleTarget = useTransform(progress, phases, [STACK_SCALE, COLUMN_SCALE, 1]);

  const scatterXSpring = useSpring(scatterXTarget, SCATTER_SPRING);
  const scatterYSpring = useSpring(scatterYTarget, SCATTER_SPRING);
  const rotate = useSpring(rotateTarget, SCATTER_SPRING);
  const scale = useSpring(scaleTarget, SCATTER_SPRING);

  // springs work on plain numbers, so add the viewport units afterwards
  const scatterX = useTransform(scatterXSpring, (v) => `${v}vw`);
  const scatterY = useTransform(scatterYSpring, (v) => `${v}vh`);
  // function form on purpose: the [input]→[output] form lets Motion hand opacity
  // to the browser's ScrollTimeline, which never updated here and left it stuck
  // squared so the cards stay faint early on and only fill in near the end
  const opacity = useTransform(progress, (v) => {
    const t = Math.min(v / SCATTER_END, 1);
    return STACK_OPACITY + (SCATTERED_OPACITY - STACK_OPACITY) * t * t;
  });

  const [scattered, setScattered] = useState(false);
  useMotionValueEvent(progress, "change", (v) => setScattered(v >= SCATTER_END));

  const [z, setZ] = useState(0);

  // Measure the outer (drag) element, move the inner one — measuring the
  // element we translate would feed its own offset back into the math.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * STRENGTH);
    y.set((e.clientY - (r.top + r.height / 2)) * STRENGTH);
  };

  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Each layer owns one transform so they don't fight over x/y:
  // scatter (scroll) → drag → float → magnet
  return (
    <motion.div
      // all cards share grid cell 1/1, which stacks them on top of each other
      // originY: 1 shrinks the card toward its bottom edge, so the small stack still sits at the bottom
      style={{ gridArea: "1 / 1", x: scatterX, y: scatterY, rotate, scale, originY: 1, opacity, zIndex: z, position: "relative" }}
    >
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <motion.div
          animate={scattered ? { y: [0, -10, 0] } : { y: 0 }}
          transition={
            scattered
              ? { duration: 3.5 + album.id * 0.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        >
          <motion.div
            // position: relative keeps every card on the same paint layer, so the
            // card below always covers this one's shadow — even while it's transformed
            style={{ x: sx, y: sy, position: "relative" }}
            className="group border px-1 py-1 bg-white shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] border-gray-400 hover:border-black hover:cursor-pointer"
          >
            <h3 className="text-sm p-1 text-gray-400 transition-colors group-hover:text-black">{album.name}</h3>
            <Image
            draggable="false"
              src={album.image}
              width={200}
              // Sandbox image is ~2:1 (1912×955) — crop every image to that same box
              height={100}
              // shrinks on phones so the scattered cards stay on screen
              style={{ width: "min(200px, 36vw)", height: "auto", aspectRatio: "2 / 1", objectFit: "cover" }}
              alt="album image"
              className="border-gray-300 border"
            />

            {/* <p className="text-gray-700">{album.description}</p> */}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Placeholder copy — replace with your own.
// A paragraph is made of segments; `muted` segments render in the lighter grey,
// `showcase` segments reveal the drifting image walls on hover, `href` makes a link.
type HeroSegment = { text: string; muted?: boolean; showcase?: boolean; href?: string };

const HERO_PARAGRAPHS: HeroSegment[][] = [
  [
    { text: "Designer & developer crafting interfaces for small teams, and " },
    { text: "tinkering on side projects", muted: true, showcase: true },
    { text: "." },
  ],
  [{ text: "I like " }, { text: "playing with motion", muted: true }, { text: " and building things that feel alive." }],
  [{ text: "Reach out at " }, { text: "you@example.com", href: "mailto:you@example.com" }],
];

const CONTACT_HREF = "mailto:you@example.com";

// view-transition name shared by the picture and the game card, so one morphs into the other
const GAME_MORPH = "pfp-game";

// Placeholder — swap for your own picture (e.g. a file in /public)
const HERO_IMAGE = "https://images.pexels.com/photos/6984997/pexels-photo-6984997.jpeg";

// in: delay before the first letter, and between consecutive letters (seconds)
const HERO_START = 0.2;
const LETTER_STAGGER = 0.012;
// out (fractions of the section's scroll): the first letter starts leaving at
// OUT_START, the last at OUT_START + OUT_SPREAD; each takes OUT_LENGTH to go
const OUT_START = 0.02;
const OUT_SPREAD = 0.3;
const OUT_LENGTH = 0.08;
// distance a letter travels when entering/leaving its line (px)
const LETTER_TRAVEL = 24;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Precompute each letter's position in the whole hero, so both the in and out
// staggers run continuously from the first paragraph to the last. Letters are
// grouped into words so the paragraphs can wrap between words, never inside one.
type HeroToken = { space: string } | { letters: { char: string; index: number }[] };
const HERO_TOKENS = (() => {
  let index = 0;
  return HERO_PARAGRAPHS.map((paragraph) =>
    paragraph.map((segment) =>
      segment.text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part): HeroToken =>
          /^\s+$/.test(part)
            ? { space: part }
            : { letters: part.split("").map((char) => ({ char, index: index++ })) },
        ),
    ),
  );
})();
const HERO_LETTER_COUNT = HERO_TOKENS.flat(2).reduce((n, t) => ("letters" in t ? n + t.letters.length : n), 0);

const HeroLetter = ({
  char,
  index,
  progress,
}: {
  char: string;
  index: number;
  progress: MotionValue<number>;
}) => {
  const start = OUT_START + (index / HERO_LETTER_COUNT) * OUT_SPREAD;
  const end = start + OUT_LENGTH;
  const y = useTransform(progress, [start, end], [0, -LETTER_TRAVEL]);
  // function form, same ScrollTimeline reason as the cards' opacity
  const opacity = useTransform(progress, (v) => 1 - Math.min(Math.max((v - start) / OUT_LENGTH, 0), 1));

  // outer span: rises in once on load. inner span: rises out as you scroll.
  // Two layers so the load animation and the scroll don't fight over `y`.
  return (
    <motion.span
      aria-hidden
      className="inline-block"
      initial={{ y: LETTER_TRAVEL, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: HERO_START + index * LETTER_STAGGER, duration: 0.6, ease: EASE_OUT }}
    >
      <motion.span className="inline-block" style={{ y, opacity }}>
        {char}
      </motion.span>
    </motion.span>
  );
};

const Hero = ({
  progress,
  onShowcase,
  onGameStart,
  onGameEnd,
  playing,
}: {
  progress: MotionValue<number>;
  onShowcase: (show: boolean) => void;
  onGameStart: () => void;
  onGameEnd: () => void;
  playing: boolean;
}) => {
  // contact block fades in after the letters, and fades out once they're mostly gone
  const contactInDelay = HERO_START + HERO_LETTER_COUNT * LETTER_STAGGER;
  const contactOutStart = OUT_START + OUT_SPREAD * 0.6;
  const contactOpacity = useTransform(progress, (v) =>
    1 - Math.min(Math.max((v - contactOutStart) / OUT_LENGTH, 0), 1),
  );
  // picture leaves just ahead of the first letter
  const pictureOpacity = useTransform(progress, (v) =>
    1 - Math.min(Math.max((v - OUT_START) / OUT_LENGTH, 0), 1),
  );
  const pictureY = useTransform(progress, [OUT_START, OUT_START + OUT_LENGTH], [0, -LETTER_TRAVEL]);

  // Picture drag limits, in px from where the drag layer started. Passing a ref as
  // dragConstraints let it escape the screen (Motion measures without the parent
  // layers' transforms), so instead measure where it really is on each grab and
  // allow exactly the distance to each screen edge.
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const [dragLimits, setDragLimits] = useState<{ top: number; left: number; right: number; bottom: number }>();
  const measureDragLimits = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // position it would have with zero drag offset
    const left = r.left - dragX.get();
    const top = r.top - dragY.get();
    setDragLimits({
      left: -left,
      top: -top,
      right: window.innerWidth - (left + r.width),
      bottom: window.innerHeight - (top + r.height),
    });
  };

  // once the picture has been dragged it stays round, until a game ends
  const [moved, setMoved] = useState(false);
  // when the game closes (Esc or the esc button), the picture goes back to its
  // original square-ish corners. Adjusting state during render on a prop change
  // is React's recommended alternative to doing it in an effect.
  const [wasPlaying, setWasPlaying] = useState(playing);
  if (playing !== wasPlaying) {
    setWasPlaying(playing);
    if (!playing) setMoved(false);
  }
  // Touching any screen edge mid-drag starts the game. The ref stops onDrag (which
  // fires every frame) from starting it more than once per grab.
  const dragRef = useRef<HTMLDivElement>(null);
  const gameTriggered = useRef(false);
  const checkWalls = () => {
    if (gameTriggered.current || !dragRef.current) return;
    const r = dragRef.current.getBoundingClientRect();
    const touching =
      r.left <= 1 || r.top <= 1 || r.right >= window.innerWidth - 1 || r.bottom >= window.innerHeight - 1;
    if (!touching) return;
    gameTriggered.current = true;
    onGameStart();
  };

  // While the game is open the picture is unmounted (it has morphed into the
  // card), so this is the moment to zero its drag offset: nothing is dragging it
  // any more, and it remounts exactly at home when the game closes. (Resetting
  // at trigger time didn't stick — the still-active drag overwrote it.)
  useEffect(() => {
    if (!playing) return;
    dragX.jump(0);
    dragY.jump(0);
  }, [playing, dragX, dragY]);

  return (
    <div
      className="relative z-10 flex flex-1 justify-center px-4 pt-6 pb-10 sm:pt-20 text-neutral-800 tracking-tight"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* column runs from the navbar to the bottom of the screen; the navbar pins
          to its top edge and the game fills it, so both span the text's width */}
      <div className="relative flex flex-col w-full max-w-[820px] pt-24 sm:pt-28">
        <Navbar progress={progress} />

        {/* same two-layer setup as the letters: outer rises in on load, inner rises out on scroll */}
        <motion.div
          className="mb-8 w-fit"
          initial={{ y: LETTER_TRAVEL, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: HERO_START, duration: 0.6, ease: EASE_OUT }}
        >
          <motion.div style={{ y: pictureY, opacity: pictureOpacity }}>
            {/* While playing, the picture is swapped for an empty spacer: a shared-element
                morph needs one element leaving and another (the game card, same
                name) arriving in the same transition. */}
            {playing ? (
              <div className="size-18" />
            ) : (
            <ViewTransition name={GAME_MORPH} share="morph" default="none">
            {/* third layer for dragging, so it doesn't fight the in/out layers over `y` */}
            <motion.div
              ref={dragRef}
              drag
              style={{ x: dragX, y: dragY }}
              onPointerDown={measureDragLimits}
              onDragStart={() => {
                setMoved(true);
                gameTriggered.current = false;
              }}
              // brick-breaker on hitting a wall is off for now — uncomment to bring it back
              // onDrag={checkWalls}
              dragConstraints={dragLimits}
              // small rubber-band past the edge, then it snaps back inside the screen
              dragElastic={0.1}
              className="pointer-events-auto cursor-pointer"
            >
              <Image
                src={HERO_IMAGE}
                width={72}
                height={72}
                alt=""
                // stops the browser's own image drag from hijacking the gesture
                draggable="false"
                // 50% rather than rounded-full: rounded-full is an effectively infinite
                // radius, so the transition would jump instead of smoothly morphing
                className={`size-18 object-cover transition-[border-radius] duration-300 ease-out hover:rounded-[50%] ${
                  moved ? "rounded-[50%]" : "rounded-2xl"
                }`}
              />
            </motion.div>
            </ViewTransition>
            )}
          </motion.div>
        </motion.div>

        {HERO_PARAGRAPHS.map((paragraph, p) => (
          <p key={p} className={`text-lg leading-snug ${p ? "mt-5" : ""}`}>
            <span className="sr-only">{paragraph.map((s) => s.text).join("")}</span>
            {paragraph.map((segment, s) => {
              const className = `${segment.muted ? "text-neutral-400" : segment.href ? "text-neutral-950 font-medium" : "text-neutral-800"} ${
                segment.showcase || segment.href ? "pointer-events-auto cursor-pointer" : ""
              } ${segment.href ? "transition-colors hover:text-neutral-500" : ""}`;
              const words = HERO_TOKENS[p][s].map((token, t) =>
                "space" in token ? (
                  <React.Fragment key={t}>{token.space}</React.Fragment>
                ) : (
                  // overflow-hidden clips each letter as it rises into, and later out of, its word
                  <span key={t} aria-hidden className="inline-block overflow-hidden align-top">
                    {token.letters.map(({ char, index }) => (
                      <HeroLetter key={index} char={char} index={index} progress={progress} />
                    ))}
                  </span>
                ),
              );
              return segment.href ? (
                <a key={s} href={segment.href} aria-hidden tabIndex={-1} className={className}>
                  {words}
                </a>
              ) : (
                <span
                  key={s}
                  className={className}
                  onMouseEnter={segment.showcase ? () => onShowcase(true) : undefined}
                  onMouseLeave={segment.showcase ? () => onShowcase(false) : undefined}
                >
                  {words}
                </span>
              );
            })}
          </p>
        ))}

        <motion.div
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: contactInDelay, duration: 0.6, ease: EASE_OUT }}
        >
          <motion.div style={{ opacity: contactOpacity }} className="flex flex-wrap gap-3">
            <a
              href={CONTACT_HREF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-base text-white transition-all hover:bg-neutral-700 active:scale-96"
            >
              get in touch
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={2} />
            </a>
            <button
              type="button"
              onClick={() => document.getElementById("stuff")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl bg-[#F2F2F2] px-5 py-3 text-base text-neutral-800 transition-all hover:bg-[#EAEAEA] active:scale-96 cursor-pointer"
            >
              see my stuff
            </button>
          </motion.div>
        </motion.div>

        {/* inside the column so the play area is exactly the paragraph's width */}
        {playing && <BrickBreaker image={HERO_IMAGE} morphName={GAME_MORPH} onExit={onGameEnd} />}
      </div>
    </div>
  );
};

// A wave of 16 half-bumps across a 40×6 box; the SVG stretches it to the text's width.
const SQUIGGLE_PATH =
  "M0 3" +
  Array.from({ length: 16 }, (_, i) => ` Q${i * 2.5 + 1.25} ${i % 2 ? 5.5 : 0.5} ${(i + 1) * 2.5} 3`).join("");

// Wraps a nav item with a squiggly underline that draws itself on hover
// (pathLength 0 → 1) and un-draws when the cursor leaves.
const NavItem = ({ children }: { children: React.ReactNode }) => (
  <motion.span className="relative inline-block" initial="rest" animate="rest" whileHover="hover">
    {children}
    <svg
      aria-hidden
      viewBox="0 0 40 6"
      preserveAspectRatio="none"
      className="pointer-events-none absolute left-0 -bottom-1.5 h-1.5 w-full overflow-visible text-blue-400"
    >
      <motion.path
        d={SQUIGGLE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        // keeps the line 1.25px thick even though the SVG is stretched
        vectorEffect="non-scaling-stroke"
        // opacity only hides the round-cap dot left at pathLength 0, so on the way
        // out it waits for the un-draw to finish before fading
        variants={{
          rest: {
            pathLength: 0,
            opacity: 0,
            transition: {
              pathLength: { duration: 0.45, ease: "easeInOut" },
              opacity: { delay: 0.4, duration: 0.05 },
            },
          },
          hover: {
            pathLength: 1,
            opacity: 1,
            transition: { pathLength: { duration: 0.45, ease: "easeInOut" }, opacity: { duration: 0.05 } },
          },
        }}
      />
    </svg>
  </motion.span>
);

// Rendered inside the hero column, so it inherits the paragraph's font, size and width.
// ---- Side showcase: two walls of tilted, slowly drifting screenshots ----

const SHOWCASE_IMAGES = ["/image1.png", "/image2.webp", "/image3.jpg", "/image4.jpg"];
// how much of each side of the screen a wall covers (vw)
const SHOWCASE_WIDTH = 38;
const SHOWCASE_TILT = 24;
const SHOWCASE_OPACITY = 0.4;

// One endlessly scrolling column. The list is rendered twice and moved by -50%,
// so when it loops the second copy sits exactly where the first one started.
// (Spacing is mb-* on each item, not gap, so both halves are the same height.)
const ShowcaseColumn = ({ shift, reverse, duration }: { shift: number; reverse?: boolean; duration: number }) => {
  const images = SHOWCASE_IMAGES.map((_, i) => SHOWCASE_IMAGES[(i + shift) % SHOWCASE_IMAGES.length]);
  return (
    <motion.div
      className="flex flex-col"
      animate={{ y: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {[...images, ...images].map((src, i) => (
        <div key={i} className="mb-6 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm">
          <Image
            src={src}
            width={256}
            height={160}
            alt=""
            draggable="false"
            className="h-40 w-64 rounded-lg object-cover"
          />
        </div>
      ))}
    </motion.div>
  );
};

const ShowcaseWall = ({ side }: { side: "left" | "right" }) => (
  <div
    className="absolute inset-y-0 overflow-hidden"
    style={{
      [side]: 0,
      width: `${SHOWCASE_WIDTH}vw`,
      // fade the wall out towards the text in the middle
      maskImage: `linear-gradient(to ${side === "left" ? "right" : "left"}, black 35%, transparent)`,
    }}
  >
    {/* oversized so the tilted columns still cover the corners */}
    <div
      className="absolute -inset-1/2 flex items-center justify-center gap-6"
      style={{ transform: `rotate(${SHOWCASE_TILT}deg)` }}
    >
      {/* neighbouring columns drift in opposite directions at slightly different speeds */}
      <ShowcaseColumn shift={side === "left" ? 0 : 2} duration={40} />
      <ShowcaseColumn shift={side === "left" ? 1 : 3} duration={48} reverse />
      <ShowcaseColumn shift={side === "left" ? 2 : 0} duration={44} />
    </div>
  </div>
);

const Showcase = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: SHOWCASE_OPACITY, scale: 1 }}
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <ShowcaseWall side="left" />
        <ShowcaseWall side="right" />
      </motion.div>
    )}
  </AnimatePresence>
);

const Navbar = ({ progress }: { progress: MotionValue<number> }) => {
  // leaves together with the picture, at the very start of the scroll
  const opacity = useTransform(progress, (v) =>
    1 - Math.min(Math.max((v - OUT_START) / OUT_LENGTH, 0), 1),
  );
  const y = useTransform(progress, [OUT_START, OUT_START + OUT_LENGTH], [0, -LETTER_TRAVEL]);
  // stop catching clicks once it's gone, so it can't be clicked while invisible
  const pointerEvents = useTransform(opacity, (o) => (o > 0.05 ? "auto" : "none"));

  return (
    <motion.nav
      className="absolute top-0 inset-x-0 flex items-center justify-between py-5 text-base"
      style={{ opacity, y, pointerEvents }}
    >
      <NavItem>
        <Link href="/" className="font-medium text-neutral-900">
          Divv.
        </Link>
      </NavItem>
      <button
        type="button"
        className="rounded-full bg-[#F2F2F2] px-3.5 py-1 text-black cursor-pointer transition-colors hover:bg-[#EAEAEA]"
        onClick={() =>
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })
        }
      >
        Stuff
      </button>
    </motion.nav>
  );
};

const AboutPage = () => {
  const ALBUMS: Album[] = [
    {
      id: 1,
      name: "Sandbox",
      description: "this is picture one",
      image: "/image1.png",
      stackRotate: -6,
      scatter: { x: -30, y: -35, rotate: -3 },
    },
    {
      id: 2,
      name: "Graphics",
      description: "this is picture one",
      image: "/image2.webp",
      stackRotate: 4,
      scatter: { x: 2, y: -10, rotate: 2 },
    },
    {
      id: 3,
      name: "Carousel",
      description: "this is picture one",
      image: "/image3.jpg",
      stackRotate: -2,
      scatter: { x: 30, y: -38, rotate: 4 },
    },
    {
      id: 4,
      name: "Pexels One",
      description: "this is picture one",
      image: "https://images.pexels.com/photos/6984997/pexels-photo-6984997.jpeg",
      stackRotate: 7,
      scatter: { x: -20, y: -4, rotate: -2 },
    },
    {
      id: 5,
      name: "Pexels Two",
      description: "this is picture one",
      image: "https://images.pexels.com/photos/14774085/pexels-photo-14774085.jpeg",
      stackRotate: -4,
      scatter: { x: 22, y: -5, rotate: 3 },
    },
     {
      id: 6,
      name: "Pexels Two",
      description: "this is picture one",
      image: "https://images.pexels.com/photos/14774085/pexels-photo-14774085.jpeg",
      stackRotate: -4,
      scatter: { x: 0, y: -55, rotate: 3 },
    },
  ];

  // The section is taller than the screen; the stage inside it sticks while
  // you scroll through, and that scroll drives the scatter.
  const section = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const progress = useTransform(scrollYProgress, easeInOutCubic);

  // the hero leaves as it scrolls off the top of the screen
  const heroSection = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroSection, offset: ["start start", "end start"] });
  const [showcase, setShowcase] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="bg-[#FBFBFB]">
      <div ref={heroSection} className="relative flex min-h-svh flex-col">
        {/* first in the hero so the text paints on top of it */}
        <Showcase show={showcase} />
        <Hero
          progress={heroProgress}
          onShowcase={setShowcase}
          onGameStart={() => {
            // the game fills the hero column, so make sure all of it is on screen
            window.scrollTo({ top: 0 });
            // inside startTransition so React's <ViewTransition> runs the morph
            startTransition(() => setPlaying(true));
          }}
          onGameEnd={() => startTransition(() => setPlaying(false))}
          playing={playing}
        />
      </div>

      <StuffShelf />

      <div
        ref={section}
        className="relative"
        // the stage is one screen tall, so everything beyond that is scroll distance
        style={{ height: `${100 + SCROLL_LENGTH}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden flex items-end justify-center pb-10">
          <div className="grid">
            {ALBUMS.map((album, i) => (
              <AlbumCard key={album.id} album={album} index={i} total={ALBUMS.length} progress={progress} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
