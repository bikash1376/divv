'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TextMorph } from 'torph/react'

/*
 * A stamp cutter drawn entirely with flat CSS: no 3D transforms. The depth
 * comes from one light source (top-right) applied consistently: drop shadows
 * fall down-left, highlights sit on top-right edges, recesses are inset
 * shadows, and the window is a real hole (CSS mask) the photo shows through.
 */

// Cutter geometry, in unscaled px
const W = 188
const H = 292
const R = 40
const HOLE = 112
const HX = (W - HOLE) / 2
const HY = 38
const TEETH = 11

const TILE = 64
const GUTTER = 16

const PAGE_BG = '#E8E7E4'
const INK = '#3B3A37'

/** Square with semicircular bites along every edge, like a perforated stamp. */
function stampPath(size: number, ox = 0, oy = 0) {
  const s = size / TEETH
  const r = s * 0.3
  const f = (n: number) => +n.toFixed(2)
  const arc = (x: number, y: number) => `A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(y)}`
  const x1 = ox + size
  const y1 = oy + size
  let d = `M${f(ox)} ${f(oy)}`
  for (let i = 0; i < TEETH; i++) {
    const c = ox + (i + 0.5) * s
    d += `L${f(c - r)} ${f(oy)}${arc(c + r, oy)}`
  }
  d += `L${f(x1)} ${f(oy)}`
  for (let i = 0; i < TEETH; i++) {
    const c = oy + (i + 0.5) * s
    d += `L${f(x1)} ${f(c - r)}${arc(x1, c + r)}`
  }
  d += `L${f(x1)} ${f(y1)}`
  for (let i = 0; i < TEETH; i++) {
    const c = x1 - (i + 0.5) * s
    d += `L${f(c + r)} ${f(y1)}${arc(c - r, y1)}`
  }
  d += `L${f(ox)} ${f(y1)}`
  for (let i = 0; i < TEETH; i++) {
    const c = y1 - (i + 0.5) * s
    d += `L${f(ox)} ${f(c + r)}${arc(ox, c - r)}`
  }
  return d + 'Z'
}

const HOLE_D = stampPath(HOLE)
// Body mask: the whole cutter minus the perforated window
const BODY_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><path fill-rule='evenodd' d='M0 0H${W}V${H}H0Z${stampPath(HOLE, HX, HY)}'/></svg>`,
)}")`

/* ---------- sound: short filtered noise bursts, no audio files ---------- */

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
    '-5px 7px 10px #00000024, -1px 1px 2px #00000030, 1px -1px 0 #ffffff inset, -1px 1px 1px #00000012 inset',
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
  pressed,
  empty,
  onKnobDown,
  onKnobUp,
  onKnobClick,
  onUpload,
}: {
  pressed: boolean
  empty: boolean
  onKnobDown: (e: ReactPointerEvent) => void
  onKnobUp: () => void
  onKnobClick: () => void
  onUpload: () => void
}) {
  const id = useId().replace(/:/g, '')

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
        style={{ maskImage: BODY_MASK, WebkitMaskImage: BODY_MASK, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}
      >
        {/* sides: darkening toward the underside */}
        <div
          className='absolute inset-0'
          style={{ borderRadius: R, background: 'linear-gradient(4deg, #00000088 0%, #F4F4F3 72%, #F4F4F3 100%)' }}
        />
        <div className='absolute inset-0 p-[3px]' style={{ borderRadius: R }}>
          {/* rounded rim catching the light */}
          <div
            className='absolute inset-0 blur-[1px]'
            style={{ borderRadius: R, background: 'linear-gradient(1deg, #F4F4F3 0%, #F4F4F3 25%, #8A8885 100%)' }}
          />
          <div
            className='absolute inset-0 blur-[1px]'
            style={{ borderRadius: R, background: 'linear-gradient(15deg, #F4F4F300 0%, #F4F4F300 25%, #8A8885 100%)' }}
          />

          {/* top face */}
          <div
            className='relative size-full overflow-hidden'
            style={{
              borderRadius: R - 3,
              background: 'linear-gradient(200deg, #F8F8F6 0%, #EEEDEA 60%, #E3E2DE 100%)',
              boxShadow: '1px -1px 1px #ffffffe0 inset, -1px 1px 2px #00000020 inset',
            }}
          >
            {/* window plate */}
            <div className='absolute' style={{ left: 16, top: 16, width: W - 38, height: 156, borderRadius: 30, ...raisedPlate }} />
            {/* little ejection slot under the window */}
            <div
              className='absolute'
              style={{
                left: (W - 6 - 30) / 2,
                top: 157,
                width: 30,
                height: 6,
                borderRadius: 3,
                background: '#3A3936',
                boxShadow: '-1px 1.5px 1.5px #000000b0 inset, 0.5px -0.5px 0 #ffffffa0',
              }}
            />

            {/* lever well */}
            <div className='absolute' style={{ left: (W - 6 - 44) / 2, top: 190, width: 44, height: 82, borderRadius: 16, ...recess }} />

            {/* screws */}
            {[24, W - 6 - 24 - 14].map((x, i) => (
              <div
                key={x}
                className='absolute rounded-full'
                style={{
                  left: x,
                  top: 254,
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

      {/* Window: inner wall shadow + metal blade, drawn over the hole */}
      <svg
        className='pointer-events-none absolute overflow-visible'
        style={{ left: HX, top: HY }}
        width={HOLE}
        height={HOLE}
        aria-hidden
      >
        <defs>
          <clipPath id={`${id}-hole`}>
            <path d={HOLE_D} />
          </clipPath>
          <linearGradient id={`${id}-blade`} x1='0' y1='1' x2='1' y2='0'>
            <stop offset='0' stopColor='#8E8D89' />
            <stop offset='0.4' stopColor='#F6F6F4' />
            <stop offset='0.65' stopColor='#B4B3AF' />
            <stop offset='1' stopColor='#FBFBFA' />
          </linearGradient>
          <filter id={`${id}-soft`} x='-20%' y='-20%' width='140%' height='140%'>
            <feGaussianBlur stdDeviation='2.2' />
          </filter>
        </defs>
        <g clipPath={`url(#${id}-hole)`}>
          <path
            d={HOLE_D}
            fill='none'
            stroke='#000'
            strokeOpacity={0.5}
            strokeWidth={9}
            filter={`url(#${id}-soft)`}
            transform='translate(-3 4)'
          />
        </g>
        <path d={HOLE_D} fill='none' stroke={`url(#${id}-blade)`} strokeWidth={2.4} />
        <path d={HOLE_D} fill='none' stroke='#00000038' strokeWidth={0.6} transform='translate(-0.8 0.8)' />
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
          style={{ left: W / 2 - 26, top: HY + HOLE / 2 - 26, width: 52, height: 52, ...raisedPlate }}
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

      {/* Lever: the knob slides down the well when you cut */}
      <div className='absolute' style={{ left: (W - 44) / 2 + 6, top: 3 + 190 + 6, width: 32, height: 70 }}>
        <button
          type='button'
          aria-label={empty ? 'Upload a photo' : 'Cut stamp'}
          onPointerDown={onKnobDown}
          onPointerUp={onKnobUp}
          onPointerLeave={onKnobUp}
          onClick={onKnobClick}
          className='absolute inset-x-0 top-0 cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#3B3A37]/40'
          style={{
            height: 38,
            borderRadius: 16 - 6,
            backgroundColor: '#E9E8E5',
            backgroundImage: brushed,
            transform: `translateY(${pressed ? 30 : 0}px)`,
            transition: 'transform 140ms cubic-bezier(.3,.7,.4,1), box-shadow 140ms',
            boxShadow: pressed
              ? '0 0 0 1px #00000035, -1px 1px 4px 0 #00000080 inset, -8px 8px 10px 0 #00000040 inset'
              : '0 0 0 1px #00000035, -1px 2px 4px #00000030, 1px -2px 2px 0 #00000070 inset',
          }}
        >
          {/* glossy rim, gone while pressed */}
          <span
            className='absolute inset-0'
            style={{
              borderRadius: 'inherit',
              boxShadow: '0 0 0 1px #fff inset, 0 0 5px 1px #fff inset, 0 0 10px 4px #00000040 inset',
              opacity: pressed ? 0 : 1,
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
        </button>
      </div>
    </div>
  )
}

/* ---------- page ---------- */

type View = { x: number; y: number; s: number; fit: number }
type Stamp = { id: number; url: string; blob: Blob; rot: number; sample?: boolean }

// Pre-cut stamps for "Show me some stuff": crops of images in /public,
// as fractions of the image (centre x/y, side length relative to width)
const SAMPLES = [
  { src: '/image3.jpg', cx: 0.631, cy: 0.654, size: 0.12 },
  { src: '/image1.png', cx: 0.065, cy: 0.62, size: 0.1 },
  { src: '/image3.jpg', cx: 0.174, cy: 0.682, size: 0.1 },
  { src: '/image2.webp', cx: 0.725, cy: 0.235, size: 0.17 },
  { src: '/image3.jpg', cx: 0.395, cy: 0.695, size: 0.1 },
  { src: '/image3.jpg', cx: 0.816, cy: 0.705, size: 0.12 },
]

/** Draw the square (sx, sy, side ss) of `src` into a perforated stamp PNG. */
function renderStamp(src: CanvasImageSource, sx: number, sy: number, ss: number, out: number) {
  const c = document.createElement('canvas')
  c.width = c.height = out
  const ctx = c.getContext('2d')!
  ctx.clip(new Path2D(stampPath(out)))
  const f = out / ss
  ctx.setTransform(f, 0, 0, f, -sx * f, -sy * f)
  ctx.drawImage(src, 0, 0)
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

type Flying = Stamp & { from: { x: number; y: number; size: number } }
type Gesture =
  | { kind: 'pan'; id: number; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'pinch'; d0: number; s0: number; ax: number; ay: number }

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

  const k = size.w && size.w < 640 ? 0.74 : 1
  const narrow = k < 1
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
      SAMPLES.map(async ({ src, cx, cy, size: frac }) => {
        const img = await load(src)
        const ss = frac * img.naturalWidth
        const blob = await renderStamp(img, cx * img.naturalWidth - ss / 2, cy * img.naturalHeight - ss / 2, ss, 480)
        return { id: nextId.current++, url: URL.createObjectURL(blob), blob, rot: randomTilt(), sample: true }
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

  /** Copy a stamp PNG. With `onDone` the caller shows the result; otherwise the cutter says it. */
  const copy = (blob: Promise<Blob>, onDone?: (ok: boolean) => void) => {
    const done = (ok: boolean) =>
      onDone ? onDone(ok) : flash(ok ? 'copied to clipboard' : 'couldn\x27t copy, it\x27s in the tray')
    // Optimistic: the write can sit pending (e.g. a permission prompt), so
    // confirm right away and only correct it if the write actually fails.
    try {
      const write = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      done(true)
      write.catch(() => done(false))
    } catch {
      done(false)
    }
  }

  // Viewer's copy button label: morphs Copy → Copied, then back
  const [copyLabel, setCopyLabel] = useState('Copy')
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openStamp = (s: Stamp) => {
    clearTimeout(copyTimer.current)
    setCopyLabel('Copy')
    setSelected(s)
  }
  const copySelected = (s: Stamp) =>
    copy(Promise.resolve(s.blob), (ok) => {
      setCopyLabel(ok ? 'Copied' : "Couldn't copy")
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopyLabel('Copy'), 1600)
    })

  function cut() {
    const paper = paperRef.current
    const v = viewRef.current
    if (!paper || !v) return openPicker()

    const hole = HOLE * k
    const hx = cutter.x + HX * k
    const hy = cutter.y + HY * k
    const ix = (hx - v.x) / v.s
    const iy = (hy - v.y) / v.s
    const is = hole / v.s

    setPressed(true)
    setTimeout(() => setPressed(false), 220)

    if (ix + is <= 0 || iy + is <= 0 || ix >= paper.width || iy >= paper.height) {
      clickSound()
      flash('move me over the photo')
      return
    }

    punchSound()
    setPunching(true)
    setTimeout(() => setPunching(false), 160)

    // Copy the window out of the paper (before punching), clipped to the perforated edge
    const blob = renderStamp(paper, ix, iy, is, Math.round(clamp(is, 320, 1024)))

    // ...and punch the hole out of the paper
    const p = paper.getContext('2d')!
    p.save()
    p.globalCompositeOperation = 'destination-out'
    p.fill(new Path2D(stampPath(is, ix, iy)))
    p.restore()

    copy(blob)
    blob.then((b) => {
      setFlying({
        id: nextId.current++,
        url: URL.createObjectURL(b),
        blob: b,
        rot: randomTilt(),
        from: { x: hx, y: hy, size: hole },
      })
    })
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
    d.moved = true
    setPos({ x: clamp(d.px + dx, 8, size.w - cw - 8), y: clamp(d.py + dy, 8, size.h - ch - 8) })
  }
  const onCutterUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) cut()
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
    } else if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      const s = clamp((g.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, v.fit * 0.3, Math.max(v.fit * 12, 4))
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      setView({ ...v, s, x: mx - g.ax * s, y: my - g.ay * s })
    }
  }
  const onStageUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return
    startGesture()
  }

  const bubble = empty
    ? { key: 'intro', text: 'hey, i can create stamps', delay: 0.35 }
    : say && { key: say.id, text: say.text, delay: 0 }

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

        {/* Cut stamps */}
        <div
          data-tray
          className='no-scrollbar absolute flex gap-3 overflow-x-auto overflow-y-visible py-3'
          style={{ left: GUTTER, right: GUTTER, bottom: GUTTER - 12 }}
        >
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
                  src={s.url}
                  alt=''
                  draggable={false}
                  className='size-full'
                  initial={false}
                  animate={{ rotate: s.rot }}
                  style={{ filter: 'drop-shadow(-2px 3px 3px rgba(0,0,0,0.22))' }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* A fresh stamp sliding from under the cutter to the tray */}
        {flying && (
          <motion.img
            key={flying.id}
            src={flying.url}
            alt=''
            className='pointer-events-none absolute left-0 top-0'
            style={{ filter: 'drop-shadow(-3px 5px 5px rgba(0,0,0,0.25))' }}
            initial={{ x: flying.from.x, y: flying.from.y, width: flying.from.size, height: flying.from.size, rotate: 0 }}
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
                pressed={pressed}
                empty={empty}
                onKnobDown={(e) => {
                  e.stopPropagation()
                  setPressed(true)
                  clickSound()
                }}
                onKnobUp={() => setPressed(false)}
                onKnobClick={cut}
                onUpload={openPicker}
              />
            </div>

            {/* Thought bubble: the intro line until a photo loads, then short messages after a cut */}
            <AnimatePresence>
              {bubble && (
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
                      className='absolute whitespace-nowrap rounded-full px-[18px] py-[7px] text-[22px] leading-none'
                      style={{
                        left: narrow ? -60 : 20,
                        bottom: 28,
                        background: INK,
                        color: '#F4F4F3',
                        fontFamily: 'var(--font-caveat), cursive',
                        boxShadow: '-2px 4px 10px #00000026',
                        transformOrigin: 'bottom left',
                      }}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22, delay: bubble.delay + 0.16 }}
                    >
                      {bubble.text}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

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
                src={selected.url}
                alt={selected.sample ? 'Sample stamp' : 'Your stamp'}
                draggable={false}
                initial={{ rotate: selected.rot }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                style={{
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
                  href={selected.url}
                  download={`stamp-${selected.id}.png`}
                  onPointerDown={clickSound}
                  className={`${btnClass} inline-flex items-center`}
                  style={secondaryBtn}
                >
                  Download
                </a>
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
