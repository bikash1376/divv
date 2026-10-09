"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

type Kind = "circle" | "star" | "triangle" | "pentagon" | "diamond" | "heart" | "donut" | "plus" | "flower" | "bolt"
const KINDS: Kind[] = ["circle", "star", "triangle", "pentagon", "diamond"]

type Vessel = "wok" | "pan"
type Pose = { x: number; y: number; sx: number; sy: number; turn: number }
type Frame = { angle: number; lift: number; shapes: Pose[] }

const START_T = 0.7
const easeInOut = (q: number) => q * q * (3 - 2 * q)

/* ---------------------------------------------------------------- */
/* Clock + reduced motion                                            */
/* ---------------------------------------------------------------- */

const REDUCED = "(prefers-reduced-motion: reduce)"
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED)
  m.addEventListener("change", cb)
  return () => m.removeEventListener("change", cb)
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false)
}

// Elapsed seconds, only advancing while playing
function useClock(playing: boolean) {
  const [t, setT] = useState(START_T)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      setT((v) => v + dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  return t
}

/* ---------------------------------------------------------------- */
/* Geometry                                                          */
/* ---------------------------------------------------------------- */

type Pt = { x: number; y: number }

// Rotate around a pivot, then lift. Matches the vessel's SVG transform.
function place(x: number, y: number, pivot: Pt, deg: number, lift = 0): Pt {
  const a = (deg * Math.PI) / 180
  const dx = x - pivot.x
  const dy = y - pivot.y
  return {
    x: pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: pivot.y + dx * Math.sin(a) + dy * Math.cos(a) - lift,
  }
}

/* ---------------------------------------------------------------- */
/* Wok: two rims run a 5-ball cascade, the wok rocks like a pendulum */
/* ---------------------------------------------------------------- */

const WOK_PIVOT = { x: 150, y: 140 }
const W_BEAT = 0.42 // one throw per beat, alternating sides
const W_DWELL = 0.55 // beats a shape sits in the wok before it's thrown again
const W_REST_Y = 196
const W_THROW_X = [122, 178] // throws go from the inside...
const W_CATCH_X = [84, 216] // ...catches land on the outside
const W_TOSS_H = 150

// Positive tilts the left side up. Peaks just after a left throw.
const tilt = (t: number) => 8 * Math.cos(Math.PI * (t / W_BEAT) - 0.4)

function wokFrame(t: number): Frame {
  const n = KINDS.length
  const air = n - W_DWELL

  const shapes = KINDS.map((_, i): Pose => {
    // Shape i is thrown on beat i, then again every n beats, alternating hands
    const beats = t / W_BEAT - i
    const cycle = Math.floor(beats / n)
    const s = beats - cycle * n
    const from = (i + cycle * n) % 2 === 0 ? 0 : 1
    const to = 1 - from
    const tThrow = t - s * W_BEAT

    if (s < air) {
      const p = s / air
      const a = place(W_THROW_X[from], W_REST_Y, WOK_PIVOT, tilt(tThrow))
      const b = place(W_CATCH_X[to], W_REST_Y, WOK_PIVOT, tilt(tThrow + air * W_BEAT))
      const k = 0.08 * Math.abs(1 - 2 * p)
      return {
        x: a.x + (b.x - a.x) * p,
        y: a.y + (b.y - a.y) * p - W_TOSS_H * 4 * p * (1 - p),
        sx: 1 - k,
        sy: 1 + k,
        turn: (from ? -1 : 1) * easeInOut(p),
      }
    }

    // In the wok: scoop from the catch point to the throw point
    const q = (s - air) / W_DWELL
    const pt = place(
      W_CATCH_X[to] + (W_THROW_X[to] - W_CATCH_X[to]) * easeInOut(q),
      W_REST_Y + 10 * Math.sin(Math.PI * q),
      WOK_PIVOT,
      tilt(t),
    )
    const k = q < 0.4 ? Math.sin((Math.PI * q) / 0.4) : 0
    return { ...pt, sx: 1 + 0.2 * k, sy: 1 - 0.25 * k, turn: tilt(t) / 360 }
  })

  return { angle: tilt(t), lift: 0, shapes }
}

/* ---------------------------------------------------------------- */
/* Pan: flicks on every beat, shapes cascade out and back in         */
/* ---------------------------------------------------------------- */

const BEAT = 0.4
const PERIOD = BEAT * KINDS.length
const AIR = 0.6 // fraction of the cycle a shape spends in the air
const PAN_PIVOT = { x: 272, y: 232 }
const REST_Y = 222
const LAUNCH_X = 168
const LAND_X = 78
const TOSS_H = 160

// 0..1 flick strength, peaking right on the beat
function flick(t: number) {
  let p = (t / BEAT) % 1
  if (p > 0.5) p -= 1
  return Math.exp(-(p * p) / (2 * 0.09 * 0.09))
}

function panFrame(t: number): Frame {
  const g = flick(t)
  const launch = place(LAUNCH_X, REST_Y, PAN_PIVOT, 10, 7)
  const land = place(LAND_X, REST_Y, PAN_PIVOT, 10, 7)

  const shapes = KINDS.map((_, i): Pose => {
    const u = (((t / PERIOD - i / KINDS.length) % 1) + 1) % 1

    if (u < AIR) {
      const p = u / AIR
      const k = 0.08 * Math.abs(1 - 2 * p)
      return {
        x: launch.x + (land.x - launch.x) * p,
        y: launch.y + (land.y - launch.y) * p - TOSS_H * 4 * p * (1 - p),
        sx: 1 - k,
        sy: 1 + k,
        turn: (i % 2 ? -1 : 1) * easeInOut(p),
      }
    }

    const q = (u - AIR) / (1 - AIR)
    const pt = place(LAND_X + (LAUNCH_X - LAND_X) * easeInOut(q), REST_Y, PAN_PIVOT, 10 * g, 7 * g)
    const k = q < 0.25 ? Math.sin((Math.PI * q) / 0.25) : 0
    return { ...pt, sx: 1 + 0.22 * k, sy: 1 - 0.28 * k, turn: (10 * g) / 360 }
  })

  return { angle: 10 * g, lift: 7 * g, shapes }
}

/* ---------------------------------------------------------------- */
/* Themes                                                            */
/* ---------------------------------------------------------------- */

type Theme = {
  id: string
  title: string
  blurb: string
  colors: string[]
  ink: string
  kinds?: Kind[]
  card: string
}

const POP = ["#FF5A36", "#FFC21A", "#2F6BFF", "#FF7AC8", "#18C27A"]
const INK = "#1d1b19"
const PAGE_BG = "#f6f3ee"
const ICON = "#e2dcd1" // a shade darker than the page

const THEMES: Theme[] = [
  {
    id: "pop",
    title: "Pop",
    blurb: "Toy-box primaries on black vessels.",
    colors: POP,
    ink: INK,
    card: "bg-white",
  },
  {
    id: "sketch",
    title: "Wireframe",
    blurb: "Straight from your sketch: one flat grey, same motion.",
    colors: Array(5).fill("#d9d9d9"),
    ink: "#d9d9d9",
    card: "bg-white",
  },
  {
    id: "material",
    title: "Material",
    blurb: "M3 tone-80 pastels with a primary-purple vessel.",
    colors: ["#F2B8B5", "#FDD663", "#A8C7FA", "#D0BCFF", "#A8DAB5"],
    ink: "#6750A4",
    card: "bg-[#F7F2FA]",
  },
  {
    id: "kit",
    title: "Shape kit",
    blurb: "A friendlier set of shapes: heart, donut, plus, flower and bolt. Same cascade and toss.",
    kinds: ["heart", "donut", "plus", "flower", "bolt"],
    colors: ["#FF6B9A", "#FF9F1C", "#7B61FF", "#2EC4B6", "#FFD60A"],
    ink: "#2b2118",
    card: "bg-[#FFF8EC]",
  },
]

/* ---------------------------------------------------------------- */
/* Drawing                                                           */
/* ---------------------------------------------------------------- */

function poly(n: number, r: number, inner?: number) {
  const pts: string[] = []
  const count = inner ? n * 2 : n
  for (let i = 0; i < count; i++) {
    const rad = inner && i % 2 ? inner : r
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count
    pts.push(`${(rad * Math.cos(a)).toFixed(2)},${(rad * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(" ")
}

// Shapes centred on 0,0; a same-colour stroke rounds the corners
function Shape({ kind, fill }: { kind: Kind; fill: string }) {
  const common = { fill, stroke: fill, strokeWidth: 6, strokeLinejoin: "round" as const }
  switch (kind) {
    case "circle":
      return <circle r={17} fill={fill} />
    case "star":
      return <polygon points={poly(5, 19, 8.5)} {...common} />
    case "triangle":
      return <polygon points={poly(3, 17)} {...common} transform="translate(0 3)" />
    case "pentagon":
      return <polygon points={poly(5, 16)} {...common} />
    case "diamond":
      return <polygon points={poly(4, 17)} {...common} />
    case "heart":
      return <path d="M0 16 C-22 2 -17 -16 -7 -16 C-3 -16 0 -13 0 -9 C0 -13 3 -16 7 -16 C17 -16 22 2 0 16 Z" {...common} strokeWidth={3} />
    case "donut":
      return <path d="M-17 0 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0 Z M-7 0 a7 7 0 1 1 14 0 a7 7 0 1 1 -14 0 Z" fill={fill} fillRule="evenodd" />
    case "plus":
      return (
        <g fill={fill}>
          <rect x={-6.5} y={-17} width={13} height={34} rx={5} />
          <rect x={-17} y={-6.5} width={34} height={13} rx={5} />
        </g>
      )
    case "flower":
      return (
        <g fill={fill}>
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} r={8.5} cx={9 * Math.cos((a * Math.PI) / 180)} cy={9 * Math.sin((a * Math.PI) / 180)} />
          ))}
          <circle r={8} />
        </g>
      )
    case "bolt":
      return <polygon points="5,-19 -11,3 -1,3 -5,19 11,-3 1,-3" {...common} strokeWidth={4} />
  }
}

function WokBody({ ink }: { ink: string }) {
  return (
    <>
      <ellipse cx={58} cy={204} rx={12} ry={15} fill="none" stroke={ink} strokeWidth={7} />
      <ellipse cx={242} cy={204} rx={12} ry={15} fill="none" stroke={ink} strokeWidth={7} />
      <path d="M66 200 H234 Q232 266 150 270 Q68 266 66 200 Z" fill={ink} />
      <rect x={62} y={195} width={176} height={9} rx={4.5} fill={ink} />
    </>
  )
}

function PanBody({ ink }: { ink: string }) {
  return (
    <>
      <rect x={186} y={222} width={102} height={11} rx={5.5} fill={ink} />
      <path d="M34 212 H206 L194 238 Q190 245 182 245 H58 Q50 245 46 238 Z" fill={ink} />
      <rect x={30} y={207} width={180} height={9} rx={4.5} fill={ink} />
    </>
  )
}

function Scene({ frame, vessel, theme, size }: { frame: Frame; vessel: Vessel; theme: Theme; size: number }) {
  const pivot = vessel === "wok" ? WOK_PIVOT : PAN_PIVOT
  const vt = `translate(0 ${-frame.lift}) rotate(${frame.angle} ${pivot.x} ${pivot.y})`
  const kinds = theme.kinds ?? KINDS

  return (
    <svg viewBox="0 0 300 300" width={size} height={size} className="h-auto max-w-full" aria-hidden>
      {frame.shapes.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.sx} ${p.sy}) rotate(${p.turn * 360})`}>
          <Shape kind={kinds[i]} fill={theme.colors[i]} />
        </g>
      ))}
      <g transform={vt}>{vessel === "wok" ? <WokBody ink={theme.ink} /> : <PanBody ink={theme.ink} />}</g>
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* Cards                                                             */
/* ---------------------------------------------------------------- */

function LoaderCard({ theme, vessel }: { theme: Theme; vessel: Vessel }) {
  const reduced = useReducedMotion()
  const [choice, setChoice] = useState<boolean | null>(null)
  const playing = choice ?? !reduced
  const t = useClock(playing)
  const frame = vessel === "wok" ? wokFrame(t) : panFrame(t)

  return (
    <div className={`relative flex flex-col items-center rounded-3xl px-6 pb-14 pt-6 ${theme.card}`}>
      <Scene frame={frame} vessel={vessel} theme={theme} size={260} />
      <button
        type="button"
        onClick={() => setChoice(!playing)}
        aria-label={playing ? "Pause animation" : "Play animation"}
        className="absolute bottom-3 right-3 grid size-9 cursor-pointer place-items-center transition active:scale-90"
        style={{ color: ICON }}
      >
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
      </button>
    </div>
  )
}

function Mini({ vessel, size }: { vessel: Vessel; size: number }) {
  const t = useClock(!useReducedMotion())
  const frame = vessel === "wok" ? wokFrame(t) : panFrame(t)
  return <Scene frame={frame} vessel={vessel} theme={THEMES[0]} size={size} />
}

export default function Exp() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-4xl space-y-14">
        {THEMES.map((theme) => (
          <section key={theme.id}>
            <h2 className="text-lg font-semibold tracking-tight text-[#1d1b19]">{theme.title}</h2>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">{theme.blurb}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <LoaderCard theme={theme} vessel="wok" />
              <LoaderCard theme={theme} vessel="pan" />
            </div>
          </section>
        ))}

        {/* Loader sizes, to check they still read small */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-[#1d1b19]">At loader size</h2>
          <div className="mt-5 flex items-end justify-center gap-10">
            <Mini vessel="wok" size={96} />
            <Mini vessel="wok" size={48} />
            <Mini vessel="pan" size={96} />
            <Mini vessel="pan" size={48} />
          </div>
        </section>
      </div>
    </main>
  )
}
