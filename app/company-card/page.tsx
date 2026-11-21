import type { Metadata } from 'next'
import localFont from 'next/font/local'
import CompanyCardStudio from '@/components/CompanyCardStudio'

// Sarvam's brand faces: Season Mix for display, Matter for UI and body
const seasonMix = localFont({
  src: './fonts/SeasonMixVFUprights.woff2',
  weight: '300 900',
  variable: '--font-season',
  display: 'swap',
})

const matter = localFont({
  src: './fonts/MatterUprights-VF.woff2',
  weight: '100 1000',
  variable: '--font-matter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Company card — Sarvam',
}

export default function Page() {
  return (
    <main
      className={`${seasonMix.variable} ${matter.variable} flex min-h-screen items-center justify-center overflow-hidden bg-[#fcfcfc] px-4 py-16`}
    >
      <CompanyCardStudio />
    </main>
  )
}
