import ScatterCards from '@/components/ScatterCards'

const page = () => (
  <div className='bg-[#FBFBFB]'>
    <ScatterCards />

    {/* credit for the scattering-cards idea */}
    <a
      href='https://p4n.me/'
      target='_blank'
      rel='noreferrer'
      className='fixed right-5 bottom-5 z-10 text-xs text-neutral-400 tracking-tight transition-colors hover:text-neutral-800'
      style={{ fontFamily: 'var(--font-inter)' }}
    >
      inspired by @p4nthera_
    </a>
  </div>
)

export default page
