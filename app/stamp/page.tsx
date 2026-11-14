import type { Metadata } from 'next'
import { Caveat } from 'next/font/google'
import StampCutter from '@/components/stamp/StampCutter'

const caveat = Caveat({ variable: '--font-caveat', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stamp — Bikash Sahu',
  description: 'Drop in a photo, slide the cutter over it and punch out a perforated stamp.',
}

export default function StampPage() {
  return (
    <div className={caveat.variable}>
      <StampCutter />
    </div>
  )
}
