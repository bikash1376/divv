"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { SCENES, type Scene } from "./scenes"

const PAGE_BG = "#f6f3ee"
const ICON = "#e2dcd1" // a shade darker than the page

// Elapsed seconds from the scene's poster frame, only advancing while playing
function useClock(playing: boolean, start: number) {
  const [t, setT] = useState(start)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      setT((v) => v + dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  return t
}

// Server and browser trig differ in the last decimals, so draw only once
// mounted to avoid hydration mismatches.
const noop = () => () => {}
const useMounted = () => useSyncExternalStore(noop, () => true, () => false)

// Paused by default so the page stays light; press play to run one.
function Card({ scene }: { scene: Scene }) {
  const [playing, setPlaying] = useState(false)
  const t = useClock(playing, scene.poster)
  const mounted = useMounted()

  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-[#1d1b19]">{scene.title}</h2>
      <p className="mt-0.5 text-sm text-neutral-500">{scene.blurb}</p>
      <div className="relative mt-3 flex justify-center rounded-3xl bg-white px-6 pb-12 pt-4">
        <svg viewBox="0 0 300 300" width={240} height={240} className="h-auto max-w-full" aria-hidden>
          {mounted && scene.draw(t)}
        </svg>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? `Pause ${scene.title}` : `Play ${scene.title}`}
          className="absolute bottom-3 right-3 grid size-9 cursor-pointer place-items-center transition active:scale-90"
          style={{ color: ICON }}
        >
          <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor" aria-hidden>
            {playing ? (
              <>
                <rect x={3} y={2} width={3.6} height={12} rx={1.2} />
                <rect x={9.4} y={2} width={3.6} height={12} rx={1.2} />
              </>
            ) : (
              <path d="M4.5 2.8 C4.5 1.9 5.4 1.4 6.2 1.9 L13.2 6.4 C13.9 6.9 13.9 8.1 13.2 8.6 L6.2 13.1 C5.4 13.6 4.5 13.1 4.5 12.2 Z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ExpV2() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1b19]">Beyond the wok</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-500">
          Other things that can toss and catch. Everything starts paused; press play on the ones you want to see.
        </p>
        <div className="mt-10 grid gap-x-4 gap-y-10 sm:grid-cols-2">
          {SCENES.map((scene) => (
            <Card key={scene.id} scene={scene} />
          ))}
        </div>
      </div>
    </main>
  )
}
