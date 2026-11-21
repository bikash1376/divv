// Sarvam surfaces and motifs for the company card.
// Gradients come from the Sarvam token set (tokens.css); `ink` says which text colour reads on them.

export type Ink = 'light' | 'dark'

export type CardGradient = { id: string; label: string; background: string; ink: Ink }

export const GRADIENTS: CardGradient[] = [
  {
    id: 'dusk',
    label: 'Dusk',
    ink: 'light',
    background: [
      'radial-gradient(55% 75% at 105% 105%, rgba(243,136,88,.85) 0%, rgba(230,101,27,.35) 35%, transparent 70%)',
      'radial-gradient(70% 90% at 85% 70%, rgba(167,192,241,.55) 0%, transparent 65%)',
      'linear-gradient(115deg, #14142b 0%, #1e2033 30%, #2f2f8f 62%, #556adc 100%)',
    ].join(','),
  },
  {
    id: 'night',
    label: 'Night',
    ink: 'light',
    background: 'radial-gradient(60% 90% at 50% 100%, #3d32ab 0%, transparent 70%), linear-gradient(180deg, #14142b 0%, #1e2033 100%)',
  },
  { id: 'twilight', label: 'Twilight', ink: 'light', background: 'linear-gradient(180deg, #13121e 0%, #a5bbfc 116.55%)' },
  {
    id: 'spectrum',
    label: 'Spectrum',
    ink: 'light',
    background: 'linear-gradient(180deg, #1c1f4a 0%, #3d4bb8 30%, #a7c0f1 55%, #f9bb9e 75%, #f38858 90%, #e6651b 100%)',
  },
  {
    id: 'periwinkle',
    label: 'Periwinkle',
    ink: 'dark',
    background: 'linear-gradient(180deg, #e8effc 0%, #d2dff9 40%, #fddcce 80%, #f9bb9e 100%)',
  },
  { id: 'sky', label: 'Sky', ink: 'dark', background: 'linear-gradient(180deg, #f4f7ff 0%, #bed2ff 100%)' },
  { id: 'cream', label: 'Cream', ink: 'dark', background: 'linear-gradient(180deg, #f2d1b7 0%, #f9e7bb 100%)' },
  { id: 'sage', label: 'Sage', ink: 'dark', background: 'linear-gradient(180deg, #dceace 0%, #cacec5 100%)' },
]

// `mask` motifs are line art / silhouettes tinted with the ink colour;
// `image` motifs keep their own Sarvam colours.
export type CardMotif = {
  id: string
  label: string
  kind: 'mask' | 'image' | 'none'
  src?: string
  className?: string // size + placement inside the card
  rest?: number // opacity at rest
  lit?: number // opacity inside the hover light
}

export const MOTIFS: CardMotif[] = [
  {
    id: 'mandala',
    label: 'Mandala',
    kind: 'mask',
    src: '/sarvam/sarvam-mandala-outline.svg',
    className: 'left-[-18%] top-[-55%] aspect-square w-[95%]',
    rest: 0.16,
    lit: 0.42,
  },
  {
    id: 'mandala-rise',
    label: 'Mandala rising',
    kind: 'mask',
    src: '/sarvam/sarvam-mandala-outline.svg',
    className: 'left-1/2 top-[38%] aspect-square w-[130%] -translate-x-1/2',
    rest: 0.16,
    lit: 0.42,
  },
  {
    id: 'mandala-corner',
    label: 'Mandala corner',
    kind: 'mask',
    src: '/sarvam/sarvam-mandala-outline.svg',
    className: 'right-[-34%] top-[-30%] aspect-square w-[88%]',
    rest: 0.16,
    lit: 0.42,
  },
  {
    id: 'concentric',
    label: 'Concentric gateway',
    kind: 'image',
    src: '/sarvam/gateway-concentric-indigo.svg',
    className: 'right-[4%] bottom-[-12%] h-[118%] aspect-[4/5]',
    rest: 0.2,
    lit: 0.45,
  },
  {
    id: 'arch',
    label: 'Gateway arch',
    kind: 'mask',
    src: '/sarvam/gateway-arch.svg',
    className: 'right-[6%] bottom-[-8%] h-[108%] aspect-[4/5]',
    rest: 0.07,
    lit: 0.16,
  },
  {
    id: 'glow',
    label: 'Gateway glow',
    kind: 'image',
    src: '/sarvam/gateway-glow.svg',
    className: 'right-[2%] bottom-[-14%] h-[125%] aspect-[6/7]',
    rest: 0.3,
    lit: 0.5,
  },
  {
    id: 'medallion',
    label: 'Gateway medallion',
    kind: 'image',
    src: '/sarvam/voice-motif-01.svg',
    className: 'right-[-14%] top-1/2 h-[120%] aspect-square -translate-y-1/2',
    rest: 0.16,
    lit: 0.36,
  },
  { id: 'none', label: 'No motif', kind: 'none' },
]

export const INK = {
  light: { primary: '#ffffff', secondary: '#c3c5d3', meta: '#dcdee8', line: '#ffffff', spark: '#ffffff', sparkAlt: '#f5b8d0' },
  dark: { primary: '#1f1f1f', secondary: '#4a4b57', meta: '#3d3d3d', line: '#1e2033', spark: '#3d4bb8', sparkAlt: '#d5650f' },
} as const
