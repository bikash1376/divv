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
}

// `light` is the top-left end of the cover gradient, `bg` the bottom-right
type Theme = { bg: string; light: string; circle: string; rim?: string; glyph: keyof typeof ICONS }

export const THEMES = {
  blue: { bg: "#1765D8", light: "#4A97F7", circle: "rgba(8,36,100,0.3)", glyph: "trophy" },
  green: { bg: "#23A866", light: "#62D99C", circle: "rgba(6,80,44,0.28)", rim: "rgba(205,255,225,0.7)", glyph: "gift" },
  red: { bg: "#D93A30", light: "#F57A6C", circle: "rgba(100,12,8,0.28)", rim: "rgba(255,205,198,0.7)", glyph: "ticket" },
  gold: { bg: "#E6A112", light: "#FFD45E", circle: "rgba(110,66,0,0.24)", rim: "rgba(255,240,180,0.85)", glyph: "crown" },
} satisfies Record<string, Theme>

const PRIZES = [
  { amount: "₹21", note: "Cashback added to your bank account" },
  { amount: "₹7", note: "Cashback added to your bank account" },
  { amount: "₹150", note: "Off your next recharge" },
  { amount: null, note: "Better luck next time" },
]

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

function paintCover(ctx: CanvasRenderingContext2D, theme: Theme) {
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

  // Lighter inner rim, inset so the rounded card edge doesn't clip it
  if (theme.rim) {
    ctx.strokeStyle = theme.rim
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(1, 1, SIZE - 2, SIZE - 2, 15)
    ctx.stroke()
  }

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
  onReveal?: () => void
  // Animate in, for a card that was just refilled
  refilled?: boolean
}

// Refill a card by remounting it (new `key`) with the next `round`
export default function ScratchCard({ round = 0, theme = "blue", onReveal, refilled = false }: Props) {
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
    const paint = () => {
      const next = Math.min(Math.max(2, window.devicePixelRatio || 1) * (window.visualViewport?.scale ?? 1), 6)
      if (next === scale) return
      scale = next
      canvas.width = canvas.height = Math.round(SIZE * scale)
      c.setTransform(scale, 0, 0, scale, 0, 0)
      paintCover(c, THEMES[theme])
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
  }, [round, theme])

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
