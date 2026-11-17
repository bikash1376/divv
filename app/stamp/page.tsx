import type { Metadata } from 'next'
import { Caveat } from 'next/font/google'
import StampCutter, { type Shot } from '@/components/stamp/StampCutter'

const caveat = Caveat({ variable: '--font-caveat', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stamp — Bikash Sahu',
  description: 'Drop in a photo, slide the cutter over it and punch out a perforated stamp.',
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const nums = (v: string | undefined) => v?.split(',').map(Number).filter((n) => Number.isFinite(n))

/** Read shot mode (/stamp?shot&photo=..&cover&pz=..&pp=x,y&zoom=..&at=x,y&win=w,h&bg=..) from the URL. */
function parseShot(q: Record<string, string | string[] | undefined>): Shot | undefined {
  if (!('shot' in q)) return undefined
  const at = nums(one(q.at))
  const win = nums(one(q.win))
  const zoom = Number(one(q.zoom))
  const pz = Number(one(q.pz))
  const pp = nums(one(q.pp))
  const bg = one(q.bg)
  return {
    pz: Number.isFinite(pz) && pz > 0 ? pz : undefined,
    pp: pp?.length === 2 ? [pp[0], pp[1]] : undefined,
    photo: one(q.photo),
    cover: 'cover' in q,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : undefined,
    at: at?.length === 2 ? [at[0], at[1]] : undefined,
    win: win?.length === 2 ? { w: win[0], h: win[1] } : undefined,
    bg: bg ? (/^[0-9a-f]{3,8}$/i.test(bg) ? `#${bg}` : bg) : undefined,
  }
}

export default async function StampPage({ searchParams }: PageProps<'/stamp'>) {
  const shot = parseShot(await searchParams)
  return (
    <div className={caveat.variable}>
      <StampCutter shot={shot} />
    </div>
  )
}
