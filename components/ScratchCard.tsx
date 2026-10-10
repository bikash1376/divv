"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const SIZE = 208
const BRUSH = 34
const REVEAL_AT = 0.3

// Phosphor (regular) icons, 256×256 filled paths
const ICONS = {
  trophy: "M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z",
  gift: "M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z",
  ticket: "M232,104a8,8,0,0,0,8-8V64a16,16,0,0,0-16-16H32A16,16,0,0,0,16,64V96a8,8,0,0,0,8,8,24,24,0,0,1,0,48,8,8,0,0,0-8,8v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160a8,8,0,0,0-8-8,24,24,0,0,1,0-48ZM32,167.2a40,40,0,0,0,0-78.4V64H88V192H32Zm192,0V192H104V64H224V88.8a40,40,0,0,0,0,78.4Z",
  crown: "M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM193.22,192H62.78L48.86,108.52,81.79,149A8,8,0,0,0,88,152a7.83,7.83,0,0,0,1.08-.07,8,8,0,0,0,6.26-4.74l29.3-67.4a27,27,0,0,0,6.72,0l29.3,67.4a8,8,0,0,0,6.26,4.74A7.83,7.83,0,0,0,168,152a8,8,0,0,0,6.21-3l32.93-40.52ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z",
  star: "M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z",
  coins: "M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57ZM232,132c0,13.22-30.79,28-72,28-3.73,0-7.43-.13-11.08-.37C170.49,151.77,184,139,184,124V105.74C213.87,110.19,232,122.27,232,132ZM72,150.25V126.46A183.74,183.74,0,0,0,96,128a183.74,183.74,0,0,0,24-1.54v23.79A163,163,0,0,1,96,152,163,163,0,0,1,72,150.25Zm96-40.32V124c0,8.39-12.41,17.4-32,22.87V123.5C148.91,120.37,159.84,115.71,168,109.93ZM96,56c41.21,0,72,14.78,72,28s-30.79,28-72,28S24,97.22,24,84,54.79,56,96,56ZM24,124V109.93c8.16,5.78,19.09,10.44,32,13.57v23.37C36.41,141.4,24,132.39,24,124Zm64,48v-4.17c2.63.1,5.29.17,8,.17,3.88,0,7.67-.13,11.39-.35A121.92,121.92,0,0,0,120,171.41v23.46C100.41,189.4,88,180.39,88,172Zm48,26.25V174.4a179.48,179.48,0,0,0,24,1.6,183.74,183.74,0,0,0,24-1.54v23.79a165.45,165.45,0,0,1-48,0Zm64-3.38V171.5c12.91-3.13,23.84-7.79,32-13.57V172C232,180.39,219.59,189.4,200,194.87Z",
  medal: "M216,96A88,88,0,1,0,72,163.83V240a8,8,0,0,0,11.58,7.16L128,225l44.43,22.21A8.07,8.07,0,0,0,176,248a8,8,0,0,0,8-8V163.83A87.85,87.85,0,0,0,216,96ZM56,96a72,72,0,1,1,72,72A72.08,72.08,0,0,1,56,96ZM168,227.06l-36.43-18.21a8,8,0,0,0-7.16,0L88,227.06V174.37a87.89,87.89,0,0,0,80,0ZM128,152A56,56,0,1,0,72,96,56.06,56.06,0,0,0,128,152Zm0-96A40,40,0,1,1,88,96,40,40,0,0,1,128,56Z",
  rocket: "M152,224a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,224ZM128,112a12,12,0,1,0-12-12A12,12,0,0,0,128,112Zm95.62,43.83-12.36,55.63a16,16,0,0,1-25.51,9.11L158.51,200h-61L70.25,220.57a16,16,0,0,1-25.51-9.11L32.38,155.83a16.09,16.09,0,0,1,3.32-13.71l28.56-34.26a123.07,123.07,0,0,1,8.57-36.67c12.9-32.34,36-52.63,45.37-59.85a16,16,0,0,1,19.6,0c9.34,7.22,32.47,27.51,45.37,59.85a123.07,123.07,0,0,1,8.57,36.67l28.56,34.26A16.09,16.09,0,0,1,223.62,155.83ZM99.43,184h57.14c21.12-37.54,25.07-73.48,11.74-106.88C156.55,47.64,134.49,29,128,24c-6.51,5-28.57,23.64-40.33,53.12C74.36,110.52,78.31,146.46,99.43,184Zm-15,5.85Q68.28,160.5,64.83,132.16L48,152.36,60.36,208l.18-.13ZM208,152.36l-16.83-20.2q-3.42,28.28-19.56,57.69l23.85,18,.18.13Z",
}

// `light` is the top-left end of the glossy cover's gradient, `bg` the bottom-right.
// `flat` is the plain cover: [fill, medallion, icon alpha].
type Theme = {
  bg: string
  light: string
  circle: string
  rim?: string
  flat: [string, string, number]
  glyph: keyof typeof ICONS
}
export type Look = "flat" | "glossy"

export const THEMES = {
  blue: { bg: "#1765D8", light: "#4A97F7", circle: "rgba(8,36,100,0.3)", flat: ["#1A73E8", "rgba(10,40,110,0.22)", 0.75], glyph: "trophy" },
  green: { bg: "#23A866", light: "#62D99C", circle: "rgba(6,80,44,0.28)", rim: "rgba(205,255,225,0.7)", flat: ["#3CBF7E", "rgba(10,90,50,0.2)", 0.8], glyph: "gift" },
  red: { bg: "#D93A30", light: "#F57A6C", circle: "rgba(100,12,8,0.28)", rim: "rgba(255,205,198,0.7)", flat: ["#E5483D", "rgba(110,15,10,0.2)", 0.8], glyph: "ticket" },
  gold: { bg: "#E6A112", light: "#FFD45E", circle: "rgba(110,66,0,0.24)", rim: "rgba(255,240,180,0.85)", flat: ["#F2B527", "rgba(120,75,0,0.18)", 0.85], glyph: "crown" },
  purple: { bg: "#6B3FD4", light: "#A47BFA", circle: "rgba(40,14,100,0.3)", rim: "rgba(225,210,255,0.7)", flat: ["#7C4FE0", "rgba(40,14,100,0.22)", 0.8], glyph: "star" },
  teal: { bg: "#0E9AA0", light: "#4FD3CF", circle: "rgba(0,60,64,0.28)", rim: "rgba(195,250,245,0.7)", flat: ["#1BAFB0", "rgba(0,60,64,0.2)", 0.8], glyph: "coins" },
  silver: { bg: "#7D8794", light: "#D5DBE3", circle: "rgba(40,48,60,0.28)", rim: "rgba(245,248,252,0.8)", flat: ["#9AA4B1", "rgba(40,48,60,0.2)", 0.85], glyph: "medal" },
  bronze: { bg: "#9A5A2C", light: "#D9945E", circle: "rgba(70,30,6,0.3)", rim: "rgba(255,220,190,0.6)", flat: ["#B06E3C", "rgba(70,30,6,0.22)", 0.8], glyph: "rocket" },
} satisfies Record<string, Theme>

const PRIZES = [
  { amount: "₹21", note: "Cashback added to your bank account" },
  { amount: "₹7", note: "Cashback added to your bank account" },
  { amount: "₹150", note: "Off your next recharge" },
  { amount: null, note: "Better luck next time" },
]

// Deterministic speckle so the flat cover looks the same on every redraw
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

function paintRim(ctx: CanvasRenderingContext2D, theme: Theme) {
  // Lighter inner rim, inset so the rounded card edge doesn't clip it
  if (!theme.rim) return
  ctx.strokeStyle = theme.rim
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(1, 1, SIZE - 2, SIZE - 2, 15)
  ctx.stroke()
}

// The original cover: flat fill, speckles, medallion, icon
function paintFlat(ctx: CanvasRenderingContext2D, theme: Theme) {
  const [fill, circle, iconAlpha] = theme.flat
  const c = SIZE / 2
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, SIZE, SIZE)

  const r = rng(7)
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.22})`
    ctx.beginPath()
    ctx.arc(r() * SIZE, r() * SIZE, 0.5 + r() * 0.9, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = circle
  ctx.beginPath()
  ctx.arc(c, c, 44, 0, Math.PI * 2)
  ctx.fill()

  paintRim(ctx, theme)

  const icon = 44
  ctx.save()
  ctx.translate(c - icon / 2, c - icon / 2)
  ctx.scale(icon / 256, icon / 256)
  ctx.fillStyle = `rgba(255,255,255,${iconAlpha})`
  ctx.fill(new Path2D(ICONS[theme.glyph]))
  ctx.restore()
}

// Four-point sparkle centred on (x, y)
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const k = r * 0.22
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + k, y - k, x + r, y)
  ctx.quadraticCurveTo(x + k, y + k, x, y + r)
  ctx.quadraticCurveTo(x - k, y + k, x - r, y)
  ctx.quadraticCurveTo(x - k, y - k, x, y - r)
  ctx.fill()
}

const SPARKLES: [number, number, number][] = [
  [34, 38, 6], [176, 30, 4.5], [168, 160, 7], [44, 170, 4], [150, 70, 3], [62, 116, 3],
]

// Gradient, halftone, sheen, sparkles and a recessed medallion
function paintGlossy(ctx: CanvasRenderingContext2D, theme: Theme) {
  const c = SIZE / 2
  ctx.globalCompositeOperation = "source-over"

  const base = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  base.addColorStop(0, theme.light)
  base.addColorStop(1, theme.bg)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Halftone grid that fades out towards the bottom-right
  const step = 11
  for (let y = step / 2; y < SIZE; y += step) {
    for (let x = step / 2; x < SIZE; x += step) {
      ctx.fillStyle = `rgba(255,255,255,${0.16 * (1 - (x + y) / (SIZE * 2.2))})`
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Soft diagonal sheen
  const sheen = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  sheen.addColorStop(0.25, "rgba(255,255,255,0)")
  sheen.addColorStop(0.42, "rgba(255,255,255,0.14)")
  sheen.addColorStop(0.55, "rgba(255,255,255,0)")
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = "rgba(255,255,255,0.55)"
  SPARKLES.forEach(([x, y, r]) => sparkle(ctx, x, y, r))

  // Recessed medallion: darker centre, lit ring
  const well = ctx.createRadialGradient(c, c - 14, 6, c, c, 46)
  well.addColorStop(0, theme.circle)
  well.addColorStop(1, theme.circle.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * 1.5})`))
  ctx.fillStyle = well
  ctx.beginPath()
  ctx.arc(c, c, 46, 0, Math.PI * 2)
  ctx.fill()
  const ring = ctx.createLinearGradient(c, c - 46, c, c + 46)
  ring.addColorStop(0, "rgba(255,255,255,0.05)")
  ring.addColorStop(1, "rgba(255,255,255,0.35)")
  ctx.strokeStyle = ring
  ctx.lineWidth = 1.5
  ctx.stroke()

  paintRim(ctx, theme)

  const icon = 46
  ctx.save()
  ctx.translate(c - icon / 2, c - icon / 2)
  ctx.scale(icon / 256, icon / 256)
  // shadows ignore the transform, so size them in device pixels
  const px = ctx.getTransform().a / (icon / 256)
  ctx.shadowColor = "rgba(0,0,0,0.18)"
  ctx.shadowBlur = 6 * px
  ctx.shadowOffsetY = 3 * px
  ctx.fillStyle = "rgba(255,255,255,0.95)"
  ctx.fill(new Path2D(ICONS[theme.glyph]))
  ctx.restore()
}

type Pt = { x: number; y: number }

function erase(ctx: CanvasRenderingContext2D, from: Pt, to: Pt) {
  ctx.globalCompositeOperation = "destination-out"
  ctx.lineWidth = BRUSH
  ctx.lineCap = ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x + 0.01, to.y)
  ctx.stroke()
}

// Fraction of the cover that has been scratched away (sampled)
function clearedRatio(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let clear = 0
  let total = 0
  for (let i = 3; i < data.length; i += 4 * 12) {
    total++
    if (data[i] === 0) clear++
  }
  return clear / total
}

type Props = {
  round?: number
  theme?: keyof typeof THEMES
  look?: Look
  onReveal?: () => void
  // Animate in, for a card that was just refilled
  refilled?: boolean
}

// Refill a card by remounting it (new `key`) with the next `round`
export default function ScratchCard({ round = 0, theme = "blue", look = "flat", onReveal, refilled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prizeRef = useRef<HTMLDivElement>(null)
  const last = useRef<Pt | null>(null)
  const strokes = useRef<[Pt, Pt][]>([])
  const moves = useRef(0)
  const [revealed, setRevealed] = useState(false)
  const prize = PRIZES[round % PRIZES.length]

  const ctx = () => canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null

  // The cover is a bitmap, so paint it at (at least 2×) the current device and
  // pinch-zoom density, and repaint + replay scratches whenever that changes.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const c = ctx()
    if (!canvas || !c) return
    strokes.current = []
    let scale = 0
    const cover = look === "glossy" ? paintGlossy : paintFlat
    const paint = () => {
      const next = Math.min(Math.max(2, window.devicePixelRatio || 1) * (window.visualViewport?.scale ?? 1), 6)
      if (next === scale) return
      scale = next
      canvas.width = canvas.height = Math.round(SIZE * scale)
      c.setTransform(scale, 0, 0, scale, 0, 0)
      cover(c, THEMES[theme])
      strokes.current.forEach(([a, b]) => erase(c, a, b))
    }
    paint()
    // Keep the prize hidden until the cover is painted, so SSR never flashes it
    prizeRef.current?.classList.remove("invisible")
    window.addEventListener("resize", paint)
    window.visualViewport?.addEventListener("resize", paint)
    return () => {
      window.removeEventListener("resize", paint)
      window.visualViewport?.removeEventListener("resize", paint)
    }
  }, [round, theme, look])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    }
  }

  const reveal = useCallback(() => {
    if (revealed) return
    setRevealed(true)
    navigator.vibrate?.(30)
    onReveal?.()
  }, [revealed, onReveal])

  const check = () => {
    const c = ctx()
    if (c && clearedRatio(c) >= REVEAL_AT) reveal()
  }

  const scratch = (to: Pt) => {
    const c = ctx()
    if (!c) return
    const from = last.current ?? to
    erase(c, from, to)
    strokes.current.push([from, to])
    last.current = to
    if (++moves.current % 8 === 0) check()
  }

  return (
    <motion.div
      className="relative"
      // own font, so it looks the same on every page it's dropped into
      style={{ width: SIZE, height: SIZE, fontFamily: "var(--font-inter)" }}
      initial={refilled ? { scale: 0.92, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
    >
      <Card className="absolute inset-0 gap-0 overflow-hidden rounded-2xl border-0 py-0 shadow-lg">
        <CardContent
          ref={prizeRef}
          className="invisible flex h-full flex-col items-center justify-center gap-2 px-5 text-center"
        >
          <motion.div
            key={round}
            initial={false}
            animate={revealed ? { scale: [0.85, 1.06, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-center gap-2"
          >
            {prize.amount && (
              <>
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">You won</span>
                <span className="text-5xl font-semibold tracking-tight text-neutral-900">{prize.amount}</span>
              </>
            )}
            <span className="text-sm text-neutral-500">{prize.note}</span>
          </motion.div>
        </CardContent>

        <canvas
          ref={canvasRef}
          aria-label="Scratch card, drag to scratch"
          className={cn(
            "absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing",
            revealed && "pointer-events-none opacity-0 transition-opacity duration-500"
          )}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            last.current = null
            scratch(point(e))
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1 && e.pointerType === "mouse") return
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
            scratch(point(e))
          }}
          onPointerUp={() => {
            last.current = null
            // Letting go after any scratching reveals the rest
            if (strokes.current.length) reveal()
          }}
          onPointerCancel={() => (last.current = null)}
        />
      </Card>
    </motion.div>
  )
}
