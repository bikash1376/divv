"use client"
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Skeleton, useLoaded } from "@/components/Skeleton";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const MORPH = { duration: 0.5, ease: EASE_OUT };
// frames are 16:10 in the shelf and in the viewer, so the morph is a uniform scale
const RATIO = 1.6;
const THUMB_RADIUS = 14;
const VIEW_RADIUS = 20;

const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

// An image or video with a shimmering skeleton until it's ready. `preview`
// (viewer only) puts the shelf-sized copy, already loaded, underneath the large
// one, so the viewer shows something sharp-ish at once and the big file
// simply sharpens it; the skeleton then only shows for shots never loaded.
const Media = ({
  src,
  alt,
  sizes,
  fit,
  preview,
}: {
  src: string;
  alt: string;
  sizes: string;
  fit: "cover" | "contain";
  preview?: boolean;
}) => {
  const { loaded, onLoad, videoRef } = useLoaded();
  const { loaded: lowLoaded, onLoad: onLowLoad } = useLoaded();
  const fitClass = fit === "cover" ? "object-cover object-top" : "object-contain";
  if (isVideo(src))
    return (
      <>
        <Skeleton visible={!loaded} />
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onLoadedData={onLoad}
          className={`relative size-full transition-opacity duration-500 ${fitClass} ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </>
    );
  const svg = src.endsWith(".svg");
  return (
    <>
      <Skeleton visible={!loaded && !(preview && lowLoaded)} />
      {preview && !svg && (
        <Image src={src} alt="" fill sizes="340px" draggable="false" onLoad={onLowLoad} className={fitClass} />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        draggable="false"
        unoptimized={svg}
        onLoad={onLoad}
        className={`transition-opacity duration-500 ${fitClass} ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
};

// Where the viewer frame sits, and how to place it exactly over a thumbnail
// (as an offset + scale from that resting spot)
type Box = { w: number; h: number };
const viewBox = (): Box => {
  const w = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.82 * RATIO, 1600);
  return { w, h: w / RATIO };
};
type Target = { x?: number; y?: number; scale?: number; borderRadius?: number; opacity?: number };
const overThumb = (el: HTMLElement | undefined, box: Box): Target => {
  if (!el) return { opacity: 0, scale: 0.9 };
  const r = el.getBoundingClientRect();
  const scale = r.width / box.w;
  return {
    x: r.left + r.width / 2 - window.innerWidth / 2,
    y: r.top + r.height / 2 - window.innerHeight / 2,
    scale,
    // counter the scale so the corners match the thumbnail's
    borderRadius: THUMB_RADIUS / scale,
  };
};

const Arrow = ({ dir, onClick, disabled }: { dir: -1 | 1; onClick: () => void; disabled: boolean }) => (
  <button
    type="button"
    aria-label={dir < 0 ? "Previous" : "Next"}
    onClick={onClick}
    disabled={disabled}
    className="grid size-9 cursor-pointer place-items-center rounded-full bg-[#fcfbfc] shadow-[inset_0_0_1px_#00000040] transition-[opacity,transform] hover:opacity-70 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
  >
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  </button>
);

// The project's shots, left to right. Clicking one morphs it up into a viewer
// with arrows / swipe / ← → to move between shots, Esc or a backdrop click to
// close — and it flies back into whichever thumbnail you ended on.
// One shot in the viewer's run, which spans every project's shots in order
export type Shot = { src: string; project: string };

const MediaShelf = ({
  name,
  media,
  all,
  offset,
}: {
  name: string;
  media: string[];
  /** every project's shots, so the viewer can carry on past this project's */
  all: Shot[];
  /** where this project's first shot sits in `all` */
  offset: number;
}) => {
  const thumbs = useRef<HTMLButtonElement[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  // the thumbnail the viewer is standing in for, hidden until it lands back
  const [hidden, setHidden] = useState<number | null>(null);
  const [dir, setDir] = useState(0);
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  // measured in the click handlers (not during render): where the frame flies from / back to
  const [enterFrom, setEnterFrom] = useState<Target>({ opacity: 0 });
  const [exitTo, setExitTo] = useState<Target>({ opacity: 0 });

  const alt = (i: number) => `${name} — ${i + 1} of ${media.length}`;
  // `index` counts through `all`; this shelf's own thumbnail for it, if it has one
  const localOf = useCallback(
    (g: number) => (g >= offset && g < offset + media.length ? g - offset : null),
    [offset, media.length],
  );
  const current = index === null ? null : all[index];
  const inProject = index === null ? 0 : index - all.findIndex((m) => m.project === current?.project);
  const projectCount = current ? all.filter((m) => m.project === current.project).length : 0;

  const open = (i: number) => {
    const b = viewBox();
    setBox(b);
    setEnterFrom(overThumb(thumbs.current[i], b));
    setDir(0);
    setIndex(offset + i);
    setHidden(i);
  };

  const close = useCallback(() => {
    if (index === null) return;
    // a shot from another project has no thumbnail here, so it just fades away
    const local = localOf(index);
    const el = local === null ? undefined : thumbs.current[local];
    // bring the matching thumbnail into the shelf's view so there's somewhere to land
    el?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
    setExitTo(overThumb(el, box));
    setHidden(local);
    setIndex(null);
  }, [index, box, localOf]);

  const go = useCallback(
    (step: -1 | 1) =>
      setIndex((i) => {
        if (i === null) return i;
        const next = i + step;
        if (next < 0 || next >= all.length) return i;
        setDir(step);
        setHidden(localOf(next));
        return next;
      }),
    [all.length, localOf],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    const onResize = () => setBox(viewBox());
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.documentElement.style.overflow = overflow;
    };
  }, [index, close, go]);

  return (
    <>
      <div className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {media.map((src, i) => (
          <button
            key={src}
            ref={(el) => {
              if (el) thumbs.current[i] = el;
            }}
            type="button"
            aria-label={`Open ${alt(i)}`}
            onClick={() => open(i)}
            className="relative aspect-[16/10] w-[min(78%,340px)] shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-[14px] bg-[#f5f5f5] shadow-[inset_0_0_1px_#00000040]"
            style={{ opacity: hidden === i ? 0 : 1 }}
          >
            <Media src={src} alt={alt(i)} sizes="340px" fit="cover" />
          </button>
        ))}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence onExitComplete={() => setHidden(null)}>
            {index !== null && (
              <motion.div
                key="viewer"
                role="dialog"
                aria-modal
                aria-label={current?.project ?? name}
                className="fixed inset-0 z-[100] grid place-items-center"
                style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontSize: 12, lineHeight: "16px" }}
              >
                <motion.div
                  className="absolute inset-0 bg-[#fcfbfc]/85 backdrop-blur-md"
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />

                {/* the frame: starts exactly over the clicked thumbnail, ends centred */}
                <motion.div
                  className="relative overflow-hidden bg-[#f5f5f5] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.35),inset_0_0_1px_#00000040]"
                  style={{ width: box.w, height: box.h }}
                  initial={enterFrom}
                  animate={{ x: 0, y: 0, scale: 1, opacity: 1, borderRadius: VIEW_RADIUS }}
                  exit={exitTo}
                  transition={MORPH}
                >
                  <AnimatePresence initial={false} custom={dir}>
                    <motion.div
                      key={index}
                      className="absolute inset-0 touch-pan-y"
                      custom={dir}
                      variants={{
                        enter: (d: number) => ({ x: `${d * 100}%` }),
                        center: { x: 0 },
                        leave: (d: number) => ({ x: `${d * -100}%` }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="leave"
                      transition={{ duration: 0.45, ease: EASE_OUT }}
                      // swipe to move between shots
                      drag={all.length > 1 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={(_, info) => {
                        const swipe = info.offset.x + info.velocity.x * 0.2;
                        if (swipe < -80) go(1);
                        else if (swipe > 80) go(-1);
                      }}
                    >
                      <Media
                        src={all[index].src}
                        alt={`${all[index].project} — ${inProject + 1} of ${projectCount}`}
                        sizes="92vw"
                        fit="contain"
                        preview
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* controls sit under the frame */}
                <motion.div
                  className="absolute inset-x-0 flex items-center justify-center gap-3"
                  style={{ top: `calc(50% + ${box.h / 2}px + 14px)` }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.3, delay: 0.15, ease: EASE_OUT }}
                >
                  <Arrow dir={-1} onClick={() => go(-1)} disabled={index === 0} />
                  {/* project name, then where you are within it */}
                  <span className="min-w-32 text-center tabular-nums" style={{ color: "rgb(29 29 29 / 0.5)" }}>
                    <span style={{ color: "rgb(29 29 29)" }}>{current?.project}</span> · {inProject + 1} / {projectCount}
                  </span>
                  <Arrow dir={1} onClick={() => go(1)} disabled={index === all.length - 1} />
                </motion.div>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="absolute right-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full bg-[#fcfbfc] shadow-[inset_0_0_1px_#00000040] transition-opacity hover:opacity-70"
                >
                  <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default MediaShelf;
