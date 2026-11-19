"use client"
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import {
  CutterBody,
  HX,
  HY,
  WIN_MIN,
  bodySize,
  clickSound,
  punchSound,
  renderStamps,
  stampPath,
} from "@/components/stamp/StampCutter";

/*
 * Loader experiment: the photo appears in the stamp cutter's window, the lever pulls itself, the punched stamp flies to the avatar slot (same
 * flight as the /stamp tray), the cutter and the punched photo leave, and the
 * page writes itself in. Whole thing runs ~4s.
 */

const PHOTO = "/loader/pfp.jpg";
const WIN = { w: WIN_MIN, h: WIN_MIN };
const AVATAR = 88;
const TILT = -4;

// timeline (ms from mount)
const PHOTO_AT = 350;
const CUT_AT = 1500;
const PRESS_MS = 220;
// flight: the /stamp tray's, a touch slower for the longer trip
const FLIGHT = { duration: 0.7, ease: [0.25, 0.8, 0.25, 1] as const, delay: 0.08 };

// text write-in after the stamp lands (seconds)
const TEXT_START = 0.15;
const LETTER_STAGGER = 0.005;
const LETTER_TRAVEL = 24;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type Segment = { text: string; muted?: boolean; href?: string };
const PARAGRAPHS: Segment[][] = [
  [
    { text: "Designer & developer crafting interfaces for small teams, and " },
    { text: "tinkering on side projects", muted: true, href: "/#projects" },
    { text: "." },
  ],
  [
    { text: "Lately I've been making small tools and toys for the web — like " },
    { text: "a stamp cutter", muted: true, href: "/stamp" },
    { text: ", which is how this picture got here." },
  ],
  [
    { text: "Reach out at " },
    { text: "bikash13763@gmail.com", href: "mailto:bikash13763@gmail.com" },
    { text: " — I'm open to work." },
  ],
];

// letters grouped into words (so lines wrap between words), indexed across the whole text
type Token = { space: string } | { letters: { char: string; index: number }[] };
const TOKENS = (() => {
  let index = 0;
  return PARAGRAPHS.map((p) =>
    p.map((s) =>
      s.text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part): Token =>
          /^\s+$/.test(part) ? { space: part } : { letters: part.split("").map((char) => ({ char, index: index++ })) },
        ),
    ),
  );
})();
const LETTER_COUNT = TOKENS.flat(2).reduce((n, t) => ("letters" in t ? n + t.letters.length : n), 0);
const TEXT_END = TEXT_START + LETTER_COUNT * LETTER_STAGGER;

type Rect = { x: number; y: number; w: number; h: number };
type Stage = "cutter" | "photo" | "cut" | "landed";

function Loader({ onReplay }: { onReplay: () => void }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState<Stage>("cutter");
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const [flight, setFlight] = useState<{ from: Rect; to: Rect } | null>(null);
  const [reduced, setReduced] = useState(false);

  // viewport size (measured after mount, so server and client render the same)
  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // cutter geometry on screen: centred, never bigger than actual size
  const { W, H } = bodySize(WIN);
  const k = vp ? Math.min(1, (vp.h - 160) / H, (vp.w - 32) / W) : 1;
  const cutter = vp ? { x: (vp.w - W * k) / 2, y: (vp.h - H * k) / 2 } : { x: 0, y: 0 };
  const hole: Rect = { x: cutter.x + HX * k, y: cutter.y + HY * k, w: WIN.w * k, h: WIN.h * k };
  // the photo sits exactly under the window, so what you see in it is exactly the stamp
  const photo: Rect = hole;

  // load the photo
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      setImg(image);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // no loader: just the stamp
        setReduced(true);
        const s = Math.min(image.naturalWidth, image.naturalHeight);
        renderStamps(image, (image.naturalWidth - s) / 2, (image.naturalHeight - s) / 2, s, s, 480, 480).white.then(
          (blob) => alive && setStampUrl(URL.createObjectURL(blob)),
        );
        setStage("landed");
      }
    };
    image.src = PHOTO;
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => () => void (stampUrl && URL.revokeObjectURL(stampUrl)), [stampUrl]);

  // paint the photo onto the paper canvas (cover-fit square)
  useEffect(() => {
    const paper = paperRef.current;
    if (!img || !paper) return;
    const n = Math.min(img.naturalWidth, img.naturalHeight);
    paper.width = n;
    paper.height = n;
    paper.getContext("2d")?.drawImage(img, (img.naturalWidth - n) / 2, (img.naturalHeight - n) / 2, n, n, 0, 0, n, n);
  }, [img, vp]);

  // photo onto the table
  useEffect(() => {
    if (!vp || !img || stage !== "cutter") return;
    const t = setTimeout(() => setStage("photo"), PHOTO_AT);
    return () => clearTimeout(t);
  }, [vp, img, stage]);

  // pull the lever, punch the window out of the photo, send the stamp off
  useEffect(() => {
    if (stage !== "photo") return;
    const t = setTimeout(() => {
      const slot = slotRef.current?.getBoundingClientRect();
      const paper = paperRef.current;
      if (!slot || !paper) return;
      // the window, in canvas px
      const f = paper.width / photo.w;
      const ix = (hole.x - photo.x) * f;
      const iy = (hole.y - photo.y) * f;
      const iw = hole.w * f;
      const ih = hole.h * f;
      // the window frames the whole photo, so the stamp is the whole photo (white
      // paper look, like /stamp). Drawn from the untouched image, before the punch.
      const n = Math.min(img!.naturalWidth, img!.naturalHeight);
      const looks = renderStamps(img!, (img!.naturalWidth - n) / 2, (img!.naturalHeight - n) / 2, n, n, 480, 480);
      const ctx = paper.getContext("2d")!;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill(new Path2D(stampPath(iw, ih, ix, iy)));
      ctx.restore();

      setPressed(true);
      setTimeout(() => setPressed(false), PRESS_MS);
      // lever click, then the punch, as on /stamp
      clickSound();
      setTimeout(punchSound, 60);
      setStage("cut");
      const from = hole;
      const to = { x: slot.left, y: slot.top, w: slot.width, h: slot.height };
      looks.white.then((blob) => {
        setStampUrl(URL.createObjectURL(blob));
        setFlight({ from, to });
      });
    }, CUT_AT - PHOTO_AT);
    return () => clearTimeout(t);
    // geometry is derived from vp, which is stable by now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const landed = stage === "landed";
  const punching = pressed && stage === "cut";

  return (
    <main className="min-h-svh bg-[#FBFBFB] text-neutral-800 tracking-tight" style={{ fontFamily: "var(--font-inter)" }}>
      <div className="mx-auto w-full max-w-[700px] px-4 pb-24 pt-28 md:pt-[115px]">
        <header className="flex items-end justify-between gap-4">
          {/* the stamp lands here */}
          <div ref={slotRef} className="shrink-0" style={{ width: AVATAR, height: AVATAR }}>
            {landed && stampUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stampUrl}
                alt="Bikash Sahu"
                draggable={false}
                className="size-full object-contain"
                style={{ rotate: `${TILT}deg`, filter: "drop-shadow(-2px 3px 3px rgba(0,0,0,0.22))" }}
              />
            )}
          </div>
          <motion.p
            className="pb-1 text-right text-sm text-neutral-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: landed ? 1 : 0 }}
            transition={{ delay: reduced ? 0 : TEXT_START, duration: 0.5, ease: EASE_OUT }}
          >
            Updated November
          </motion.p>
        </header>

        <div className="mt-12">
          {PARAGRAPHS.map((paragraph, p) => (
            <p key={p} className={`text-lg leading-normal ${p ? "mt-6" : ""}`}>
              <span className="sr-only">{paragraph.map((s) => s.text).join("")}</span>
              {paragraph.map((segment, s) => {
                const tone = segment.muted
                  ? "text-[#A1A1A1] font-medium"
                  : segment.href
                    ? "text-neutral-950 font-medium"
                    : "text-neutral-800";
                const words = TOKENS[p][s].map((token, t) =>
                  "space" in token ? (
                    <React.Fragment key={t}>{token.space}</React.Fragment>
                  ) : (
                    <span key={t} aria-hidden className="inline-block overflow-hidden align-top">
                      {token.letters.map(({ char, index }) => (
                        <motion.span
                          key={index}
                          className="inline-block"
                          initial={{ y: LETTER_TRAVEL, opacity: 0 }}
                          animate={landed ? { y: 0, opacity: 1 } : { y: LETTER_TRAVEL, opacity: 0 }}
                          transition={
                            reduced
                              ? { duration: 0 }
                              : { delay: TEXT_START + index * LETTER_STAGGER, duration: 0.5, ease: EASE_OUT }
                          }
                        >
                          {char}
                        </motion.span>
                      ))}
                    </span>
                  ),
                );
                return segment.href ? (
                  <a
                    key={s}
                    href={segment.href}
                    aria-label={segment.text}
                    {...(segment.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                    className={`${tone} transition-colors hover:text-neutral-500`}
                  >
                    {words}
                  </a>
                ) : (
                  <span key={s} className={tone}>
                    {words}
                  </span>
                );
              })}
            </p>
          ))}

          <motion.div
            className="mt-12 flex flex-wrap gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: landed ? 1 : 0 }}
            transition={{ delay: reduced ? 0 : TEXT_END, duration: 0.5, ease: EASE_OUT }}
          >
            <a
              href="https://x.com/bikash1376"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-base text-white transition-all hover:bg-neutral-700 active:scale-96"
            >
              get in touch
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={2} />
            </a>
            <Link
              href="/#stuff"
              className="rounded-xl bg-[#F2F2F2] px-5 py-3 text-base text-neutral-800 transition-all hover:bg-[#EAEAEA] active:scale-96"
            >
              see my stuff
            </Link>
          </motion.div>
        </div>
      </div>

      {/* loader layer: photo, the flying stamp, then the cutter on top */}
      {vp && !reduced && (
        <div className="pointer-events-none fixed inset-0 z-20">
          {/* the photo, under the window; the punch takes it out */}
          <AnimatePresence>
            {!landed && (
              <motion.div
                key="photo"
                className="absolute"
                style={{
                  left: photo.x,
                  top: photo.y,
                  width: photo.w,
                  height: photo.h,
                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08)) drop-shadow(-8px 12px 18px rgba(0,0,0,0.12))",
                }}
                initial={{ opacity: 0, scale: 1.06, rotate: 2 }}
                animate={stage === "cutter" ? { opacity: 0, scale: 1.06, rotate: 2 } : { opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.4, ease: EASE_OUT } }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                <canvas ref={paperRef} className="size-full rounded-[3px]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* under the cutter, so it slides out from beneath it, like on /stamp */}
          {flight && stampUrl && !landed && (
            <motion.img
              src={stampUrl}
              alt=""
              className="absolute left-0 top-0 object-contain"
              style={{ filter: "drop-shadow(-3px 5px 5px rgba(0,0,0,0.25))" }}
              initial={{ x: flight.from.x, y: flight.from.y, width: flight.from.w, height: flight.from.h, rotate: 0 }}
              animate={{ x: flight.to.x, y: flight.to.y, width: flight.to.w, height: flight.to.h, rotate: TILT }}
              transition={FLIGHT}
              onAnimationComplete={() => setStage("landed")}
            />
          )}

          <AnimatePresence>
            {!landed && (
              <motion.div
                key="cutter"
                className="absolute left-0 top-0"
                style={{ x: cutter.x, y: cutter.y }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3, ease: EASE_OUT } }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <div
                  className="origin-top-left"
                  style={{
                    transform: `scale(${k * (punching ? 0.985 : 1)})`,
                    transition: "transform 120ms cubic-bezier(.3,.7,.4,1)",
                  }}
                >
                  <CutterBody
                    win={WIN}
                    pressed={pressed}
                    empty={false}
                    onKnobDown={() => {}}
                    onKnobUp={() => {}}
                    onKnobClick={() => {}}
                    onUpload={() => {}}
                    onPull={() => {}}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {landed && !reduced && (
          <motion.button
            type="button"
            onClick={onReplay}
            className="fixed bottom-4 right-4 cursor-pointer rounded-full bg-[#F2F2F2] px-3.5 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-[#EAEAEA] hover:text-neutral-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: TEXT_END + 0.4 }}
          >
            replay
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function LoaderPage() {
  const [run, setRun] = useState(0);
  return <Loader key={run} onReplay={() => setRun((r) => r + 1)} />;
}
