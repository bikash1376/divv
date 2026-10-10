'use client'

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Edit01Icon } from '@hugeicons/core-free-icons'

const HOLD_MS = 1000

const SIZE = 96
const STROKE = 3
const RING_R = 38
const ACCENT = '#AFE67F' // shared by ring and disc so they read as one shape

const HoldToAnimate = () => {
  const [holding, setHolding] = useState(false)
  // starts finished so the card shows the filled disc; Reset appears on hover
  const [done, setDone] = useState(true)

  const start = () => {
    // pressing again after completion resets instead of re-arming
    if (done) return setDone(false)
    setHolding(true)
  }
  const stop = () => setHolding(false)

  return (
    <div className='relative'>
      <style>{`
        @keyframes pop {
          0%   { transform: scale(1); opacity: 0; }
          50%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className='relative' style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className='absolute inset-0 -rotate-90'>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RING_R}
            pathLength={1}
            stroke={ACCENT}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            onTransitionEnd={() => holding && setDone(true)}
            style={{
              // gap of 2 keeps the next dash off the path; 1.05 hides the round cap dot at the start
              strokeDasharray: '1 2',
              strokeDashoffset: holding || done ? 0 : 1.05,
              // slow linear draw while holding, quick snap back on release
              transition: holding
                ? `stroke-dashoffset ${HOLD_MS}ms linear`
                : 'stroke-dashoffset 400ms ease-out',
            }}
          />
        </svg>

        {/* disc covers the ring out to its outer edge, so the stroke becomes its border */}
        <div
          className='absolute inset-0 m-auto rounded-full flex items-center justify-center text-[#1C1F21]'
          style={{
            width: RING_R * 2 + STROKE,
            height: RING_R * 2 + STROKE,
            background: ACCENT,
            opacity: done ? 1 : 0,
            // starts at the ring's size and bulges outward, never smaller than the ring
            animation: done ? 'pop 400ms ease-in-out' : 'none',
            transition: 'opacity 150ms ease-in',
          }}
        >
          <HugeiconsIcon icon={Edit01Icon} size={34} strokeWidth={2} />
        </div>
      </div>

      {/* hangs below the ring so the ring stays dead centre; shows on card hover */}
      <button
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className='absolute left-1/2 top-full mt-10 -translate-x-1/2 whitespace-nowrap text-[#1C1F21] px-6 py-2 bg-white rounded-full hover:bg-[#FAFAFA] active:scale-96 transition-all select-none touch-none cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'
      >
        {done ? 'Reset' : holding ? 'Keep holding…' : 'Hold to animate'}
      </button>
    </div>
  )
}

export default HoldToAnimate
