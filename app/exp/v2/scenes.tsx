import type { ReactNode } from "react"
import { Shape, type Kind } from "../Loader"

/* ---------------------------------------------------------------- */
/* Shared bits                                                       */
/* ---------------------------------------------------------------- */

const POP = ["#FF5A36", "#FFC21A", "#2F6BFF", "#FF7AC8", "#18C27A"]
const KINDS: Kind[] = ["circle", "star", "triangle", "pentagon", "diamond"]
const INK = "#1d1b19"
const R = 17 // shape radius

type Pt = { x: number; y: number }

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const frac = (v: number) => ((v % 1) + 1) % 1
const ease = (q: number) => q * q * (3 - 2 * q)
const easeOut = (q: number) => 1 - (1 - q) ** 3
const bump = (q: number, w: number) => (q >= 0 && q < w ? Math.sin((Math.PI * q) / w) : 0)
const hash = (a: number, b: number) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)

function arc(a: Pt, b: Pt, h: number, p: number): Pt {
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) - 4 * h * p * (1 - p) }
}

function rot(p: Pt, pivot: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  return { x: pivot.x + dx * Math.cos(a) - dy * Math.sin(a), y: pivot.y + dx * Math.sin(a) + dy * Math.cos(a) }
}

type ShapeProps = { k: number; x: number; y: number; sx?: number; sy?: number; r?: number; s?: number; o?: number }

// Shape k from the palette, with squash (sx/sy), spin (r), scale (s), opacity (o)
function S({ k, x, y, sx = 1, sy = 1, r = 0, s = 1, o = 1 }: ShapeProps) {
  const i = ((k % 5) + 5) % 5
  return (
    <g transform={`translate(${x} ${y}) scale(${sx * s} ${sy * s}) rotate(${r})`} opacity={o}>
      <Shape kind={KINDS[i]} fill={POP[i]} />
    </g>
  )
}

const squash = (k: number) => ({ sx: 1 + 0.2 * k, sy: 1 - 0.25 * k })
const stretch = (p: number) => {
  const k = 0.08 * Math.abs(1 - 2 * p)
  return { sx: 1 - k, sy: 1 + k }
}

// Two-hand cascade timing for n (odd) shapes. Hand 0 throws on even beats.
function cascade(t: number, i: number, n: number, beat: number, dwell: number) {
  const air = n - dwell
  const beats = t / beat - i
  const cycle = Math.floor(beats / n)
  const s = beats - cycle * n
  const from = (i + cycle * n) % 2 === 0 ? 0 : 1
  const tThrow = t - s * beat
  if (s < air) return { air: true as const, p: s / air, from, to: 1 - from, tThrow, tLand: tThrow + air * beat }
  return { air: false as const, q: (s - air) / dwell, hand: 1 - from }
}

/* ---------------------------------------------------------------- */
/* Scenes                                                            */
/* ---------------------------------------------------------------- */

// Juggler's hands: a classic 3-ball cascade. Each hand scoops in to throw
// and swings out to catch.
function hands(t: number) {
  const n = 3
  const beat = 0.36
  const dwell = 0.6
  const throwX = [130, 170]
  const catchX = [92, 208]
  const palmY = 238
  const d = dwell / 2

  const hand = (h: number): Pt => {
    const phi = frac((t / beat - h) / 2)
    if (phi < 1 - d) {
      const u = phi / (1 - d)
      return { x: lerp(throwX[h], catchX[h], ease(u)), y: palmY - 10 * Math.sin(Math.PI * u) }
    }
    const v = (phi - (1 - d)) / d
    return { x: lerp(catchX[h], throwX[h], ease(v)), y: palmY + 12 * Math.sin(Math.PI * v) }
  }

  const hs = [hand(0), hand(1)]
  const balls = Array.from({ length: n }, (_, i) => {
    const c = cascade(t, i, n, beat, dwell)
    if (c.air) {
      const p = arc({ x: throwX[c.from], y: palmY - 22 }, { x: catchX[c.to], y: palmY - 22 }, 125, c.p)
      return <S key={i} k={i * 2} {...p} {...stretch(c.p)} r={(c.from ? -1 : 1) * 300 * c.p} />
    }
    return <S key={i} k={i * 2} x={hs[c.hand].x} y={hs[c.hand].y - 22} {...squash(bump(c.q, 0.35))} />
  })

  return (
    <>
      {balls}
      {hs.map((p, h) => (
        <g key={h} fill={INK}>
          <path d={`M${p.x} ${p.y} L${p.x + (h ? 34 : -34)} 320`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
          <ellipse cx={p.x} cy={p.y} rx={22} ry={12} />
          <ellipse cx={p.x + (h ? -19 : 19)} cy={p.y - 6} rx={6} ry={9} transform={`rotate(${h ? 30 : -30} ${p.x + (h ? -19 : 19)} ${p.y - 6})`} />
        </g>
      ))}
    </>
  )
}

// Trampoline: three shapes bounce in turn; the mat dips under each landing.
function trampoline(t: number) {
  const xs = [95, 150, 205]
  const period = 1.1
  const contact = 0.22
  const matY = 242

  const dips: number[] = []
  const shapes = xs.map((x, i) => {
    const u = frac(t / period + i / 3)
    if (u < contact) {
      const q = u / contact
      const dip = 16 * Math.sin(Math.PI * q)
      dips[i] = dip
      return <S key={i} k={i * 2 + 1} x={x} y={matY - R + dip} {...squash(Math.sin(Math.PI * q))} />
    }
    dips[i] = 0
    const p = (u - contact) / (1 - contact)
    return <S key={i} k={i * 2 + 1} x={x} y={matY - R - 135 * 4 * p * (1 - p)} {...stretch(p)} r={(i % 2 ? -1 : 1) * 360 * ease(p)} />
  })

  const pts: string[] = []
  for (let x = 50; x <= 250; x += 5) {
    const y = matY + xs.reduce((sum, xi, i) => sum + dips[i] * Math.exp(-(((x - xi) / 26) ** 2)), 0)
    pts.push(`${x},${y.toFixed(1)}`)
  }

  return (
    <>
      {shapes}
      <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 242 L38 280 M250 242 L262 280" stroke={INK} strokeWidth={8} strokeLinecap="round" />
    </>
  )
}

// Cocktail shaker: shake, cap pops, shapes burst out and drop back in.
function shaker(t: number) {
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
      <g transform={`translate(0 ${dy}) rotate(${tiltDeg} 150 215)`} fill={INK}>
        <g transform={`translate(0 ${-capUp}) rotate(${capSpin} 150 158)`}>
          <path d="M120 176 L130 150 H170 L180 176 Z" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={141} y={136} width={18} height={14} rx={5} />
        </g>
        <path d="M116 180 H184 L176 264 H124 Z" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      </g>
    </>
  )
}

// Mixing bowl: shapes swirl round the bowl while a whisk stirs.
function whisk(t: number) {
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
    <g stroke={INK} fill="none" strokeLinecap="round" transform={`rotate(28 ${hx} ${hy})`}>
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
      <path d="M70 200 H230 Q228 262 150 266 Q72 262 70 200 Z" fill={INK} />
      <rect x={64} y={195} width={172} height={10} rx={5} fill={INK} />
    </>
  )
}

// Spatula: slides under each shape in turn and flips it.
function spatula(t: number) {
  const xs = [90, 150, 210]
  const beat = 0.75
  const flight = 0.62
  const restY = 248 - R

  const shapes = xs.map((x, j) => {
    // Launches at 0.3 into each of this shape's beats (every 3 beats)
    const last = (Math.floor((t / beat - j - 0.3) / 3) * 3 + j + 0.3) * beat
    const p = (t - last) / flight
    if (p < 1) {
      const flip = Math.cos(2 * Math.PI * p)
      const sy = Math.sign(flip || 1) * Math.max(Math.abs(flip), 0.1)
      return <S key={j} k={j * 2} x={x} y={restY - 115 * 4 * p * (1 - p)} sy={sy} />
    }
    return <S key={j} k={j * 2} x={x} y={restY} {...squash(bump(p - 1, 0.25))} />
  })

  const b = Math.floor(t / beat)
  const u = frac(t / beat)
  const cur = xs[((b % 3) + 3) % 3]
  const prev = xs[(((b - 1) % 3) + 3) % 3]
  const tipX = u < 0.3 ? lerp(prev, cur, ease(u / 0.3)) : cur
  const flick = u >= 0.3 && u < 0.55 ? -26 * Math.sin((Math.PI * (u - 0.3)) / 0.25) : 0
  const end = { x: tipX + 80, y: 170 }

  return (
    <>
      <rect x={40} y={248} width={220} height={12} rx={6} fill={INK} />
      {shapes}
      <g transform={`rotate(${flick} ${end.x} ${end.y})`} fill={INK}>
        <rect x={tipX - 24} y={243} width={46} height={7} rx={3.5} />
        <path d={`M${tipX + 18} 246 L${end.x} ${end.y}`} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      </g>
    </>
  )
}

// Popcorn pot: shapes pop out at random; the lid rattles each time.
function popcorn(t: number) {
  let lift = 0
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const period = 1.3 + 0.27 * i
    const cycle = Math.floor(t / period + i * 0.31)
    const u = frac(t / period + i * 0.31) * period
    const p = u / 0.8
    if (p > 1) return null
    lift = Math.max(lift, 16 * bump(p, 0.25))
    const h = 85 + 45 * hash(cycle, i)
    const side = (hash(i, cycle) - 0.5) * 120
    const from = { x: 110 + i * 20, y: 200 }
    return <S key={i} k={i} {...arc(from, { x: from.x + side, y: 215 }, h, p)} {...stretch(p)} r={side * 3 * p} />
  })
  const jiggle = lift > 0.5 ? 5 * Math.sin(t * 60) * (lift / 16) : 0

  return (
    <>
      {shapes}
      <g fill={INK}>
        <rect x={62} y={206} width={30} height={10} rx={5} />
        <rect x={208} y={206} width={30} height={10} rx={5} />
        <rect x={85} y={192} width={130} height={76} rx={16} />
        <g transform={`translate(0 ${-lift}) rotate(${jiggle} 150 190)`}>
          <path d="M80 194 Q150 146 220 194 Z" />
          <circle cx={150} cy={162} r={8} />
        </g>
      </g>
    </>
  )
}

// Toaster: two shapes pop up together, the lever snaps, the next pair.
function toaster(t: number) {
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
      <g fill={INK} transform={`translate(0 ${-shake})`}>
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

// Seal: bounces one shape on its nose. It turns into the next shape on
// every bounce.
function seal(t: number) {
  const period = 0.85
  const u = frac(t / period)
  const k = Math.floor(t / period)
  const contact = 0.2
  const nod = u < contact ? 9 * Math.sin((Math.PI * u) / contact) : 0
  const neck = { x: 165, y: 225 }
  const nose = rot({ x: 196, y: 180 }, neck, nod)

  const ball =
    u < contact ? (
      <S k={k} x={nose.x} y={nose.y - 4 - R} {...squash(Math.sin((Math.PI * u) / contact))} />
    ) : (
      (() => {
        const p = (u - contact) / (1 - contact)
        return <S k={k} x={196} y={176 - R - 120 * 4 * p * (1 - p)} {...stretch(p)} r={360 * p} />
      })()
    )

  return (
    <>
      {ball}
      <g fill={INK}>
        <ellipse cx={128} cy={250} rx={62} ry={28} />
        <path d="M70 252 Q46 238 40 250 Q46 262 70 258 Z" />
        <ellipse cx={150} cy={266} rx={20} ry={8} transform="rotate(-20 150 266)" />
        <g transform={`rotate(${nod} ${neck.x} ${neck.y})`}>
          <ellipse cx={160} cy={222} rx={24} ry={34} transform="rotate(25 160 222)" />
          <circle cx={178} cy={196} r={24} />
          <ellipse cx={197} cy={184} rx={9} ry={7} />
          <circle cx={182} cy={188} r={3.2} fill="#fff" />
        </g>
      </g>
    </>
  )
}

// See-saw: each landing launches the shape on the other end.
function seesaw(t: number) {
  const half = 0.9
  const A = 14
  const pivot = { x: 150, y: 232 }
  const k = Math.floor(t / half)
  const u = frac(t / half)
  const target = (kk: number) => (kk % 2 === 0 ? -A : A) // even: left goes down
  const angle = lerp(target(k - 1), target(k), ease(clamp01(u / 0.15)))
  const end = (side: number, a: number) => rot({ x: side ? 248 : 52, y: pivot.y }, pivot, a)

  const shapes = [0, 1].map((side) => {
    // Left flies during odd half-periods, right during even ones
    const flying = (k % 2 === 0) === (side === 1) && u > 0.15
    const kind = side ? 2 : 0
    if (flying) {
      const p = (u - 0.15) / 0.85
      const hi = end(side, side ? -A : A) // this end in its raised position
      return <S key={side} k={kind} x={hi.x} y={hi.y - R - 4 - 125 * 4 * p * (1 - p)} {...stretch(p)} r={(side ? -1 : 1) * 360 * p} />
    }
    const e = end(side, angle)
    return <S key={side} k={kind} x={e.x} y={e.y - R - 4} {...squash(bump(u, 0.2))} />
  })

  const l = end(0, angle)
  const r = end(1, angle)
  return (
    <>
      <polygon points="150,232 128,272 172,272" fill={INK} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {shapes}
      <path d={`M${l.x} ${l.y} L${r.x} ${r.y}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
    </>
  )
}

// Fountain: shapes ride the jet up, spill to either side, drop into the basin.
function fountain(t: number) {
  const period = 2.0
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const cycle = Math.floor(t / period + i / 5)
    const u = frac(t / period + i / 5)
    if (u < 0.35) {
      const p = u / 0.35
      return <S key={i} k={i} x={150} y={lerp(240, 104, easeOut(p))} s={0.75 + 0.25 * p} r={360 * p} />
    }
    const p = (u - 0.35) / 0.65
    const side = (i + cycle) % 2 ? -1 : 1
    return <S key={i} k={i} {...arc({ x: 150, y: 104 }, { x: 150 + side * 72, y: 250 }, 22, p)} r={side * 220 * p} />
  })
  const spray = [0, 1, 2].map((j) => {
    const a = t * 6 + j * 2.1
    return <circle key={j} cx={150 + 10 * Math.sin(a)} cy={104 - 6 * Math.abs(Math.cos(a))} r={4} fill="#8EC5FF" />
  })

  return (
    <>
      <rect x={144} y={106} width={12} height={130} rx={6} fill="#8EC5FF" />
      {spray}
      {shapes}
      <path d="M62 236 H238 L226 262 Q224 268 216 268 H84 Q76 268 74 262 Z" fill={INK} />
      <rect x={56} y={229} width={188} height={10} rx={5} fill={INK} />
    </>
  )
}

// Hoop: thrown shapes swish through the net and roll back for another go.
function hoop(t: number) {
  const period = 2.4
  const rim = { x: 212, y: 118 }
  const floor = 252 - R
  let bulge = 0

  const shapes = Array.from({ length: 4 }, (_, i) => {
    const u = frac(t / period + i / 4)
    if (u < 0.38) {
      const p = u / 0.38
      return { y: 0, el: <S key={i} k={i} {...arc({ x: 60, y: floor }, rim, 90, p)} r={-400 * p} /> }
    }
    if (u < 0.52) {
      const p = (u - 0.38) / 0.14
      const y = lerp(rim.y, floor, p * p)
      if (y < 160) bulge = Math.max(bulge, Math.sin((Math.PI * (y - rim.y)) / 42))
      return { y, el: <S key={i} k={i} x={rim.x} y={y} /> }
    }
    const p = (u - 0.52) / 0.48
    const x = lerp(rim.x, 60, easeOut(p))
    return { y: floor, el: <S key={i} k={i} x={x} y={floor} r={(-(rim.x - x) / R) * (180 / Math.PI)} {...squash(bump(p, 0.12))} /> }
  })

  const netW = 10 + 6 * bulge
  return (
    <>
      <path d="M40 252 H260" stroke="#e7e2da" strokeWidth={4} strokeLinecap="round" />
      <rect x={246} y={110} width={7} height={142} rx={3.5} fill={INK} />
      <rect x={236} y={60} width={10} height={76} rx={4} fill={INK} />
      <path d={`M${rim.x - 24} ${rim.y} A24 5 0 0 1 ${rim.x + 24} ${rim.y}`} fill="none" stroke={INK} strokeWidth={4} />
      {shapes.map((s) => s.el)}
      <g stroke="#b9b3aa" strokeWidth={2} fill="none">
        {[-24, -8, 8, 24].map((dx) => (
          <path key={dx} d={`M${rim.x + dx} ${rim.y + 2} L${rim.x + dx * (netW / 24)} ${rim.y + 38}`} />
        ))}
        <path d={`M${rim.x - netW} ${rim.y + 38} H${rim.x + netW}`} />
      </g>
      <path d={`M${rim.x - 24} ${rim.y} A24 5 0 0 0 ${rim.x + 24} ${rim.y}`} fill="none" stroke={INK} strokeWidth={4} />
    </>
  )
}

// Gumball machine: turn the knob, out rolls the next shape.
function gumball(t: number) {
  const period = 1.6
  const u = frac(t / period)
  const k = Math.floor(t / period)
  const turn = u < 0.4 ? 360 * ease(u / 0.4) : 0
  const jig = u < 0.4 ? Math.sin((Math.PI * u) / 0.4) : 0
  const inside: Pt[] = [
    { x: 122, y: 150 },
    { x: 160, y: 154 },
    { x: 142, y: 126 },
    { x: 178, y: 124 },
    { x: 112, y: 116 },
  ]
  const p = (u - 0.4) / 0.6
  const out =
    p >= 0 ? (
      <S k={k} x={lerp(150, 262, easeOut(p))} y={238 + 10 * bump(p, 0.3)} r={lerp(0, 360, easeOut(p))} o={1 - clamp01((p - 0.7) / 0.3)} s={0.85} />
    ) : null

  return (
    <>
      {inside.map((pt, i) => (
        <S key={i} k={i} x={pt.x + 4 * jig * Math.sin(i * 2.3)} y={pt.y - 6 * jig * Math.abs(Math.cos(i * 1.7))} s={0.8} r={i * 40 + jig * 30} />
      ))}
      <circle cx={146} cy={128} r={62} fill="none" stroke={INK} strokeWidth={6} />
      <path d="M100 186 H192 L210 266 H82 Z" fill={INK} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <rect x={114} y={178} width={64} height={14} rx={4} fill={INK} />
      <g transform={`rotate(${turn} 146 216)`}>
        <circle cx={146} cy={216} r={14} fill="#fff" />
        <rect x={132} y={213} width={28} height={6} rx={3} fill={INK} />
      </g>
      <rect x={130} y={236} width={34} height={14} rx={5} fill="#fff" />
      {out}
    </>
  )
}

// A big ball juggling the small ones off its back as it rolls side to side.
function bigBall(t: number) {
  const n = 3
  const beat = 0.4
  const dwell = 0.5
  const Rb = 44
  const center = (tt: number): Pt => ({ x: 150 + 14 * Math.sin((Math.PI * tt) / beat), y: 236 })
  const throwDx = [-12, 12]
  const catchDx = [-32, 32]
  const onTop = (c: Pt, dx: number): Pt => ({ x: c.x + dx, y: c.y - Math.sqrt(Rb * Rb - dx * dx) - R })

  const c = center(t)
  const shapes = Array.from({ length: n }, (_, i) => {
    const s = cascade(t, i, n, beat, dwell)
    if (s.air) {
      const a = onTop(center(s.tThrow), throwDx[s.from])
      const b = onTop(center(s.tLand), catchDx[s.to])
      return <S key={i} k={i + 1} {...arc(a, b, 125, s.p)} {...stretch(s.p)} r={(s.from ? -1 : 1) * 360 * s.p} />
    }
    const pt = onTop(c, lerp(catchDx[s.hand], throwDx[s.hand], ease(s.q)))
    return <S key={i} k={i + 1} {...pt} {...squash(bump(s.q, 0.35))} />
  })
  const spin = ((c.x - 150) / Rb) * (180 / Math.PI)

  return (
    <>
      {shapes}
      <g transform={`rotate(${spin} ${c.x} ${c.y})`}>
        <circle cx={c.x} cy={c.y} r={Rb} fill={INK} />
        <circle cx={c.x - 16} cy={c.y - 16} r={7} fill="#fff" opacity={0.18} />
      </g>
    </>
  )
}

// A letterform as the vessel: here a "U" running the cascade. Swap in a
// letter from your own logo.
function letter(t: number) {
  const n = 3
  const beat = 0.4
  const dwell = 0.55
  const pivot = { x: 150, y: 200 }
  const rock = (tt: number) => 6 * Math.cos((Math.PI * tt) / beat - 0.4)
  const restY = 238
  const throwX = [140, 160]
  const catchX = [124, 176]
  const at = (x: number, tt: number) => rot({ x, y: restY }, pivot, rock(tt))

  const shapes = Array.from({ length: n }, (_, i) => {
    const s = cascade(t, i, n, beat, dwell)
    if (s.air) {
      return (
        <S key={i} k={i * 2} {...arc(at(throwX[s.from], s.tThrow), at(catchX[s.to], s.tLand), 140, s.p)} {...stretch(s.p)} r={(s.from ? -1 : 1) * 360 * s.p} />
      )
    }
    return <S key={i} k={i * 2} {...at(lerp(catchX[s.hand], throwX[s.hand], ease(s.q)), t)} {...squash(bump(s.q, 0.35))} r={rock(t)} />
  })

  return (
    <>
      {shapes}
      <path
        d="M97 150 V208 A53 53 0 0 0 203 208 V150"
        transform={`rotate(${rock(t)} ${pivot.x} ${pivot.y})`}
        fill="none"
        stroke={INK}
        strokeWidth={26}
        strokeLinecap="round"
      />
    </>
  )
}

/* ---------------------------------------------------------------- */

export type Scene = { id: string; title: string; blurb: string; poster: number; draw: (t: number) => ReactNode }

export const SCENES: Scene[] = [
  { id: "hands", title: "Juggler's hands", blurb: "The classic 3-ball cascade. The clearest juggling at small sizes.", poster: 0.5, draw: hands },
  { id: "trampoline", title: "Trampoline", blurb: "Three bouncers; the mat dips under each landing.", poster: 0.5, draw: trampoline },
  { id: "shaker", title: "Cocktail shaker", blurb: "Shake, pop the cap, shapes burst out and drop back in.", poster: 1.6, draw: shaker },
  { id: "whisk", title: "Mixing bowl", blurb: "Shapes swirl round the bowl while the whisk stirs.", poster: 0.3, draw: whisk },
  { id: "spatula", title: "Spatula flip", blurb: "One flip at a time, pancake style.", poster: 0.55, draw: spatula },
  { id: "popcorn", title: "Popcorn pot", blurb: "Random pops; the lid rattles with each one.", poster: 0.9, draw: popcorn },
  { id: "toaster", title: "Toaster", blurb: "Two at a time, with the lever snapping up.", poster: 1.35, draw: toaster },
  { id: "seal", title: "Seal", blurb: "One shape on the nose, turning into the next on every bounce.", poster: 0.5, draw: seal },
  { id: "seesaw", title: "See-saw", blurb: "Each landing launches the shape on the other end.", poster: 1.3, draw: seesaw },
  { id: "fountain", title: "Fountain", blurb: "Ride the jet up, spill out, drop into the basin. Calm, good for long waits.", poster: 0.7, draw: fountain },
  { id: "hoop", title: "Hoop", blurb: "Swish through the net, roll back, go again.", poster: 0.6, draw: hoop },
  { id: "gumball", title: "Gumball machine", blurb: "Turn the knob, out rolls the next shape.", poster: 1.2, draw: gumball },
  { id: "bigball", title: "Big ball", blurb: "No vessel: a big ball juggles the small ones off its back.", poster: 0.5, draw: bigBall },
  { id: "letter", title: "Letter as vessel", blurb: "A “U” running the cascade. Swap in a letter from your logo.", poster: 0.5, draw: letter },
]
