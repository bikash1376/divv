'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import ScratchCard, { THEMES } from '@/components/ScratchCard'

const CARDS: { theme: keyof typeof THEMES; start: number }[] = [
  { theme: 'blue', start: 0 },
  { theme: 'green', start: 1 },
  { theme: 'red', start: 3 },
  { theme: 'gold', start: 2 },
]

// Phosphor battery-full, split so each bar can drain/fill on its own
const BATTERY_SHELL =
  'M200,56H32A24,24,0,0,0,8,80v96a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V80A24,24,0,0,0,200,56Zm8,120a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8ZM256,96v64a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0Z'
const BAR_X = [48, 88, 128, 168]

// One bar per card still waiting to be scratched
function Battery({ level }: { level: number }) {
  return (
    <svg viewBox='0 0 256 256' fill='currentColor' className='size-4' aria-hidden>
      <path d={BATTERY_SHELL} />
      {BAR_X.map((x, i) => (
        <motion.rect
          key={x}
          x={x}
          y={88}
          width={16}
          height={80}
          rx={8}
          style={{ transformBox: 'fill-box', originY: 1 }}
          initial={false}
          animate={i < level ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: i < level ? i * 0.08 : 0 }}
        />
      ))}
    </svg>
  )
}

const Page = () => {
  // How many times each card has been refilled; bumping it remounts that card
  const [gens, setGens] = useState(() => CARDS.map(() => 0))
  const [scratched, setScratched] = useState(() => CARDS.map(() => false))
  const empty = scratched.some(Boolean)

  const refill = () => {
    setGens((g) => g.map((n, i) => (scratched[i] ? n + 1 : n)))
    setScratched((s) => s.map(() => false))
  }

  return (
    <div className='flex flex-col justify-center items-center gap-14 min-h-screen bg-[#FBFBFB] px-4 py-16'
      style={{ fontFamily: 'var(--font-inter)' }}
    >
      <div className='flex flex-wrap justify-center gap-10'>
        {CARDS.map(({ theme, start }, i) => (
          <ScratchCard
            key={`${i}-${gens[i]}`}
            theme={theme}
            round={start + gens[i]}
            refilled={gens[i] > 0}
            onReveal={() => setScratched((s) => s.map((v, j) => v || j === i))}
          />
        ))}
      </div>

      <button
        onClick={refill}
        disabled={!empty}
        className='flex cursor-pointer items-center gap-1.5 rounded-full bg-[#F2F2F2] py-1.5 pl-3 pr-3.5 text-xs text-[#A3A3A3] transition hover:brightness-95 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'
      >
        <Battery level={scratched.filter((v) => !v).length} />
        Refill
      </button>
    </div>
  )
}

export default Page
