"use client"
import React, { startTransition, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import BrickBreaker, { LEVEL_COLORS } from "@/components/BrickBreaker";

// ---- Stamp cutter: a still of the page; the whole card opens /stamp ----

function StampStuff() {
  return (
    <Link href="/stamp" aria-label="Open the stamp cutter" className="absolute inset-0 cursor-pointer">
      <Image
        src="/stamp-card.webp"
        alt="Stamp cutter"
        fill
        sizes="240px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </Link>
  );
}

// ---- Brick breaker: a still of the wall in the card; clicking it morphs the
// card into the full game (the same <ViewTransition> morph the old hero used) ----

const BRICK_MORPH = "craft-brick";
const BRICK_BALL = "/loader/pfp.jpg";
// a fixed, patchy "year" so the still doesn't reshuffle on every render
const BRICK_CELLS = Array.from({ length: 18 * 7 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const v = r - Math.floor(r);
  return v < 0.35 ? 0 : v < 0.6 ? 1 : v < 0.8 ? 2 : v < 0.93 ? 3 : 4;
});

function BrickStuff() {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      {playing ? (
        <div className="absolute inset-0" />
      ) : (
        <ViewTransition name={BRICK_MORPH} share="morph" default="none">
          <button
            type="button"
            aria-label="Play brick breaker"
            onClick={() => startTransition(() => setPlaying(true))}
            className="absolute inset-0 flex cursor-pointer flex-col items-center pt-9"
          >
            <span className="grid grid-flow-col grid-rows-7 gap-[3px]">
              {BRICK_CELLS.map((level, i) => (
                <span key={i} className="size-3 rounded-[3px]" style={{ background: LEVEL_COLORS[level] }} />
              ))}
            </span>
            <Image src={BRICK_BALL} alt="" width={36} height={36} className="mt-14 size-[18px] rounded-full object-cover" />
            <span className="mb-14 mt-auto h-2.5 w-[84px] rounded-full bg-[#d4d4d4]" />
            <span className="absolute bottom-5 text-xs text-neutral-400 transition-colors group-hover:text-neutral-600">
              click to play
            </span>
          </button>
        </ViewTransition>
      )}
      {playing &&
        createPortal(
          // the game fills its parent column, so give it one: full height, 470px wide
          <div className="fixed inset-0 z-[100] flex justify-center px-4">
            <div className="relative h-full w-full max-w-[470px]">
              <BrickBreaker
                image={BRICK_BALL}
                morphName={BRICK_MORPH}
                onExit={() => startTransition(() => setPlaying(false))}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---- Clips: always autoplaying, silent, looping, with no controls ----

// Part of a clip to show, as fractions of its frame (x, y = top-left; w, h = size)
type Crop = { x: number; y: number; w: number; h: number };
const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };

function Clip({ src, crop = FULL }: { src: string; crop?: Crop }) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      // never show any player chrome (no play/pause button, no PiP button)
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      // the video is blown up so the cropped part fills the card, and shifted so
      // that part sits at the card's top-left
      className="pointer-events-none absolute max-w-none object-cover"
      style={{
        width: `${100 / crop.w}%`,
        height: `${100 / crop.h}%`,
        left: `${(-crop.x / crop.w) * 100}%`,
        top: `${(-crop.y / crop.h) * 100}%`,
      }}
    />
  );
}

// the animated petal pattern (its SMIL animation runs inside <img>)
function PetalsStuff() {
  return <Image src="/v2/petal-pattern.svg" alt="" fill unoptimized className="object-cover" />;
}

// ---- The list ----

// One piece per row, or a pair side by side. Each is laid out at its own design size (w × h, in px) and
// zoomed to the column's width, so on phones it shrinks instead of reflowing.
// Clips use their video's own proportions.
// `href` makes the whole card a link (http ones open in a new tab)
type Piece = { name: string; w: number; h: number; render: () => React.ReactNode; href?: string };

const linked = (piece: Piece, href: string): Piece => ({ ...piece, href });

// `crop` trims a clip to where the action is; the card takes the cropped shape
const clip = (name: string, src: string, w = 1920, h = 1080, crop: Crop = FULL): Piece => ({
  name,
  w: w * crop.w,
  h: h * crop.h,
  render: () => <Clip src={src} crop={crop} />,
});

// Singles and pairs alternate from Ask Lovable on, for rhythm. Pairs are the
// same shape (16:9, or the same design box) so their halves line up.
const PIECES: (Piece | Piece[])[] = [
  linked(clip("Chain multiselect", "/crafts/multiselect.mp4"), "/multiselect"),
  [
    { name: "Stamp cutter", w: 312, h: 340, render: () => <StampStuff /> },
    { name: "Brick breaker", w: 312, h: 340, render: () => <BrickStuff /> },
  ],
  linked(clip("Signup form", "/crafts/signup-form.mp4"), "/form"),
  clip("Grid", "/v2/grid.mp4"),
  clip("Ask Lovable", "/crafts/ask-lovable.mp4"),
  [
    clip("Family card", "/crafts/family-card.mp4", 1280, 720),
    linked(clip("Copy SVG", "/v2/copy-svg.mp4"), "https://useiota.space/apps/patterns"),
  ],
  clip("Gooey text", "/crafts/gooey-text.mp4", 1856, 1080),
  [clip("Framer boi", "/crafts/framer-boi.mp4"), clip("Stamp loader", "/crafts/loading-animation-stamp.mp4")],
  clip("Hover to delete", "/crafts/hover-delete-option.mp4"),
  // deepseek is a touch wider than 16:9; the pair uses one 16:9 box and the clip covers it
  [clip("DeepSeek", "/crafts/deepseek-solid.mp4"), clip("Switch", "/crafts/switch.mp4")],
  linked(clip("Kitchen loaders", "/crafts/kitchen-loaders.mp4", 720, 720), "/exp"),
  clip("Tools hover", "/crafts/tools-hover.mp4", 1280, 720),
  clip("Folio", "/crafts/folio.mp4", 1280, 720),
  linked(clip("Write iota", "/crafts/write-iota.mp4"), "https://useiota.space/apps/write"),
  { name: "Petals pattern", w: 736, h: 342, render: () => <PetalsStuff /> },
];

const PieceCard = ({ piece, className = "" }: { piece: Piece; className?: string }) => {
  const box = useRef<HTMLLIElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <li
      ref={box}
      aria-label={piece.name}
      className={`group relative overflow-hidden rounded-[20px] bg-[#F2F2F2] ${className}`}
      style={{ aspectRatio: `${piece.w} / ${piece.h}` }}
    >
      {width > 0 && (
        <div
          className="relative flex items-center justify-center"
          style={{ width: piece.w, height: piece.h, zoom: width / piece.w }}
        >
          {piece.render()}
        </div>
      )}
      {/* a stretched link over the whole card */}
      {piece.href &&
        (piece.href.startsWith("http") ? (
          <a
            href={piece.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${piece.name}`}
            className="absolute inset-0 z-10 cursor-pointer rounded-[20px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400"
          />
        ) : (
          <Link
            href={piece.href}
            aria-label={`Open ${piece.name}`}
            className="absolute inset-0 z-10 cursor-pointer rounded-[20px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400"
          />
        ))}
    </li>
  );
};

// Craft panel on the home page: one piece per row (or a pair), full column width, no labels.
const Craft = () => (
  <ul className="flex flex-col gap-2.5">
    {PIECES.map((row) =>
      Array.isArray(row) ? (
        <li key={row.map((p) => p.name).join("+")} className="flex gap-2.5">
          <ul className="contents">
            {row.map((piece) => (
              <PieceCard key={piece.name} piece={piece} className="min-w-0 flex-1" />
            ))}
          </ul>
        </li>
      ) : (
        <PieceCard key={row.name} piece={row} />
      ),
    )}
  </ul>
);

export default Craft;
