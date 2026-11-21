'use client'

import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionTemplate,
  useMotionValue,
  type Variants,
} from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import CompanyCard from '@/components/CompanyCard'
import { GRADIENTS, INK, MOTIFS, type CardGradient, type CardMotif } from '@/lib/cardStyles'

const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const


const panel: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.1, staggerChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1, when: 'afterChildren' } },
}
const row: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025 } },
  exit: { transition: { staggerChildren: 0.012, staggerDirection: -1 } },
}
const item: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 26 } },
  exit: { opacity: 0, scale: 0.5, y: 6, transition: { duration: 0.16, ease: 'easeIn' } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } },
}

function Swatch({
  label,
  selected,
  ring,
  onSelect,
  children,
}: {
  label: string
  selected: boolean
  ring: string
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type='button'
      variants={item}
      whileTap={{ scale: 0.93 }}
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className='relative size-8 shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#556adc] focus-visible:ring-offset-2'
    >
      <span className='absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]'>{children}</span>
      {/* active: an inner ring in the page colour, sliding between swatches */}
      {selected && (
        <motion.span
          layoutId={ring}
          className='pointer-events-none absolute inset-[3px] rounded-full border-2 border-[#fcfcfc]'
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </motion.button>
  )
}

function MotifPreview({ motif, gradient }: { motif: CardMotif; gradient: CardGradient }) {
  const mask = (src: string): CSSProperties => ({
    WebkitMask: `url(${src}) center/contain no-repeat`,
    mask: `url(${src}) center/contain no-repeat`,
  })
  return (
    <span className='absolute inset-0' style={{ background: gradient.background }}>
      {motif.kind === 'mask' && motif.src && (
        <span
          className='absolute inset-[5px]'
          style={{ ...mask(motif.src), background: INK[gradient.ink].line, opacity: gradient.ink === 'dark' ? 0.5 : 0.85 }}
        />
      )}
      {motif.kind === 'image' && motif.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={motif.src} alt='' className='absolute inset-[5px] size-[calc(100%-10px)] object-contain' />
      )}
      {motif.kind === 'none' && (
        <span
          className='absolute left-1/2 top-1/2 h-[1.5px] w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full'
          style={{ background: INK[gradient.ink].primary, opacity: 0.7 }}
        />
      )}
    </span>
  )
}

function SlidersIcon() {
  return (
    <svg viewBox='0 0 20 20' className='size-[18px]' fill='none' aria-hidden>
      <path d='M3 7h14M3 13h14' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
      <circle cx='12.5' cy='7' r='2.2' fill='#f5f5f5' stroke='currentColor' strokeWidth='1.6' />
      <circle cx='7.5' cy='13' r='2.2' fill='#f5f5f5' stroke='currentColor' strokeWidth='1.6' />
    </svg>
  )
}

// Sarvam primary: slate pill, inset highlight, soft white glow that follows the cursor
function SaveButton({ onClick }: { onClick: () => void }) {
  const gx = useMotionValue(50)
  const glowOpacity = useMotionValue(0)
  const glow = useMotionTemplate`radial-gradient(120px 80px at ${gx}% 50%, rgba(255,255,255,.22), transparent 70%)`
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    gx.set(((e.clientX - r.left) / r.width) * 100)
    glowOpacity.set(1)
  }
  return (
    <motion.button
      type='button'
      variants={rise}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={() => glowOpacity.set(0)}
      className='relative h-11 w-full cursor-pointer overflow-hidden rounded-full bg-[#2a2c33] font-[family-name:var(--font-matter)] text-[14px] font-[525] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)] outline-none focus-visible:ring-2 focus-visible:ring-[#556adc] focus-visible:ring-offset-2'
    >
      <motion.span
        aria-hidden
        className='pointer-events-none absolute inset-0 transition-opacity duration-300'
        style={{ background: glow, opacity: glowOpacity }}
      />
      <span className='relative'>Save</span>
    </motion.button>
  )
}

export default function CompanyCardStudio() {
  const [editing, setEditing] = useState(false)
  const [gradientId, setGradientId] = useState(GRADIENTS[0].id)
  const [motifId, setMotifId] = useState(MOTIFS[0].id)
  const gradient = GRADIENTS.find((g) => g.id === gradientId) ?? GRADIENTS[0]
  const motif = MOTIFS.find((m) => m.id === motifId) ?? MOTIFS[0]

  // Esc or a click outside the card + pickers closes the editor, like Save
  const stageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditing(false)
    const onDown = (e: globalThis.PointerEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) setEditing(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [editing])

  // the card keeps its size and lifts by half the picker block, so card + pickers stay centred
  const lift = editing ? -130 : 0

  return (
    <MotionConfig reducedMotion='user'>
      {/* open editor */}
      <AnimatePresence>
        {!editing && (
          <motion.button
            type='button'
            onClick={() => setEditing(true)}
            aria-label='Customise card'
            title='Customise card'
            initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className='fixed right-5 top-5 z-20 grid size-10 cursor-pointer place-items-center rounded-full border border-[#e6e6e6] bg-[#f5f5f5] text-[#1f1f1f] shadow-[inset_0_1px_0_rgba(255,255,255,.6)] outline-none focus-visible:ring-2 focus-visible:ring-[#556adc] focus-visible:ring-offset-2'
          >
            <SlidersIcon />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        ref={stageRef}
        className='relative w-[min(425px,92vw)]'
        animate={{ y: lift }}
        transition={editing ? SPRING : { ...SPRING, delay: 0.12 }}
      >
        {/* clicking the card (but not its links) opens the pickers */}
        <div
          className={editing ? undefined : 'cursor-pointer'}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('a')) setEditing(true)
          }}
        >
          <CompanyCard gradient={gradient} motif={motif} />
        </div>

        {/* pickers below the card: gradients, motifs, then Save */}
        <AnimatePresence>
          {editing && (
            <motion.div
              key='pickers'
              variants={panel}
              initial='hidden'
              animate='show'
              exit='exit'
              className='absolute left-1/2 top-[calc(100%+28px)] flex w-max -translate-x-1/2 flex-col items-stretch gap-5'
            >
              <motion.div variants={row} role='group' aria-label='Card gradient' className='grid grid-cols-4 gap-2.5'>
                {GRADIENTS.map((g) => (
                  <Swatch
                    key={g.id}
                    label={g.label}
                    ring='ring-gradient'
                    selected={g.id === gradientId}
                    onSelect={() => setGradientId(g.id)}
                  >
                    <span className='absolute inset-0' style={{ background: g.background }} />
                  </Swatch>
                ))}
              </motion.div>

              <motion.div variants={row} role='group' aria-label='Card motif' className='grid grid-cols-4 gap-2.5'>
                {MOTIFS.map((m) => (
                  <Swatch
                    key={m.id}
                    label={m.label}
                    ring='ring-motif'
                    selected={m.id === motifId}
                    onSelect={() => setMotifId(m.id)}
                  >
                    <MotifPreview motif={m} gradient={gradient} />
                  </Swatch>
                ))}
              </motion.div>

              <div>
                <SaveButton onClick={() => setEditing(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}
