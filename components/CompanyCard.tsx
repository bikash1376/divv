'use client'

import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { INK, type CardGradient, type CardMotif } from '@/lib/cardStyles'

// the email is always <handle>@sarvam.ai; only the handle is editable
export type Person = { name: string; handle: string }
export const EMAIL_DOMAIN = 'sarvam.ai'
export type EditField = 'name' | 'email'

export const DEFAULT_PERSON: Person = { name: 'Aditi Rao', handle: 'aditi.rao' }
const ROLE = 'Head of Design'

// Tilt follows the pointer closely; the light trails behind it
const TILT = { stiffness: 180, damping: 22, mass: 0.6 }
const LIGHT = { stiffness: 70, damping: 18, mass: 1 }
const FADE = { duration: 0.55, ease: [0.22, 1, 0.36, 1] } as const

// Fixed sparkle field (seeded so server and client render the same dots)
const SPARKS = (() => {
  let s = 7
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 70 }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: rand() < 0.2 ? 2 : 1.25,
    alt: rand() < 0.18,
    delay: rand() * 3,
    duration: 2 + rand() * 2.5,
  }))
})()

// fine monochrome noise for the grain inside the light
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -.2'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`

const maskStyle = (src: string): CSSProperties => ({
  WebkitMask: `url(${src}) center/contain no-repeat`,
  mask: `url(${src}) center/contain no-repeat`,
})

const usePct = (v: MotionValue<number>) => useTransform(v, (n) => `${n * 100}%`)

// One motif layer: line art is tinted with the ink colour, coloured motifs keep their own colours
function Motif({ motif, color, opacity }: { motif: CardMotif; color: string; opacity: number }) {
  if (motif.kind === 'none' || !motif.src) return null
  const cls = `pointer-events-none absolute ${motif.className}`
  if (motif.kind === 'mask') {
    return <div className={cls} style={{ ...maskStyle(motif.src), background: color, opacity }} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={motif.src} alt='' className={`${cls} max-w-none`} style={{ opacity }} />
}

// A line of card text that turns into an input inside a soft pill. The pill has one
// layoutId, so moving from name to email glides it across the card.
function Editable({
  value,
  editing,
  onChange,
  onEnter,
  pill,
  caret,
  label,
  className = '',
  children,
}: {
  value: string
  editing: boolean
  onChange: (v: string) => void
  onEnter: () => void
  pill: CSSProperties
  caret: string
  label: string
  className?: string
  children: React.ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = input.current
    if (!editing || !el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  if (!editing) return <span className={`relative inline-grid ${className}`}>{children}</span>
  return (
    <span className={`relative inline-grid ${className}`}>
      <motion.span
        layoutId='card-edit-pill'
        aria-hidden
        className='absolute -inset-x-[0.9cqw] -inset-y-[0.15cqw] rounded-[1.1cqw]'
        style={pill}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      />
      {/* invisible copy of the text sizes the input to its content */}
      <span aria-hidden className='invisible col-start-1 row-start-1 whitespace-pre'>
        {value || ' '}
      </span>
      <input
        size={1}
        ref={input}
        value={value}
        aria-label={label}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        className='relative col-start-1 row-start-1 w-full min-w-0 select-text bg-transparent p-0 text-inherit outline-none [font:inherit] [letter-spacing:inherit]'
        style={{ caretColor: caret }}
      />
    </span>
  )
}

type Props = {
  gradient: CardGradient
  motif: CardMotif
  interactive?: boolean
  person?: Person
  editField?: EditField | null
  onPersonChange?: (field: EditField, value: string) => void
  onFieldDone?: () => void
}

export default function CompanyCard({
  gradient,
  motif,
  interactive = true,
  person = DEFAULT_PERSON,
  editField = null,
  onPersonChange,
  onFieldDone,
}: Props) {
  const reduce = useReducedMotion()
  const ink = INK[gradient.ink]
  const top = INK[gradient.inkTop ?? gradient.ink]
  // line art on pale cards stays faint (5–8% ink), per the Sarvam mandala rules
  const pale = gradient.ink === 'dark' && motif.kind === 'mask'
  const restOpacity = (motif.rest ?? 0) * (pale ? 0.45 : 1)
  const litOpacity = (motif.lit ?? 0) * (pale ? 0.55 : 1)
  // hover light and tilt rest while a field is being typed in
  const effects = !reduce && interactive && !editField
  const pill: CSSProperties =
    gradient.ink === 'light'
      ? { background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,.3)' }
      : { background: 'rgba(31,31,31,.035)', boxShadow: 'inset 0 0 0 0.5px rgba(31,31,31,.18)' }

  // pointer position across the card (0..1) and whether it is over the card
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const over = useMotionValue(0)

  const tx = useSpring(px, TILT)
  const ty = useSpring(py, TILT)
  const lx = useSpring(px, LIGHT)
  const ly = useSpring(py, LIGHT)
  const hover = useSpring(over, { stiffness: 120, damping: 20 })

  const rotateY = useTransform(tx, [0, 1], [-7, 7])
  const rotateX = useTransform(ty, [0, 1], [6, -6])

  const lightX = usePct(lx)
  const lightY = usePct(ly)

  // spotlight that reveals the brighter motif and sparkles near the light
  const spot = useMotionTemplate`radial-gradient(30% 52% at ${lightX} ${lightY}, #000 0%, rgba(0,0,0,.55) 45%, transparent 100%)`
  const rimOpacity = useTransform(hover, [0, 1], [0.25, 0.6])
  const grainOpacity = useTransform(hover, [0, 1], [0, 0.35])

  const settle = () => {
    px.set(0.5)
    py.set(0.5)
    over.set(0)
  }
  // flatten the card when the effects switch off (e.g. on entering text editing)
  useEffect(() => {
    if (effects) return
    px.set(0.5)
    py.set(0.5)
    over.set(0)
  }, [effects, px, py, over])
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!effects || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
    over.set(1)
  }

  return (
    <div className='w-full [perspective:1200px]'>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        onPointerMove={onMove}
        onPointerLeave={settle}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className='@container relative select-none aspect-[1.75/1] w-full overflow-hidden rounded-[24px] shadow-[0_24px_40px_-12px_rgba(20,20,43,.35),0_0_40px_rgba(0,0,0,.06)]'
      >
        {/* surface — crossfades when the gradient changes */}
        <AnimatePresence initial={false}>
          <motion.div
            key={gradient.id}
            aria-hidden
            className='absolute inset-0'
            style={{ background: gradient.background }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { ...FADE, delay: 0.15 } }}
            transition={FADE}
          />
        </AnimatePresence>

        {/* iridescent light trailing the cursor */}
        {effects && (
          <motion.div
            aria-hidden
            className='pointer-events-none absolute aspect-[1.3/1] w-[78%] -translate-x-1/2 -translate-y-1/2 mix-blend-screen blur-[22px]'
            style={{
              left: lightX,
              top: lightY,
              opacity: hover,
              background: [
                'radial-gradient(28% 34% at 50% 52%, rgba(96,170,150,.32) 0%, transparent 100%)',
                'radial-gradient(42% 48% at 54% 46%, rgba(110,140,210,.26) 0%, transparent 100%)',
                // warm amber-brown halo that sits between the ridges at the light's edge
                'radial-gradient(34% 40% at 30% 62%, rgba(150,105,70,.30) 0%, transparent 100%)',
                'radial-gradient(30% 36% at 66% 30%, rgba(170,100,130,.18) 0%, transparent 100%)',
              ].join(','),
            }}
          />
        )}

        {/* film grain inside the light */}
        {effects && (
          <motion.div
            aria-hidden
            className='pointer-events-none absolute inset-0 mix-blend-overlay'
            style={{
              opacity: grainOpacity,
              backgroundImage: GRAIN,
              backgroundSize: '160px 160px',
              WebkitMaskImage: spot,
              maskImage: spot,
            }}
          />
        )}

        {/* motif at rest + its lit copy inside the light; crossfades on change */}
        <AnimatePresence initial={false}>
          <motion.div
            key={`${motif.id}-${gradient.ink}`}
            aria-hidden
            className='pointer-events-none absolute inset-0'
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={FADE}
          >
            <Motif motif={motif} color={ink.line} opacity={restOpacity} />
            {effects && (
              <motion.div className='absolute inset-0' style={{ opacity: hover, WebkitMaskImage: spot, maskImage: spot }}>
                <Motif motif={motif} color={ink.line} opacity={litOpacity} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* sparkles inside the light */}
        {effects && (
          <motion.div
            aria-hidden
            className='pointer-events-none absolute inset-0'
            style={{ opacity: hover, WebkitMaskImage: spot, maskImage: spot }}
          >
            {SPARKS.map((p, i) => (
              <motion.span
                key={i}
                className='absolute rounded-full'
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  background: p.alt ? ink.sparkAlt : ink.spark,
                }}
                animate={{ opacity: [0.1, 0.6, 0.1] }}
                transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        )}

        {/* thin spectrum rim on dark cards only (it reads as a stray outline on pale ones) */}
        <AnimatePresence initial={false}>
          {gradient.ink === 'light' && (
            <motion.div
              key='rim'
              aria-hidden
              className='pointer-events-none absolute inset-0 rounded-[24px]'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE}
            >
              <motion.div
                className='absolute inset-0 rounded-[24px] p-px'
                style={{
                  opacity: effects ? rimOpacity : 0.25,
                  background: 'conic-gradient(from 200deg, #a7c0f1, #78dcbe, #f9bb9e, #e6651b, #8f7ae6, #a7c0f1)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
                  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* hairline edge: white highlight on dark cards, faint neutral line on pale ones */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-[24px] transition-shadow duration-500 ${
            gradient.ink === 'light'
              ? 'shadow-[inset_0_1px_0_rgba(255,255,255,.18),inset_0_0_0_1px_rgba(255,255,255,.06)]'
              : 'shadow-[inset_0_1px_0_rgba(255,255,255,.5),inset_0_0_0_1px_rgba(31,31,31,.06)]'
          }`}
        />

        {/* text: solid colours on its own layer so the light never tints it */}
        <motion.div
          className='relative z-10 isolate flex h-full flex-col justify-between p-[7cqw] font-[family-name:var(--font-matter)]'
          animate={{ color: ink.primary }}
          transition={FADE}
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-col gap-[1.6cqw]'>
              <motion.div
                role='img'
                aria-label='Sarvam'
                className='aspect-[202/32] w-[21cqw]'
                style={maskStyle('/sarvam/sarvam-wordmark-white.svg')}
                animate={{ backgroundColor: top.primary }}
                transition={FADE}
              />
              <motion.p className='text-[2.7cqw] font-[425] leading-tight' animate={{ color: top.secondary }} transition={FADE}>
                AI for all from India
              </motion.p>
            </div>
            <motion.p className='text-[2.5cqw] font-[425] leading-tight' animate={{ color: top.meta }} transition={FADE}>
              Bengaluru
            </motion.p>
          </div>

          <div className='flex items-end justify-between gap-4'>
            <div className='flex flex-col gap-[0.8cqw]'>
              <Editable
                value={person.name}
                editing={editField === 'name'}
                onChange={(v) => onPersonChange?.('name', v)}
                onEnter={() => onFieldDone?.()}
                pill={pill}
                caret={ink.primary}
                label='Name'
                className='self-start font-[family-name:var(--font-season)] text-[4.6cqw] font-[525] leading-[1.1] tracking-[-0.02em]'
              >
                {person.name}
              </Editable>
              <motion.p className='text-[2.6cqw] font-[425] leading-tight' animate={{ color: ink.secondary }} transition={FADE}>
                {ROLE}
              </motion.p>
            </div>
            <motion.div
              className='flex flex-col items-end gap-[0.6cqw] text-right text-[2.5cqw] font-[425] leading-tight'
              animate={{ color: ink.meta }}
              transition={FADE}
            >
              <a href='https://www.sarvam.ai' target='_blank' rel='noreferrer'>
                sarvam.ai
              </a>
              {editField === 'email' ? (
                // only the handle is editable; @sarvam.ai stays fixed after the pill
                <span className='inline-flex items-baseline'>
                  <Editable
                    value={person.handle}
                    editing
                    onChange={(v) => onPersonChange?.('email', v)}
                    onEnter={() => onFieldDone?.()}
                    pill={pill}
                    caret={ink.meta}
                    label='Email name'
                  >
                    {person.handle}
                  </Editable>
                  <span className='ml-[1cqw]'>@{EMAIL_DOMAIN}</span>
                </span>
              ) : (
                <a href={`mailto:${person.handle}@${EMAIL_DOMAIN}`}>
                  {person.handle}@{EMAIL_DOMAIN}
                </a>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
