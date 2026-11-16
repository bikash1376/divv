'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { TextMorph } from 'torph/react'

/*
 * A stamp cutter drawn entirely with flat CSS: no 3D transforms. The depth
 * comes from one light source (top-right) applied consistently: drop shadows
 * fall down-left, highlights sit on top-right edges, recesses are inset
 * shadows, and the window is a real hole (CSS mask) the photo shows through.
 */

// Cutter geometry, in unscaled px. The window can be resized; the body grows
// around it (wider window: wider body; taller window: everything below moves down).
const R = 40
const HX = 38 // body edge to window, left and right
const HY = 38 // body edge to window, top
const WIN_MIN = 112 // smallest (and default) window side
const WIN_MAX_W = 220
const WIN_MAX_H = 200
const WIN_STEP = 12 // one click on a resize arrow
const BASE_H = 292 // body height at the smallest window
const TEETH = 10

type Win = { w: number; h: number }
/** Body size for a window size. */
const bodySize = (win: Win) => ({ W: win.w + 2 * HX, H: BASE_H + (win.h - WIN_MIN), dy: win.h - WIN_MIN })

const TILE = 64
const GUTTER = 16

const PAGE_BG = '#E8E7E4'
const INK = '#3B3A37'

/**
 * Rectangle with semicircular bites along every edge, like a perforated stamp.
 * Each corner is a solid square tooth as wide as the teeth between bites. The
 * shorter side gets TEETH bites; longer sides get as many as fit at the same
 * spacing, so teeth look alike all round. Traced clockwise; arcs curve inward.
 */
function stampPath(w: number, h: number, ox = 0, oy = 0) {
  const unit = Math.min(w, h) / (TEETH + 0.36)
  const f = (n: number) => +n.toFixed(2)
  // bites along one edge of length len: count, spacing, radius, corner-to-first-centre
  const edge = (len: number) => {
    const n = Math.max(1, Math.round(len / unit - 0.36))
    const s = len / (n + 0.36)
    return { n, s, r: s * 0.32, a: s * 0.68 }
  }
  const across = edge(w)
  const down = edge(h)
  const arc = (r: number, x: number, y: number) => `A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(y)}`
  const x1 = ox + w
  const y1 = oy + h
  let d = `M${f(ox)} ${f(oy)}`
  for (let i = 0; i < across.n; i++) {
    const c = ox + across.a + i * across.s
    d += `L${f(c - across.r)} ${f(oy)}${arc(across.r, c + across.r, oy)}`
  }
  d += `L${f(x1)} ${f(oy)}`
  for (let i = 0; i < down.n; i++) {
    const c = oy + down.a + i * down.s
    d += `L${f(x1)} ${f(c - down.r)}${arc(down.r, x1, c + down.r)}`
  }
  d += `L${f(x1)} ${f(y1)}`
  for (let i = 0; i < across.n; i++) {
    const c = x1 - across.a - i * across.s
    d += `L${f(c + across.r)} ${f(y1)}${arc(across.r, c - across.r, y1)}`
  }
  d += `L${f(ox)} ${f(y1)}`
  for (let i = 0; i < down.n; i++) {
    const c = y1 - down.a - i * down.s
    d += `L${f(ox)} ${f(c + down.r)}${arc(down.r, ox, c - down.r)}`
  }
  return d + 'Z'
}

/** Body mask: the whole cutter minus the perforated window. */
const bodyMask = (win: Win) => {
  const { W, H } = bodySize(win)
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><path fill-rule='evenodd' d='M0 0H${W}V${H}H0Z${stampPath(win.w, win.h, HX, HY)}'/></svg>`,
  )}")`
}

/* ---------- sound: short filtered noise bursts, no audio files ---------- */

/* ---------- one-time hints ---------- */

const seenThisVisit = new Set<string>()
function seen(key: string) {
  try {
    if (localStorage.getItem(`stamp:${key}`) === '1') return true
  } catch {}
  return seenThisVisit.has(key)
}
function markSeen(key: string) {
  seenThisVisit.add(key)
  try {
    localStorage.setItem(`stamp:${key}`, '1')
  } catch {}
}
const CHEERS = ['u got this!', 'congrats!', 'les go!']

let audio: AudioContext | null = null
function burst(dur: number, freq: number, gain: number, type: BiquadFilterType = 'bandpass', q = 1.4) {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime + 0.001
    const buf = ctx.createBuffer(1, Math.ceil(dur * ctx.sampleRate), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const env = ctx.createGain()
    env.gain.setValueAtTime(1e-4, t)
    env.gain.exponentialRampToValueAtTime(gain, t + 0.002)
    env.gain.exponentialRampToValueAtTime(1e-4, t + dur)
    src.connect(filter).connect(env).connect(ctx.destination)
    src.start(t)
    src.stop(t + dur)
  } catch {
    // audio is a nicety; ignore if unavailable
  }
}
const clickSound = () => burst(0.03, 1800, 0.08)
const punchSound = () => {
  burst(0.12, 420, 0.5, 'lowpass', 0.7)
  burst(0.05, 2600, 0.1)
}

/* ---------- styles ---------- */

const raisedPlate: CSSProperties = {
  background: 'linear-gradient(210deg, #FBFBFA 0%, #F0EFEC 55%, #E2E1DD 100%)',
  boxShadow:
    '-5px 7px 10px #00000024, -1px 1px 2px #00000030, -1px 1px 0 #ffffff inset, 1px -1px 1px #00000012 inset',
}

const recess: CSSProperties = {
  background: '#DCDBD7',
  boxShadow:
    '-3px 4px 5px #00000040 inset, 0 0 0 1px #0000001c inset, -0.5px 0.5px 0 #ffffffc0',
}

// Brushed-metal face: fine rings over a conic sheen (light/dark wedges)
const brushed =
  'repeating-radial-gradient(circle at center, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 0.5px, transparent 0.5px, transparent 1.5px), conic-gradient(from -20deg, #f7f7f6 0deg, #a3a29e 60deg, #f2f2f0 120deg, #b0afab 180deg, #efefed 240deg, #8f8e8a 300deg, #f7f7f6 360deg)'

const fadeMask = (deg: number): CSSProperties => {
  const m = `linear-gradient(${deg}deg, transparent 0%, #fff 45%, #fff 55%, transparent 100%)`
  return { maskImage: m, WebkitMaskImage: m }
}

/* ---------- the cutter ---------- */

function CutterBody({
  win,
  pressed,
  empty,
  onKnobDown,
  onKnobUp,
  onKnobClick,
  onUpload,
  onPull,
}: {
  win: Win
  pressed: boolean
  empty: boolean
  onKnobDown: (e: ReactPointerEvent) => void
  onKnobUp: () => void
  onKnobClick: (detail: number, time: number) => void
  onUpload: () => void
  /** The knob was pulled (nearly) all the way down. */
  onPull: () => void
}) {
  const id = useId().replace(/:/g, '')
  const { W, H, dy } = bodySize(win)
  const holeD = stampPath(win.w, win.h)

  // The knob is a little spring-loaded lever: pull it down the well to cut, let go
  // and it springs back. `pressed` (a double-click cut) snaps it down and back too.
  const TRAVEL = 30 // well height 82 - knob 38 - 2 x 6 inset, less a hair
  const knobY = useMotionValue(0)
  const pulling = useRef(false) // being dragged
  const fired = useRef(false) // this pull already cut
  const justPulled = useRef(false) // swallow the click that ends a drag
  const [held, setHeld] = useState(false)
  const springBack = { type: 'spring', stiffness: 520, damping: 13 } as const // a little bounce
  useEffect(() => {
    if (pulling.current) return
    const controls = pressed
      ? animate(knobY, TRAVEL, { type: 'spring', stiffness: 1100, damping: 40 })
      : animate(knobY, 0, springBack)
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed])
  const down = pressed || held
  const mask = bodyMask(win)

  return (
    <div
      className='relative'
      style={{
        width: W,
        height: H,
        filter: 'drop-shadow(-16px 24px 22px rgba(0,0,0,0.26)) drop-shadow(-3px 5px 5px rgba(0,0,0,0.2))',
      }}
    >
      <svg className='absolute size-0' aria-hidden>
        <filter id={`${id}-noise`}>
          <feTurbulence baseFrequency='0.8' />
        </filter>
      </svg>

      {/* Body, with the window masked out so the photo shows through */}
      <div
        className='absolute inset-0'
        style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}
      >
        {/* sides: darkening toward every edge, so all four read as thick plastic */}
        <div
          className='absolute inset-0'
          style={{
            borderRadius: R,
            background:
              'linear-gradient(180deg, #0000004d 0%, #0000 45%, #0000 55%, #0000004d 100%), linear-gradient(90deg, #0000004d 0%, #0000 45%, #0000 55%, #0000004d 100%), #E4E3DF',
          }}
        />
        <div className='absolute inset-0 overflow-hidden p-[3px]' style={{ borderRadius: R }}>
          {/* rounded rim catching the light: the same bright lip on every side */}
          <div className='absolute inset-0 blur-[1px]' style={{ borderRadius: R, background: '#F4F4F3' }} />

          {/* top face */}
          <div
            className='relative size-full overflow-hidden'
            style={{
              borderRadius: R - 3,
              background: 'linear-gradient(200deg, #F8F8F6 0%, #EEEDEA 60%, #E3E2DE 100%)',
              boxShadow: '0 0 2px 0.5px #00000017 inset',
            }}
          >
            {/* window plate */}
            <div className='absolute' style={{ left: 16, top: 16, width: W - 38, height: 156 + dy, borderRadius: 30, ...raisedPlate }} />
            {/* little ejection slot under the window */}
            <div
              className='absolute'
              style={{
                left: (W - 6 - 30) / 2,
                top: 157 + dy,
                width: 30,
                height: 6,
                borderRadius: 3,
                background: '#3A3936',
                boxShadow: '-1px 1.5px 1.5px #000000b0 inset, 0.5px -0.5px 0 #ffffffa0',
              }}
            />

            {/* lever well */}
            <div className='absolute' style={{ left: (W - 6 - 44) / 2, top: 190 + dy, width: 44, height: 82, borderRadius: 16, ...recess }} />

            {/* screws */}
            {[24, W - 6 - 24 - 14].map((x, i) => (
              <div
                key={x}
                className='absolute rounded-full'
                style={{
                  left: x,
                  top: 254 + dy,
                  width: 14,
                  height: 14,
                  background:
                    'conic-gradient(from -20deg, #f7f7f6 0deg, #9a9995 90deg, #efefed 180deg, #858480 270deg, #f7f7f6 360deg)',
                  boxShadow: '-0.5px 0.5px 0 #ffffffb0, -1px 1px 2px #00000040, 0.5px -0.5px 1px #00000060 inset',
                }}
              >
                <div
                  className='absolute left-1/2 top-1/2 h-[1.5px] w-[9px] rounded-full'
                  style={{
                    background: '#5E5D59',
                    boxShadow: '-0.5px 0.5px 0 #ffffffa0',
                    transform: `translate(-50%, -50%) rotate(${i ? -35 : 25}deg)`,
                  }}
                />
              </div>
            ))}

            {/* plastic grain */}
            <div
              className='pointer-events-none absolute inset-0 mix-blend-multiply'
              style={{ filter: `url(#${id}-noise) grayscale(1)`, opacity: 0.14 }}
            />
          </div>
        </div>
      </div>

      {/* Window: inner wall shadow, lit wall and a single crisp edge, drawn over the hole */}
      <svg
        className='pointer-events-none absolute overflow-visible'
        style={{ left: HX, top: HY }}
        width={win.w}
        height={win.h}
        aria-hidden
      >
        <defs>
          <clipPath id={`${id}-hole`}>
            <path d={holeD} />
          </clipPath>

          <filter id={`${id}-soft`} x='-20%' y='-20%' width='140%' height='140%'>
            <feGaussianBlur stdDeviation='2.2' />
          </filter>
        </defs>
        <g clipPath={`url(#${id}-hole)`}>
          <path
            d={holeD}
            fill='none'
            stroke='#000'
            strokeOpacity={0.5}
            strokeWidth={9}
            filter={`url(#${id}-soft)`}
            transform='translate(-3 4)'
          />
        </g>
        {/* lit lower-left wall, inside the hole only */}
        <g clipPath={`url(#${id}-hole)`}>
          <path d={holeD} fill='none' stroke='#ffffff' strokeOpacity={0.55} strokeWidth={2} transform='translate(1 -1)' />
        </g>
        {/* one crisp edge, no doubled outline */}
        <path d={holeD} fill='none' stroke='#00000033' strokeWidth={1} />
      </svg>

      {/* Empty state: upload button sitting in the middle of the window */}
      {empty && (
        <button
          type='button'
          aria-label='Upload a photo'
          onPointerDown={(e) => {
            e.stopPropagation()
            clickSound()
          }}
          onClick={onUpload}
          className='group absolute grid cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
          style={{ left: W / 2 - 26, top: HY + win.h / 2 - 26, width: 52, height: 52, ...raisedPlate }}
        >
          <span
            className='absolute inset-0 rounded-full transition-shadow group-active:shadow-[-1px_1px_4px_0_#00000070_inset,-8px_8px_10px_0_#00000030_inset]'
            aria-hidden
          />
          <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden>
            <path d='M9 3v12M3 9h12' stroke='#6E6D69' strokeWidth='2' strokeLinecap='round' />
          </svg>
        </button>
      )}

      {/* Lever: the whole well is the hit area (double click anywhere in it cuts); the knob can be pulled down it */}
      <div
        className='absolute cursor-pointer'
        style={{ left: (W - 44) / 2, top: 3 + 190 + dy, width: 44, height: 82, borderRadius: 16 }}
        onPointerDown={onKnobDown}
        onPointerUp={onKnobUp}
        onPointerLeave={onKnobUp}
        onClick={(e) => {
          // the click that ends a pull isn't a click on the lever
          if (justPulled.current) {
            justPulled.current = false
            return
          }
          onKnobClick(e.detail, e.timeStamp)
        }}
      >
        <motion.button
          type='button'
          aria-label={empty ? 'Upload a photo' : 'Cut stamp. Double click, or pull the knob down.'}
          className='absolute left-[6px] right-[6px] top-[6px] cursor-grab overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40 active:cursor-grabbing'
          style={{
            y: knobY,
            touchAction: 'none',
            height: 38,
            borderRadius: 16 - 6,
            backgroundColor: '#E9E8E5',
            backgroundImage: brushed,
            transition: 'box-shadow 140ms',
            boxShadow: down
              ? '0 0 0 1px #00000035, -1px 1px 4px 0 #00000080 inset, -8px 8px 10px 0 #00000040 inset'
              : '0 0 0 1px #00000035, -1px 2px 4px #00000030, 1px -2px 2px 0 #00000070 inset',
          }}
          drag='y'
          dragConstraints={{ top: 0, bottom: TRAVEL }}
          dragElastic={{ top: 0.04, bottom: 0.12 }}
          dragMomentum={false}
          onPointerDown={() => {
            // a press dips the knob a touch; a drag takes over from here
            if (!pulling.current) animate(knobY, 5, { type: 'spring', stiffness: 900, damping: 30 })
          }}
          onPointerUp={() => {
            if (!pulling.current && !pressed) animate(knobY, 0, springBack)
          }}
          onDragStart={() => {
            pulling.current = true
            fired.current = false
            setHeld(true)
          }}
          onDrag={() => {
            // pulled nearly to the bottom: cut, once per pull
            if (!fired.current && knobY.get() >= TRAVEL * 0.88) {
              fired.current = true
              onPull()
            }
          }}
          onDragEnd={() => {
            pulling.current = false
            justPulled.current = true
            setHeld(false)
            animate(knobY, 0, springBack)
          }}
        >
          {/* glossy rim, gone while pressed */}
          <span
            className='absolute inset-0'
            style={{
              borderRadius: 'inherit',
              boxShadow: '0 0 0 1px #fff inset, 0 0 5px 1px #fff inset, 0 0 10px 4px #00000040 inset',
              opacity: down ? 0 : 1,
              transition: 'opacity 140ms',
              ...fadeMask(130),
            }}
            aria-hidden
          />
          {/* grip ridges */}
          <span
            className='absolute left-1/2 top-1/2 h-[13px] w-[16px] -translate-x-1/2 -translate-y-1/2'
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, #00000045 0px, #00000045 1px, #ffffffb0 1px, #ffffffb0 2px, transparent 2px, transparent 4.5px)',
            }}
            aria-hidden
          />
        </motion.button>
      </div>
    </div>
  )
}

/* ---------- page ---------- */

type View = { x: number; y: number; s: number; fit: number }
/** One rendered look of a stamp. */
type Pic = { url: string; blob: Blob }
/** A stamp in both looks: `white` (picture on white perforated paper, the default) and `cut` (picture cut to the perforation). */
type Stamp = { id: number; rot: number; sample?: boolean; white: Pic; cut: Pic }
type Variant = 'white' | 'cut'

const pic = (blob: Blob): Pic => ({ blob, url: URL.createObjectURL(blob) })

// Sample stamps that fill the tray on first visit, in order: square crops of
// images in /public, cut at load time (centre x/y as fractions of the image's
// width/height, side length as a fraction of its width).
type Sample = { src: string; cx: number; cy: number; size: number }
const SAMPLES: Sample[] = [
  { src: '/cutouts/stamp-2.png', cx: 0.5, cy: 0.5, size: 0.92 }, // already perforated: trimmed inside its edge
  { src: '/image3.jpg', cx: 0.395, cy: 0.695, size: 0.1 }, // purple sticky note
  { src: '/cutouts/thumb-1.png', cx: 0.447, cy: 0.387, size: 0.862 }, // goat with the cup
  { src: '/cutouts/thumb-3.jpg', cx: 0.5, cy: 0.5, size: 1 }, // portrait
  { src: '/cutouts/thumb-4.png', cx: 0.1944, cy: 0.5, size: 0.3889 }, // trees, hills and sky
]

const toPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'))

/**
 * Draw the rectangle (sx, sy, sw x sh) of `src` as an outW x outH stamp (same
 * aspect), in both looks:
 * - white: white perforated paper with the picture inset, like a postage stamp
 * - cut: the picture itself cut to the perforated edge
 * Both are drawn before this returns; only the PNG encoding is async.
 */
function renderStamps(
  src: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  outW: number,
  outH: number,
) {
  const edge = new Path2D(stampPath(outW, outH))
  const canvas = () => {
    const c = document.createElement('canvas')
    c.width = outW
    c.height = outH
    return [c, c.getContext('2d')!] as const
  }

  const [cut, cctx] = canvas()
  cctx.clip(edge)
  const f = outW / sw
  cctx.setTransform(f, 0, 0, f, -sx * f, -sy * f)
  cctx.drawImage(src, 0, 0)

  const [white, wctx] = canvas()
  wctx.clip(edge)
  wctx.fillStyle = '#FFFFFF'
  wctx.fillRect(0, 0, outW, outH)
  const m = Math.round(Math.min(outW, outH) * 0.065) // paper margin: just clear of the perforations
  const iw = outW - 2 * m
  const ih = outH - 2 * m
  wctx.beginPath()
  wctx.rect(m, m, iw, ih)
  wctx.clip()
  // Fill the inset with only the part of the window that's over the picture, so
  // the paper margin stays even when the cutter hangs off the photo's edge
  // (that strip would otherwise show as extra white on one side). Cover-fit, centred.
  const srcW = src instanceof HTMLImageElement ? src.naturalWidth : (src as HTMLCanvasElement).width
  const srcH = src instanceof HTMLImageElement ? src.naturalHeight : (src as HTMLCanvasElement).height
  const vx = Math.max(sx, 0)
  const vy = Math.max(sy, 0)
  const vw = Math.max(1, Math.min(sx + sw, srcW) - vx)
  const vh = Math.max(1, Math.min(sy + sh, srcH) - vy)
  const g = Math.max(iw / vw, ih / vh)
  wctx.setTransform(g, 0, 0, g, m + (iw - vw * g) / 2 - vx * g, m + (ih - vh * g) / 2 - vy * g)
  wctx.drawImage(src, 0, 0)

  return { white: toPng(white), cut: toPng(cut) }
}

/**
 * The copy that goes on the clipboard. Apps that drop transparency (WhatsApp, on
 * Windows via the clipboard bitmap) show whatever colour hides in transparent
 * pixels, and a canvas stores those as black. So the grooves get white at
 * alpha 1/255: invisible where transparency works, white where it doesn't.
 * Downloads keep the plain, fully transparent PNG.
 */
async function forClipboard(blob: Blob) {
  const img = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(255, 255, 255, 0.004)'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0)
  img.close()
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'))
}

const randomTilt = () => Math.round((Math.random() * 2 - 1) * 6)

const secondaryBtn: CSSProperties = {
  background: '#F4F4F3',
  color: INK,
  boxShadow: '0 0 0 1px #00000014, -2px 3px 8px #0000001a, 0 1px 0 #ffffff inset',
}
const btnClass =
  'h-10 cursor-pointer rounded-full px-4 text-[14px] font-medium whitespace-nowrap outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'

type Hole = { id: number; ix: number; iy: number; iw: number; ih: number }
type Flying = Stamp & { from: { x: number; y: number; w: number; h: number } }
type Gesture =
  | { kind: 'pan'; id: number; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'pinch'; d0: number; s0: number; ax: number; ay: number }

const holesOverlap = (a: Hole, b: Hole) =>
  a.ix < b.ix + b.iw && a.ix + a.iw > b.ix && a.iy < b.iy + b.ih && a.iy + a.ih > b.iy

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export default function StampCutter() {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const viewRef = useRef<View | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const drag = useRef<{ id: number; sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null)
  const nextId = useRef(1)
  const sayTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setViewState] = useState<View | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [pressed, setPressed] = useState(false)
  const [punching, setPunching] = useState(false)
  const [stamps, setStamps] = useState<Stamp[]>([])
  const [flying, setFlying] = useState<Flying | null>(null)
  const [say, setSay] = useState<{ id: number; text: string } | null>(null)
  const [selected, setSelected] = useState<Stamp | null>(null)
  const [holes, setHoles] = useState<Hole[]>([])
  const [moving, setMoving] = useState(false)
  const originalRef = useRef<HTMLCanvasElement | null>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const narrow = size.w > 0 && size.w < 640
  // Bigger cutter: a bit on desktop, a lot on phones; never taller than the screen allows
  const [win, setWin] = useState<Win>({ w: WIN_MIN, h: WIN_MIN })
  const [resizing, setResizing] = useState(false) // the sliders toggle: shows the resize arrows
  const { W, H } = bodySize(win)
  /** On-screen scale for a body this tall: a bit bigger on desktop, never taller than the screen allows. */
  const scaleFor = (bodyH: number) => (size.h ? Math.min(narrow ? 0.92 : 1.15, (size.h - 150) / bodyH) : 1)
  const k = scaleFor(H)
  const cw = W * k
  const ch = H * k
  const empty = !view
  const cutter = pos ?? { x: (size.w - cw) / 2, y: Math.max(72, (size.h - ch) / 2 - 24) }

  // Cut the sample stamps once, so the tray isn't empty on first visit
  useEffect(() => {
    let alive = true
    const cache = new Map<string, Promise<HTMLImageElement>>()
    const load = (src: string) => {
      if (!cache.has(src))
        cache.set(
          src,
          new Promise((res, rej) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = rej
            img.src = src
          }),
        )
      return cache.get(src)!
    }
    Promise.all(
      SAMPLES.map(async (sample): Promise<Stamp> => {
        const img = await load(sample.src)
        const ss = sample.size * img.naturalWidth
        const looks = renderStamps(
          img,
          sample.cx * img.naturalWidth - ss / 2,
          sample.cy * img.naturalHeight - ss / 2,
          ss,
          ss,
          480,
          480,
        )
        const [white, cut] = await Promise.all([looks.white, looks.cut])
        return { id: nextId.current++, rot: randomTilt(), sample: true, white: pic(white), cut: pic(cut) }
      }),
    )
      .then((list) => alive && setStamps((cur) => [...cur, ...list]))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Esc closes the viewer
  useEffect(() => {
    if (!selected) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])


  const setView = (v: View | null) => {
    viewRef.current = v
    setViewState(v)
  }

  const flash = (msg: string) => {
    setSay({ id: Date.now(), text: msg })
    clearTimeout(sayTimer.current)
    sayTimer.current = setTimeout(() => setSay(null), 1800)
  }

  // Track the stage size
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      sizeRef.current = { w, h }
      setSize({ w, h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const zoomAt = (factor: number, px: number, py: number) => {
    const v = viewRef.current
    if (!v) return
    const s = clamp(v.s * factor, v.fit * 0.3, Math.max(v.fit * 12, 4))
    setView({ ...v, s, x: px - ((px - v.x) * s) / v.s, y: py - ((py - v.y) * s) / v.s })
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const paper = paperRef.current
      if (!paper) return
      const r = Math.min(1, 2800 / Math.max(img.naturalWidth, img.naturalHeight))
      paper.width = Math.round(img.naturalWidth * r)
      paper.height = Math.round(img.naturalHeight * r)
      paper.getContext('2d')?.drawImage(img, 0, 0, paper.width, paper.height)
      const original = document.createElement('canvas')
      original.width = paper.width
      original.height = paper.height
      original.getContext('2d')?.drawImage(paper, 0, 0)
      originalRef.current = original
      setHoles([])
      URL.revokeObjectURL(url)
      const { w, h } = sizeRef.current
      const fit = Math.min((w - 48) / paper.width, (h - 200) / paper.height)
      setView({ fit, s: fit, x: (w - paper.width * fit) / 2, y: (h - paper.height * fit) / 2 - 16 })
    }
    img.src = url
  }

  // Wheel zoom (non-passive so the page doesn't scroll), paste, and +/- keys
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-tray]')) return
      if (!viewRef.current) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - rect.left, e.clientY - rect.top)
      setMoving(true)
      clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(() => setMoving(false), 220)
    }
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) loadFile(file)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const { w, h } = sizeRef.current
      if (e.key === '+' || e.key === '=') zoomAt(1.2, w / 2, h / 2)
      if (e.key === '-' || e.key === '_') zoomAt(1 / 1.2, w / 2, h / 2)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPicker = () => fileRef.current?.click()

  const lastLever = useRef(0)
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const leverClick = (detail: number, now: number) => {
    if (!viewRef.current) return openPicker()
    // Keyboard activation (Enter/Space) has no click count: cut straight away
    if (detail === 0) return cut()
    if (now - lastLever.current < 320) {
      lastLever.current = 0
      clearTimeout(hintTimer.current)
      cut()
      return
    }
    lastLever.current = now
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => {
      // Keep reminding on every lone click until they've cut a stamp once (the cheer marks that)
      if (seen('cheer')) return
      const touch = window.matchMedia('(pointer: coarse)').matches
      flash(touch ? 'double tap to cut' : 'double click to cut')
    }, 320)
  }

  /** Copy a stamp PNG. With `onDone` the caller shows the result; otherwise the cutter says it. */
  const copy = (blob: Promise<Blob>, onDone?: (ok: boolean) => void) => {
    const done = (ok: boolean) =>
      onDone ? onDone(ok) : flash(ok ? 'copied to clipboard' : 'couldn\x27t copy, it\x27s in the tray')
    // Optimistic: the write can sit pending (e.g. a permission prompt), so
    // confirm right away and only correct it if the write actually fails.
    try {
      const write = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob.then(forClipboard) })])
      done(true)
      write.catch(() => done(false))
    } catch {
      done(false)
    }
  }

  // Viewer's copy button label: morphs Copy → Copied, then back
  const [copyLabel, setCopyLabel] = useState('Copy')
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [variant, setVariant] = useState<Variant>('white')
  const openStamp = (s: Stamp) => {
    clearTimeout(copyTimer.current)
    setCopyLabel('Copy')
    setVariant('white')
    setSelected(s)
  }
  const copySelected = (s: Stamp) =>
    copy(Promise.resolve(s[variant].blob), (ok) => {
      setCopyLabel(ok ? 'Copied' : "Couldn't copy")
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopyLabel('Copy'), 1600)
    })

  function cut() {
    const paper = paperRef.current
    const v = viewRef.current
    if (!paper || !v) return openPicker()

    const holeW = win.w * k
    const holeH = win.h * k
    const hx = cutter.x + HX * k
    const hy = cutter.y + HY * k
    const ix = (hx - v.x) / v.s
    const iy = (hy - v.y) / v.s
    const iw = holeW / v.s
    const ih = holeH / v.s

    setPressed(true)
    setTimeout(() => setPressed(false), 220)

    if (ix + iw <= 0 || iy + ih <= 0 || ix >= paper.width || iy >= paper.height) {
      clickSound()
      flash('move me over the photo')
      return
    }

    punchSound()
    setPunching(true)
    setTimeout(() => setPunching(false), 160)

    // Copy the window out of the paper (before punching), in both looks
    const q = clamp(Math.max(iw, ih), 320, 1024) / Math.max(iw, ih) // output scale: long side 320..1024px
    const looks = renderStamps(paper, ix, iy, iw, ih, Math.round(iw * q), Math.round(ih * q))
    const blob = looks.white

    // ...and punch the hole out of the paper
    const p = paper.getContext('2d')!
    p.save()
    p.globalCompositeOperation = 'destination-out'
    p.fill(new Path2D(stampPath(iw, ih, ix, iy)))
    p.restore()
    setHoles((list) => [...list, { id: nextId.current++, ix, iy, iw, ih }])

    if (seen('cheer')) copy(blob)
    else {
      markSeen('cheer')
      copy(blob, (ok) => {
        flash(CHEERS[Math.floor(Math.random() * CHEERS.length)])
        setTimeout(() => flash(ok ? 'copied to clipboard' : "couldn't copy, it's in the tray"), 1300)
      })
    }
    Promise.all([looks.white, looks.cut]).then(([white, cutout]) => {
      setFlying({
        id: nextId.current++,
        white: pic(white),
        cut: pic(cutout),
        rot: randomTilt(),
        from: { x: hx, y: hy, w: holeW, h: holeH },
      })
    })
  }

  /* --- resizing the window from the arrows: click = one step, hold + drag = continuous --- */

  type Axis = 'w' | 'h'
  const maxOf = (axis: Axis) => (axis === 'w' ? WIN_MAX_W : WIN_MAX_H)
  const resizeDrag = useRef<{
    axis: Axis
    id: number
    sx: number
    sy: number
    start: Win
    at: { x: number; y: number }
    anchored: boolean
    moved: boolean
  } | null>(null)

  /**
   * Set one side of the window. Once the cutter has been placed, it grows toward
   * the arrow: the opposite edge (right for width, bottom for height) stays put.
   * Left centred, it simply stays centred.
   */
  const applyWin = (next: Win, start: Win, at: { x: number; y: number }, anchored: boolean) => {
    setWin(next)
    if (!anchored) return
    const before = bodySize(start)
    const after = bodySize(next)
    const k0 = scaleFor(before.H)
    const k1 = scaleFor(after.H)
    const nw = after.W * k1
    const nh = after.H * k1
    const x = next.w !== start.w ? at.x + before.W * k0 - nw : at.x
    const y = next.h !== start.h ? at.y + before.H * k0 - nh : at.y
    setPos({ x: clamp(x, 8, size.w - nw - 8), y: clamp(y, 8, size.h - nh - 8) })
  }
  const resizeTo = (axis: Axis, value: number, start: Win, at: { x: number; y: number }, anchored: boolean) =>
    applyWin({ ...start, [axis]: clamp(Math.round(value), WIN_MIN, maxOf(axis)) }, start, at, anchored)
  const winChanged = win.w !== WIN_MIN || win.h !== WIN_MIN
  const resetWin = () => {
    clickSound()
    applyWin({ w: WIN_MIN, h: WIN_MIN }, win, cutter, pos !== null)
  }

  // Clicking anywhere other than the resize controls closes them (the size you set stays)
  useEffect(() => {
    if (!resizing) return
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-resize-ui]')) return
      setResizing(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [resizing])
  const stepArrow = (axis: Axis) => {
    clickSound()
    // a step out; from the largest size, back to the smallest
    const next = win[axis] >= maxOf(axis) ? WIN_MIN : win[axis] + WIN_STEP
    resizeTo(axis, next, win, cutter, pos !== null)
  }
  const onArrowDown = (axis: Axis) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeDrag.current = {
      axis,
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      start: win,
      at: cutter,
      anchored: pos !== null,
      moved: false,
    }
  }
  const onArrowMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = resizeDrag.current
    if (!r || r.id !== e.pointerId) return
    // outward (up for height, left for width) grows; back toward the cutter shrinks
    const out = r.axis === 'w' ? r.sx - e.clientX : r.sy - e.clientY
    if (!r.moved && Math.abs(out) < 4) return
    r.moved = true
    resizeTo(r.axis, r.start[r.axis] + out / k, r.start, r.at, r.anchored)
  }
  const onArrowUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = resizeDrag.current
    if (!r || r.id !== e.pointerId) return
    resizeDrag.current = null
    if (!r.moved) stepArrow(r.axis)
  }

  /* --- cutter drag / click --- */

  const onCutterDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: cutter.x, py: cutter.y, moved: false }
  }
  const onCutterMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    if (!d.moved) setResizing(false)
    d.moved = true
    setPos({ x: clamp(d.px + dx, 8, size.w - cw - 8), y: clamp(d.py + dy, 8, size.h - ch - 8) })
  }
  const onCutterUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    // A plain click on the body does nothing: cutting is a double click on the lever
  }
  const onCutterKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const step = e.shiftKey ? 32 : 8
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[e.key]) {
      e.preventDefault()
      const [dx, dy] = moves[e.key]
      setPos({ x: clamp(cutter.x + dx, 8, size.w - cw - 8), y: clamp(cutter.y + dy, 8, size.h - ch - 8) })
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      cut()
    }
  }

  /* --- stage pan / pinch --- */

  const local = (e: ReactPointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const startGesture = () => {
    const v = viewRef.current
    if (!v) return
    const pts = [...pointers.current.entries()]
    if (pts.length >= 2) {
      const [a, b] = [pts[0][1], pts[1][1]]
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      gesture.current = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: v.s, ax: (mx - v.x) / v.s, ay: (my - v.y) / v.s }
    } else if (pts.length === 1) {
      const [id, p] = pts[0]
      gesture.current = { kind: 'pan', id, sx: p.x, sy: p.y, vx: v.x, vy: v.y }
    } else gesture.current = null
  }
  const onStageDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!viewRef.current || (e.target as HTMLElement).closest('[data-tray]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, local(e))
    startGesture()
  }
  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, local(e))
    const g = gesture.current
    const v = viewRef.current
    if (!g || !v) return
    if (g.kind === 'pan' && g.id === e.pointerId) {
      const p = pointers.current.get(e.pointerId)!
      setView({ ...v, x: g.vx + p.x - g.sx, y: g.vy + p.y - g.sy })
      setMoving(true)
    } else if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      const s = clamp((g.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, v.fit * 0.3, Math.max(v.fit * 12, 4))
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      setView({ ...v, s, x: mx - g.ax * s, y: my - g.ay * s })
      setMoving(true)
    }
  }
  const onStageUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return
    startGesture()
    if (!pointers.current.size) setMoving(false)
  }

  /**
   * Put a cutout back in one click: restore it and every hole overlapping it
   * (cutting twice in one spot stacks holes), copying their squares from the
   * untouched photo, then re-punch the holes that remain.
   */
  const retake = (hole: Hole) => {
    const paper = paperRef.current
    const original = originalRef.current
    if (!paper || !original) return
    const ctx = paper.getContext('2d')!
    const group = holes.filter((h) => holesOverlap(h, hole))
    for (const g of group) {
      const x0 = Math.max(0, Math.floor(g.ix) - 2)
      const y0 = Math.max(0, Math.floor(g.iy) - 2)
      const x1 = Math.min(paper.width, Math.ceil(g.ix + g.iw) + 2)
      const y1 = Math.min(paper.height, Math.ceil(g.iy + g.ih) + 2)
      if (x1 > x0 && y1 > y0) {
        ctx.clearRect(x0, y0, x1 - x0, y1 - y0)
        ctx.drawImage(original, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0)
      }
    }
    const rest = holes.filter((h) => !group.includes(h))
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    for (const h of rest) ctx.fill(new Path2D(stampPath(h.iw, h.ih, h.ix, h.iy)))
    ctx.restore()
    setHoles(rest)
  }

  const [introAsk, setIntroAsk] = useState(false)
  const onIntroClick = () => {
    clickSound()
    if (introAsk) openPicker()
    else setIntroAsk(true)
  }

  const bubble = empty
    ? { key: 'intro', text: introAsk ? 'upload an image' : 'hey, i can create stamps', delay: 0.35 }
    : say && { key: say.id, text: say.text, delay: 0 }

  const trayRef = useRef<HTMLDivElement>(null)
  const trayRowRef = useRef<HTMLDivElement>(null)
  const [trayFade, setTrayFade] = useState({ l: false, r: false })
  const measureTray = () => {
    const el = trayRef.current
    if (!el) return
    const l = el.scrollLeft > 1
    const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setTrayFade((f) => (f.l === l && f.r === r ? f : { l, r }))
  }
  const FADE = 48
  const trayMaskImage = `linear-gradient(to right, transparent 0, #000 ${trayFade.l ? FADE : 0}px, #000 calc(100% - ${trayFade.r ? FADE : 0}px), transparent 100%)`
  const trayMask: CSSProperties = { maskImage: trayMaskImage, WebkitMaskImage: trayMaskImage }

  // Re-measure the tray fades whenever the tray or its row of stamps resizes
  useEffect(() => {
    const ro = new ResizeObserver(() => measureTray())
    if (trayRef.current) ro.observe(trayRef.current)
    if (trayRowRef.current) ro.observe(trayRowRef.current)
    return () => ro.disconnect()
  }, [])


  // New stamps land in the first slot after the + tile
  const trayTarget = { x: GUTTER + TILE + 12, y: size.h - GUTTER - TILE }

  return (
    <main className='fixed inset-0 select-none overflow-hidden' style={{ background: PAGE_BG, color: INK }}>
      <div
        ref={stageRef}
        className={`absolute inset-0 touch-none ${view ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={onStageDown}
        onPointerMove={onStageMove}
        onPointerUp={onStageUp}
        onPointerCancel={onStageUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) loadFile(file)
        }}
      >
        {/* The photo, as paper: punched holes show the table underneath */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.08)) drop-shadow(-8px 12px 18px rgba(0,0,0,0.12))' }}
        >
          <canvas
            ref={paperRef}
            className='absolute left-0 top-0 origin-top-left'
            style={{
              visibility: view ? 'visible' : 'hidden',
              transform: view ? `translate(${view.x}px, ${view.y}px) scale(${view.s})` : undefined,
            }}
          />
        </div>

        {/* "retake" in each cutout: hidden while the photo moves or the cutter sits over it */}
        <AnimatePresence>
          {view &&
            !moving &&
            holes.map((h, i) => {
              if (holes.slice(i + 1).some((later) => holesOverlap(later, h))) return null
              const hw = h.iw * view.s
              const hh = h.ih * view.s
              const left = view.x + h.ix * view.s
              const top = view.y + h.iy * view.s
              const underCutter =
                left < cutter.x + cw && left + hw > cutter.x && top < cutter.y + ch && top + hh > cutter.y
              if (underCutter) return null
              return (
                <motion.button
                  key={h.id}
                  type='button'
                  aria-label='Retake: put this cutout back'
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    clickSound()
                  }}
                  onClick={() => retake(h)}
                  className='absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-full px-3.5 py-[5px] text-[20px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
                  style={{
                    left: left + hw / 2,
                    top: top + hh / 2,
                    background: INK,
                    color: '#F4F4F3',
                    fontFamily: 'var(--font-caveat), cursive',
                    boxShadow: '-2px 4px 10px #00000026',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                >
                  retake
                </motion.button>
              )
            })}
        </AnimatePresence>

        {/* Cut stamps: ends fade out only when there's more to scroll that way */}
        <div
          ref={trayRef}
          data-tray
          onScroll={measureTray}
          className='no-scrollbar absolute overflow-x-auto px-4 pb-5 pt-4'
          style={{ left: GUTTER - 16, right: 0, bottom: GUTTER - 20, ...trayMask }}
        >
          <div ref={trayRowRef} className='flex w-max gap-3'>
          <button
            type='button'
            aria-label='Upload a photo'
            onPointerDown={clickSound}
            onClick={openPicker}
            className='group relative grid shrink-0 cursor-pointer place-items-center rounded-[18px] outline-none transition-transform active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
            style={{ width: TILE, height: TILE, ...raisedPlate }}
          >
            <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden>
              <path d='M9 3v12M3 9h12' stroke='#6E6D69' strokeWidth='2' strokeLinecap='round' />
            </svg>
          </button>
          {stamps.map((s) => (
            <motion.button
              key={s.id}
              layout
              type='button'
              aria-label={s.sample ? 'View sample stamp' : 'View stamp'}
              onPointerDown={clickSound}
              onClick={() => openStamp(s)}
              className='shrink-0 cursor-pointer outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
              style={{ width: TILE, height: TILE }}
            >
              {selected?.id !== s.id && (
                <motion.img
                  layoutId={`stamp-${s.id}`}
                  src={s.white.url}
                  alt=''
                  draggable={false}
                  className='size-full object-contain'
                  initial={false}
                  animate={{ rotate: s.rot }}
                  style={{ filter: 'drop-shadow(-2px 3px 3px rgba(0,0,0,0.22))' }}
                />
              )}
            </motion.button>
          ))}
          </div>
        </div>

        {/* A fresh stamp sliding from under the cutter to the tray */}
        {flying && (
          <motion.img
            key={flying.id}
            src={flying.white.url}
            alt=''
            className='pointer-events-none absolute left-0 top-0 object-contain'
            style={{ filter: 'drop-shadow(-3px 5px 5px rgba(0,0,0,0.25))' }}
            initial={{ x: flying.from.x, y: flying.from.y, width: flying.from.w, height: flying.from.h, rotate: 0 }}
            animate={{
              x: trayTarget.x,
              y: trayTarget.y,
              width: TILE,
              height: TILE,
              rotate: flying.rot,
            }}
            transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1], delay: 0.08 }}
            onAnimationComplete={() => {
              setStamps((list) => [flying, ...list])
              setFlying(null)
            }}
          />
        )}

        {size.w > 0 && (
          <div
            role='group'
            aria-label='Stamp cutter. Drag or use arrow keys to move, press Enter to cut.'
            tabIndex={0}
            onPointerDown={onCutterDown}
            onPointerMove={onCutterMove}
            onPointerUp={onCutterUp}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onCutterKey}
            className='absolute left-0 top-0 cursor-grab rounded-[40px] outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/30 active:cursor-grabbing'
            style={{ width: cw, height: ch, transform: `translate(${cutter.x}px, ${cutter.y}px)` }}
          >
            <div
              className='origin-top-left'
              style={{
                transform: `scale(${k * (punching ? 0.985 : 1)})`,
                transition: 'transform 120ms cubic-bezier(.3,.7,.4,1)',
              }}
            >
              <CutterBody
                win={win}
                pressed={pressed}
                empty={empty}
                onKnobDown={(e) => {
                  e.stopPropagation()
                  clickSound()
                }}
                onKnobUp={() => {}}
                onKnobClick={leverClick}
                onUpload={openPicker}
                onPull={cut}
              />
            </div>

            {/* Resize arrows (shown by the sliders toggle): ↑ makes the window taller, ← wider */}
            <AnimatePresence>
              {resizing &&
                (['h', 'w'] as const).map((axis) => {
                  const atMax = win[axis] >= maxOf(axis)
                  // pointing out grows; at the limit it points back in (a click resets to the smallest)
                  const d =
                    axis === 'h'
                      ? atMax
                        ? 'M7 11 L14 18 L21 11'
                        : 'M7 17 L14 10 L21 17'
                      : atMax
                        ? 'M11 7 L18 14 L11 21'
                        : 'M17 7 L10 14 L17 21'
                  return (
                    <motion.button
                      key={axis}
                      type='button'
                      data-resize-ui
                      aria-label={
                        axis === 'h'
                          ? atMax
                            ? 'Window is at its tallest: reset height'
                            : `Make the window taller (now ${win.h}px). Drag up or down to resize.`
                          : atMax
                            ? 'Window is at its widest: reset width'
                            : `Make the window wider (now ${win.w}px). Drag left or right to resize.`
                      }
                      onPointerDown={onArrowDown(axis)}
                      onPointerMove={onArrowMove}
                      onPointerUp={onArrowUp}
                      onPointerCancel={() => (resizeDrag.current = null)}
                      onClick={(e) => {
                        // pointer clicks are handled on pointer-up; this is Enter/Space
                        if (e.detail === 0) stepArrow(axis)
                      }}
                      className='absolute grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
                      style={{
                        ...(axis === 'h'
                          ? { left: cw / 2 - 22, top: -60 }
                          : { left: -60, top: (HY + win.h / 2) * k - 22 }),
                        cursor: axis === 'h' ? 'ns-resize' : 'ew-resize',
                        touchAction: 'none',
                      }}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    >
                      <motion.svg
                        width='28'
                        height='28'
                        viewBox='0 0 28 28'
                        aria-hidden
                        animate={atMax ? {} : axis === 'h' ? { y: [0, -3, 0] } : { x: [0, -3, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <path
                          d={d}
                          fill='none'
                          stroke={INK}
                          strokeOpacity={0.8}
                          strokeWidth='3'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </motion.svg>
                    </motion.button>
                  )
                })}
            </AnimatePresence>

            {/* Reset, as a bubble beside the cutter while the resize controls are out */}
            <AnimatePresence>
              {resizing && winChanged && (
                <motion.div
                  key='reset'
                  data-resize-ui
                  className='absolute'
                  style={{ left: cw + 6, bottom: ch - 50 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  {[
                    { s: 7, x: 0, y: 0, d: 0 },
                    { s: 11, x: 10, y: -14, d: 0.06 },
                  ].map((dot) => (
                    <motion.span
                      key={dot.s}
                      className='pointer-events-none absolute rounded-full'
                      style={{ width: dot.s, height: dot.s, left: dot.x, bottom: -dot.y, background: INK }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20, delay: dot.d }}
                    />
                  ))}
                  <motion.button
                    type='button'
                    aria-label='Reset the window to its original size'
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={resetWin}
                    className={`absolute cursor-pointer whitespace-nowrap rounded-full leading-none outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40 ${narrow ? 'px-3.5 py-[6px] text-[18px]' : 'px-[18px] py-[7px] text-[22px]'}`}
                    style={{
                      left: 20,
                      bottom: narrow ? 24 : 28,
                      background: INK,
                      color: '#F4F4F3',
                      fontFamily: 'var(--font-caveat), cursive',
                      boxShadow: '-2px 4px 10px #00000026',
                      transformOrigin: 'bottom left',
                    }}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
                  >
                    reset
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thought bubble: the intro line until a photo loads, then short messages after a cut */}
            <AnimatePresence>
              {bubble && !resizing && (
                <motion.div
                  key={bubble.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <div
                    className='pointer-events-none absolute'
                    style={narrow ? { left: cw / 2, bottom: ch + 14 } : { left: cw + 6, bottom: ch - 50 }}
                  >
                    {[
                      { s: 7, x: 0, y: 0, d: bubble.delay },
                      { s: 11, x: 10, y: -14, d: bubble.delay + 0.08 },
                    ].map((dot) => (
                      <motion.span
                        key={dot.s}
                        className='absolute rounded-full'
                        style={{ width: dot.s, height: dot.s, left: dot.x, bottom: -dot.y, background: INK }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: dot.d }}
                      />
                    ))}
                    <motion.p
                      className={`absolute whitespace-nowrap rounded-full leading-none ${narrow ? 'px-3.5 py-[6px] text-[18px]' : 'px-[18px] py-[7px] text-[22px]'}`}
                      style={{
                        left: narrow ? -50 : 20,
                        bottom: narrow ? 24 : 28,
                        background: INK,
                        color: '#F4F4F3',
                        fontFamily: 'var(--font-caveat), cursive',
                        boxShadow: '-2px 4px 10px #00000026',
                        transformOrigin: 'bottom left',
                        pointerEvents: bubble.key === 'intro' ? 'auto' : 'none',
                        cursor: bubble.key === 'intro' ? 'pointer' : undefined,
                      }}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22, delay: bubble.delay + 0.16 }}
                      {...(bubble.key === 'intro' && {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': introAsk ? 'Upload an image' : 'Hey, I can create stamps. Click for more.',
                        onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
                        onClick: onIntroClick,
                        onKeyDown: (e: KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onIntroClick()
                          }
                        },
                      })}
                    >
                      <TextMorph duration={350} ease='cubic-bezier(0.19, 1, 0.22, 1)' className='whitespace-nowrap'>
                        {bubble.text}
                      </TextMorph>
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sliders toggle: shows or hides the resize arrows */}
      <button
        type='button'
        data-resize-ui
        aria-pressed={resizing}
        aria-label={resizing ? 'Done resizing the window' : 'Resize the cutter window'}
        onPointerDown={clickSound}
        onClick={() => setResizing((r) => !r)}
        className='absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
        style={{ color: resizing ? INK : '#B5B4B0' }}
      >
        {/* two sliders: rounded tracks with filled knobs */}
        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor' aria-hidden>
          <rect x='3' y='6.5' width='18' height='3' rx='1.5' />
          <circle cx='15' cy='8' r='3.5' />
          <rect x='3' y='14.5' width='18' height='3' rx='1.5' />
          <circle cx='9' cy='16' r='3.5' />
        </svg>
      </button>

      {/* Stamp viewer: the thumbnail morphs to the centre over a blurred page */}
      <AnimatePresence>
        {selected && (
          <motion.div key='viewer' className='fixed inset-0 z-50 grid place-items-center' exit={{ opacity: 1 }}>
            <motion.div
              className='absolute inset-0 backdrop-blur-md'
              style={{ background: '#E8E7E499' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSelected(null)}
            />
            <div className='relative flex flex-col items-center gap-10'>
              <motion.img
                layoutId={`stamp-${selected.id}`}
                src={selected[variant].url}
                alt={`${selected.sample ? 'Sample stamp' : 'Your stamp'}, ${variant === 'white' ? 'on white paper' : 'cut out'}`}
                draggable={false}
                initial={{ rotate: selected.rot }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                style={{
                  objectFit: 'contain',
                  width: Math.min(300, size.w * 0.72),
                  height: Math.min(300, size.w * 0.72),
                  filter: 'drop-shadow(-12px 18px 22px rgba(0,0,0,0.22)) drop-shadow(-2px 3px 4px rgba(0,0,0,0.18))',
                }}
              />
              <motion.div
                className='flex gap-2.5'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
              >
                <button
                  type='button'
                  onPointerDown={clickSound}
                  onClick={() => copySelected(selected)}
                  className={`${btnClass} inline-flex items-center`}
                  style={secondaryBtn}
                >
                  <TextMorph duration={350} ease='cubic-bezier(0.19, 1, 0.22, 1)' className='whitespace-nowrap'>
                    {copyLabel}
                  </TextMorph>
                </button>
                <a
                  href={selected[variant].url}
                  download={`stamp-${selected.id}${variant === 'cut' ? '-cutout' : ''}.png`}
                  onPointerDown={clickSound}
                  className={`${btnClass} inline-flex items-center`}
                  style={secondaryBtn}
                >
                  Download
                </a>
                <button
                  type='button'
                  aria-pressed={variant === 'cut'}
                  aria-label={variant === 'white' ? 'Show the cut-out version' : 'Show the white paper version'}
                  onPointerDown={clickSound}
                  onClick={() => {
                    clearTimeout(copyTimer.current)
                    setCopyLabel('Copy')
                    setVariant((v) => (v === 'white' ? 'cut' : 'white'))
                  }}
                  className={`${btnClass} inline-flex items-center`}
                  style={secondaryBtn}
                >
                  Variant
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p role='status' aria-live='polite' className='sr-only'>
        {say?.text}
      </p>

      <input
        ref={fileRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadFile(file)
          e.target.value = ''
        }}
      />
    </main>
  )
}
