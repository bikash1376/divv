"use client"
import Image from "next/image";
import React, { useRef, useState } from "react";
import {
  motion,
  MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

// The scroll-driven album stack: cards rise into a column, then scatter.
type Album = {
  id: number;
  name: string;
  description: string;
  image: string;
  // opens in a new tab when the card is clicked
  href?: string;
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
            {album.href ? (
              <a href={album.href} target="_blank" rel="noreferrer" draggable="false" className="block">
              <h3 className="text-sm p-1 text-gray-400 transition-colors group-hover:text-black">{album.name}</h3>
              <Image
              draggable="false"
                src={album.image}
                width={200}
                // Sandbox image is ~2:1 (1912×955) — crop every image to that same box
                height={100}
                // shrinks on phones so the scattered cards stay on screen
                style={{ width: "min(200px, 36vw)", height: "auto", aspectRatio: "2 / 1", objectFit: "cover" }}
                alt={album.name}
                className="border-gray-300 border"
              />
              </a>
            ) : (
              <>
              <h3 className="text-sm p-1 text-gray-400 transition-colors group-hover:text-black">{album.name}</h3>
              <Image
              draggable="false"
                src={album.image}
                width={200}
                // Sandbox image is ~2:1 (1912×955) — crop every image to that same box
                height={100}
                // shrinks on phones so the scattered cards stay on screen
                style={{ width: "min(200px, 36vw)", height: "auto", aspectRatio: "2 / 1", objectFit: "cover" }}
                alt={album.name}
                className="border-gray-300 border"
              />
              </>
            )}

            {/* <p className="text-gray-700">{album.description}</p> */}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Selected projects from bikash.useiota.space
const ALBUMS: Album[] = [
  {
    id: 1,
    name: "Zineps (redesign)",
    description: "Redesign of the Zineps logistics platform: landing page and dashboard, from Figma to code.",
    image: "/projects/zineps.jpg",
    href: "https://zineps-redesign.vercel.app/",
    stackRotate: -6,
    scatter: { x: -30, y: -50, rotate: -3 },
  },
  {
    id: 2,
    name: "iota",
    description: "A collection of small web animation tools. Draw, tweak, and export SVG animations. (WIP)",
    image: "/projects/iota.jpg",
    href: "https://useiota.space",
    stackRotate: 4,
    scatter: { x: 0, y: -58, rotate: 2 },
  },
  {
    id: 3,
    name: "Prepara",
    description: "Practice Test Platform for Students & Teachers",
    image: "/projects/prepara.jpg",
    href: "https://prepara.useiota.space",
    stackRotate: -2,
    scatter: { x: 30, y: -48, rotate: 4 },
  },
  {
    id: 4,
    name: "Trition",
    description: "A Notion-like workspace that stores every page, block and table directly in your Trello boards — no separate database.",
    image: "/projects/trition.jpg",
    href: "https://trition.vercel.app",
    stackRotate: 7,
    scatter: { x: -15, y: -27, rotate: -2 },
  },
  {
    id: 5,
    name: "RevPDF",
    description: "Local PDF, EPUB, DOC and DOCX reader with Chrome-style selection search.",
    image: "/projects/revpdf.jpg",
    href: "https://revpdf.in",
    stackRotate: -4,
    scatter: { x: 15, y: -29, rotate: 3 },
  },
  {
    id: 6,
    name: "OddlyAI",
    description: "Landing page for an AI studio that builds assistants, automations and apps.",
    image: "/projects/oddlyai.webp",
    stackRotate: 3,
    scatter: { x: -26, y: -4, rotate: 2 },
  },
  {
    id: 7,
    name: "Better-components",
    description: "A collection of reusable, ready-to-use UI components.",
    image: "/projects/components.jpg",
    href: "https://components.useiota.space",
    stackRotate: -5,
    scatter: { x: 26, y: -5, rotate: -3 },
  },
];

const ScatterCards = () => {
  // The section is taller than the screen; the stage inside it sticks while
  // you scroll through, and that scroll drives the scatter.
  const section = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const progress = useTransform(scrollYProgress, easeInOutCubic);

  return (
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
  );
};

export default ScatterCards;
