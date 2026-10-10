"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

export type Kind = "circle" | "star" | "triangle" | "pentagon" | "diamond" | "heart" | "donut" | "plus" | "flower" | "bolt"
export type LoaderTheme = { colors: string[]; ink: string; kinds?: Kind[]; scale?: number }

const DEFAULT_KINDS: Kind[] = ["circle", "star", "triangle", "pentagon", "diamond"]
const START_T = 0.7

type Pt = { x: number; y: number }
type Pose = { x: number; y: number; sx: number; sy: number; turn: number }

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const easeInOut = (q: number) => q * q * (3 - 2 * q)
const easeOutBack = (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2

// Rotate around a pivot, then lift. Matches the vessel's SVG transform.
function place(p: Pt, pivot: Pt, deg: number, lift = 0): Pt {
  const a = (deg * Math.PI) / 180
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  return {
    x: pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: pivot.y + dx * Math.sin(a) + dy * Math.cos(a) - lift,
  }
}

/* ---------------------------------------------------------------- */
/* Motion                                                            */
/*                                                                   */
/* Positions inside the pan are in its local (untilted) space.       */
/* Resting shapes always show their top half above the rim, so       */
/* there are no slivers.                                             */
/* ---------------------------------------------------------------- */

const PAN = {
  pivot: { x: 272, y: 232 },
  cycle: 2.0,
  air: 0.6, // fraction of each shape's cycle spent in the air
  restY: 206, // half above the rim
  launchX: 168,
  landX: 78,
  toss: 165,
  centerX: 120,
}

const SETTLE = 0.2 // pause after landing before popping into the line-up
const BOW = 0.5 // seconds for the pop-up
const STAGGER = 0.08 // between shapes that were already resting when done
const HOLD = 0.5
const FADE = 0.3

type Ctx = { n: number; tDone: number | null }

// The pan flicks on every beat and settles once done
function vesselPose(c: Ctx, t: number) {
  const settling = c.tDone !== null && t > c.tDone
  const beat = PAN.cycle / c.n
  const damp = settling ? Math.exp(-(t - c.tDone!) * 7) : 1
  let p = (t / beat) % 1
  if (p > 0.5) p -= 1
  const g = Math.exp(-(p * p) / (2 * 0.09 * 0.09)) * damp
  return { angle: 10 * g, lift: 7 * g }
}

const toWorld = (c: Ctx, local: Pt, t: number) => {
  const v = vesselPose(c, t)
  return place(local, PAN.pivot, v.angle, v.lift)
}

type Phase =
  | { air: true; p: number; from: Pt; to: Pt; tThrow: number; tLand: number; dir: number }
  | { air: false; q: number; local: Pt }

// Where shape i is in the endless loop at time t
function phase(c: Ctx, i: number, t: number): Phase {
  const u = (((t / PAN.cycle - i / c.n) % 1) + 1) % 1
  const start = t - u * PAN.cycle
  if (u < PAN.air) {
    return {
      air: true,
      p: u / PAN.air,
      from: { x: PAN.launchX, y: PAN.restY },
      to: { x: PAN.landX, y: PAN.restY },
      tThrow: start,
      tLand: start + PAN.air * PAN.cycle,
      dir: i % 2 ? -1 : 1,
    }
  }
  const q = (u - PAN.air) / (1 - PAN.air)
  return { air: false, q, local: { x: lerp(PAN.landX, PAN.launchX, easeInOut(q)), y: PAN.restY } }
}

function loopPose(c: Ctx, i: number, t: number): Pose {
  const ph = phase(c, i, t)

  if (ph.air) {
    const a = toWorld(c, ph.from, ph.tThrow)
    const b = toWorld(c, ph.to, ph.tLand)
    const k = 0.08 * Math.abs(1 - 2 * ph.p)
    return {
      x: lerp(a.x, b.x, ph.p),
      y: lerp(a.y, b.y, ph.p) - PAN.toss * 4 * ph.p * (1 - ph.p),
      sx: 1 - k,
      sy: 1 + k,
      turn: ph.dir * easeInOut(ph.p),
    }
  }

  const w = toWorld(c, ph.local, t)
  const k = ph.q < 0.3 ? Math.sin((Math.PI * ph.q) / 0.3) : 0
  return { ...w, sx: 1 + 0.2 * k, sy: 1 - 0.25 * k, turn: vesselPose(c, t).angle / 360 }
}

// Once done: no new throws. Shapes in flight finish and land, then each one
// pops up into its spot in a line above the pan. The line fills in as
// shapes come down, the pan settles, and everything fades.
function ending(c: Ctx) {
  const tDone = c.tDone!
  let resting = 0
  const parks = Array.from({ length: c.n }, (_, i) => {
    const ph = phase(c, i, tDone)
    if (ph.air) return { at: ph.tLand, from: ph.to, landed: true, bow: ph.tLand + SETTLE }
    return { at: tDone, from: ph.local, landed: false, bow: tDone + SETTLE + resting++ * STAGGER }
  })
  const tEnd = Math.max(...parks.map((p) => p.bow)) + BOW + HOLD + FADE
  return { parks, tEnd }
}

function shapePose(c: Ctx, i: number, t: number, end: ReturnType<typeof ending> | null): Pose {
  if (!end) return loopPose(c, i, t)
  const park = end.parks[i]
  if (t < park.at) return loopPose(c, i, t)

  if (t < park.bow) {
    const w = toWorld(c, park.from, t)
    const since = t - park.at
    const sq = park.landed && since < 0.15 ? Math.sin((Math.PI * since) / 0.15) : 0
    return { ...w, sx: 1 + 0.2 * sq, sy: 1 - 0.25 * sq, turn: vesselPose(c, t).angle / 360 }
  }

  const start = toWorld(c, park.from, park.bow)
  const k = clamp01((t - park.bow) / BOW)
  const e = easeOutBack(k)
  const stretch = 0.15 * Math.sin(Math.PI * k)
  return {
    x: lerp(start.x, PAN.centerX + (i - (c.n - 1) / 2) * 38, e),
    y: lerp(start.y, 105, e),
    sx: 1 - stretch,
    sy: 1 + stretch,
    turn: 0,
  }
}

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
export function Shape({ kind, fill }: { kind: Kind; fill: string }) {
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

function PanBody({ ink }: { ink: string }) {
  return (
    <>
      <rect x={186} y={222} width={102} height={11} rx={5.5} fill={ink} />
      <path d="M34 212 H206 L194 238 Q190 245 182 245 H58 Q50 245 46 238 Z" fill={ink} />
      <rect x={30} y={207} width={180} height={9} rx={4.5} fill={ink} />
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Component                                                         */
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

type LoaderProps = {
  theme: LoaderTheme
  size?: number
  /** 3 or 5 shapes. Defaults to 3 below 72px, where 5 turns to noise. */
  count?: 3 | 5
  playing?: boolean
  /** Flip to true when loading finishes to play the ending. */
  done?: boolean
  /** Fires once the ending has played out. */
  onDone?: () => void
  label?: string
  className?: string
}

export default function Loader({
  theme,
  size = 96,
  count,
  playing = true,
  done = false,
  onDone,
  label = "Loading",
  className,
}: LoaderProps) {
  const n = count ?? (size < 72 ? 3 : 5)
  const reduced = useReducedMotion()
  const [clock, setClock] = useState<{ t: number; doneAt: number | null }>({ t: START_T, doneAt: null })

  const doneRef = useRef(done)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = done
    onDoneRef.current = onDone
  })

  const ctx: Ctx = { n, tDone: clock.doneAt }
  const end = clock.doneAt === null ? null : ending(ctx)
  const finished = end !== null && clock.t >= end.tEnd
  const running = playing && !reduced && !(finished && done)

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      setClock((s) => ({ t: s.t + dt, doneAt: doneRef.current ? (s.doneAt ?? s.t) : null }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  useEffect(() => {
    if (finished && done) onDoneRef.current?.()
  }, [finished, done])

  const t = end ? Math.min(clock.t, end.tEnd) : clock.t
  const opacity = end ? clamp01((end.tEnd - t) / FADE) : 1

  return (
    <div role="status" aria-label={label} className={className}>
      <svg viewBox="0 0 300 300" width={size} height={size} className="h-auto max-w-full" style={{ opacity }} aria-hidden>
        <Art ctx={ctx} t={t} end={end} theme={theme} />
      </svg>
    </div>
  )
}

function Art({ ctx, t, end, theme }: { ctx: Ctx; t: number; end: ReturnType<typeof ending> | null; theme: LoaderTheme }) {
  const v = vesselPose(ctx, t)
  const kinds = (theme.kinds ?? DEFAULT_KINDS).slice(0, ctx.n)
  const s = theme.scale ?? 1
  return (
    <>
      {kinds.map((kind, i) => {
        const p = shapePose(ctx, i, t, end)
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.sx * s} ${p.sy * s}) rotate(${p.turn * 360})`}>
            <Shape kind={kind} fill={theme.colors[i]} />
          </g>
        )
      })}
      <g transform={`translate(0 ${-v.lift}) rotate(${v.angle} ${PAN.pivot.x} ${PAN.pivot.y})`}>
        <PanBody ink={theme.ink} />
      </g>
    </>
  )
}

/**
 * The pan at time t, for drawing inside your own 300x300 SVG. Pass tDone (the
 * time loading finished) to play the ending; it's over at panEndAt(tDone).
 */
export function PanFrame({ t, theme, count = 5, tDone = null }: { t: number; theme: LoaderTheme; count?: 3 | 5; tDone?: number | null }) {
  const ctx: Ctx = { n: count, tDone }
  const end = tDone === null ? null : ending(ctx)
  const tt = end ? Math.min(t, end.tEnd) : t
  return (
    <g opacity={end ? clamp01((end.tEnd - tt) / FADE) : 1}>
      <Art ctx={ctx} t={tt} end={end} theme={theme} />
    </g>
  )
}

export const panEndAt = (tDone: number, count: 3 | 5 = 5) => ending({ n: count, tDone }).tEnd
