import { createContext, useContext, type ReactNode } from "react"
import { Shape, type Kind, type LoaderTheme } from "@/components/PanLoader"

/* ---------------------------------------------------------------- */
/* Shared bits                                                       */
/* ---------------------------------------------------------------- */

const POP = ["#FF5A36", "#FFC21A", "#2F6BFF", "#FF7AC8", "#18C27A"]
const KINDS: Kind[] = ["circle", "star", "triangle", "pentagon", "diamond"]

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const frac = (v: number) => ((v % 1) + 1) % 1
const ease = (q: number) => q * q * (3 - 2 * q)
const bump = (q: number, w: number) => (q >= 0 && q < w ? Math.sin((Math.PI * q) / w) : 0)

const stretch = (p: number) => {
  const k = 0.08 * Math.abs(1 - 2 * p)
  return { sx: 1 - k, sy: 1 + k }
}

// Colours, shape set, vessel ink and shape size. Scenes take it as an argument;
// shapes read it from context so every call site doesn't have to pass it.
export type Look = LoaderTheme
const DEFAULT_LOOK: Look = { colors: POP, ink: "#1d1b19", kinds: KINDS }
const LookContext = createContext<Look>(DEFAULT_LOOK)

type ShapeProps = { k: number; x: number; y: number; sx?: number; sy?: number; r?: number; s?: number }

// Shape k from the look, with squash (sx/sy), spin (r) and scale (s)
function S({ k, x, y, sx = 1, sy = 1, r = 0, s = 1 }: ShapeProps) {
  const look = useContext(LookContext)
  const i = ((k % 5) + 5) % 5
  const size = s * (look.scale ?? 1)
  return (
    <g transform={`translate(${x} ${y}) scale(${sx * size} ${sy * size}) rotate(${r})`}>
      <Shape kind={(look.kinds ?? KINDS)[i]} fill={look.colors[i]} />
    </g>
  )
}

/* ---------------------------------------------------------------- */
/* Scenes                                                            */
/* ---------------------------------------------------------------- */

// Cocktail shaker: shake, cap pops, shapes burst out and drop back in.
function shaker(t: number, look: Look) {
  const period = 2.6
  const u = frac(t / period) * period
  const shaking = u < 1.2
  const env = shaking ? Math.sin((Math.PI * u) / 1.2) : 0
  const dy = 9 * Math.sin(2 * Math.PI * u * 5) * env
  const tiltDeg = 6 * Math.sin(2 * Math.PI * u * 2.5) * env

  const w = clamp01((u - 1.2) / 1.1)
  const capUp = u >= 1.2 && u < 2.3 ? 75 * 4 * w * (1 - w) : 0
  const capSpin = u >= 1.2 && u < 2.3 ? 360 * ease(w) : 0

  const shapes = Array.from({ length: 5 }, (_, i) => {
    const start = 1.25 + i * 0.08
    const p = (u - start) / 0.85
    if (p < 0 || p > 1) return null
    const h = 105 + 18 * (i % 3)
    return (
      <S key={i} k={i} x={150 + (i - 2) * 30 * Math.sin(Math.PI * p)} y={172 - h * 4 * p * (1 - p)} {...stretch(p)} r={(i % 2 ? -1 : 1) * 360 * p} />
    )
  })

  return (
    <>
      {shapes}
      <g transform={`translate(0 ${dy}) rotate(${tiltDeg} 150 215)`} fill={look.ink}>
        <g transform={`translate(0 ${-capUp}) rotate(${capSpin} 150 158)`}>
          <path d="M120 176 L130 150 H170 L180 176 Z" stroke={look.ink} strokeWidth={6} strokeLinejoin="round" />
          <rect x={141} y={136} width={18} height={14} rx={5} />
        </g>
        <path d="M116 180 H184 L176 264 H124 Z" stroke={look.ink} strokeWidth={8} strokeLinejoin="round" />
      </g>
    </>
  )
}

// Mixing bowl: shapes swirl round the bowl while a whisk stirs.
function whisk(t: number, look: Look) {
  const omega = (2 * Math.PI) / 1.6
  const c = { x: 150, y: 186 }

  const items = Array.from({ length: 5 }, (_, i) => {
    const th = omega * t + (i * 2 * Math.PI) / 5
    const depth = Math.sin(th)
    const hop = 9 * Math.max(0, Math.sin(3 * th + i))
    return {
      depth,
      el: <S key={i} k={i} x={c.x + 62 * Math.cos(th)} y={c.y + 15 * depth - hop} s={0.82 + 0.18 * ((depth + 1) / 2)} r={(th * 180) / Math.PI} />,
    }
  })

  const phi = omega * t * 1.3
  const hx = 150 + 26 * Math.cos(phi)
  const hy = 182 + 6 * Math.sin(phi)
  const whiskEl = (
    <g stroke={look.ink} fill="none" strokeLinecap="round" transform={`rotate(28 ${hx} ${hy})`}>
      <ellipse cx={hx} cy={hy - 22} rx={12} ry={26} strokeWidth={3.5} />
      <ellipse cx={hx} cy={hy - 22} rx={5} ry={26} strokeWidth={3.5} />
      <path d={`M${hx} ${hy - 46} V${hy - 110}`} strokeWidth={9} />
    </g>
  )

  return (
    <>
      {items.filter((it) => it.depth < 0).map((it) => it.el)}
      {whiskEl}
      {items.filter((it) => it.depth >= 0).map((it) => it.el)}
      <path d="M70 200 H230 Q228 262 150 266 Q72 262 70 200 Z" fill={look.ink} />
      <rect x={64} y={195} width={172} height={10} rx={5} fill={look.ink} />
    </>
  )
}

// Toaster: two shapes pop up together, the lever snaps, the next pair.
function toaster(t: number, look: Look) {
  const period = 1.8
  const pair = Math.floor(t / period) % 2
  const u = frac(t / period)
  const pop = u >= 0.55 ? (u - 0.55) / 0.45 : -1
  const lever = u < 0.1 ? lerp(200, 236, ease(u / 0.1)) : u < 0.55 ? 236 : 200
  const shake = 3 * bump(pop, 0.15)

  const shapes =
    pop >= 0
      ? [125, 175].map((x, j) => (
          <S key={j} k={pair * 2 + j} x={x} y={215 - 125 * 4 * pop * (1 - pop)} {...stretch(pop)} r={(j ? -1 : 1) * 200 * pop} />
        ))
      : null

  return (
    <>
      {shapes}
      <g fill={look.ink} transform={`translate(0 ${-shake})`}>
        <rect x={80} y={186} width={140} height={80} rx={26} />
        <rect x={218} y={lever - 5} width={18} height={10} rx={5} />
        <rect x={98} y={262} width={20} height={10} rx={4} />
        <rect x={182} y={262} width={20} height={10} rx={4} />
      </g>
      <g fill="#fff">
        <rect x={108} y={188} width={34} height={5} rx={2.5} />
        <rect x={158} y={188} width={34} height={5} rx={2.5} />
      </g>
    </>
  )
}

/* ---------------------------------------------------------------- */

export type Scene = { id: string; title: string; short: string; blurb: string; poster: number; draw: (t: number, look: Look) => ReactNode }

export const SCENES: Scene[] = [
  { id: "shaker", title: "Cocktail shaker", short: "Shaker", blurb: "Shake, pop the cap, shapes burst out and drop back in.", poster: 1.6, draw: shaker },
  { id: "whisk", title: "Mixing bowl", short: "Bowl", blurb: "Shapes swirl round the bowl while the whisk stirs.", poster: 0.3, draw: whisk },
  { id: "toaster", title: "Toaster", short: "Toaster", blurb: "Two at a time, with the lever snapping up.", poster: 1.35, draw: toaster },
]

export function SceneArt({ scene, t, look = DEFAULT_LOOK }: { scene: Scene; t: number; look?: Look }) {
  return <LookContext.Provider value={look}>{scene.draw(t, look)}</LookContext.Provider>
}
