import { Suspense, lazy, useEffect, useState } from 'react'

// The game (three.js etc.) is only downloaded when someone presses Play.
const Game = lazy(() => import('../game/Game'))

const features = ['Cars, bikes & boats', 'Guns, cops & choppers', '6 missions', 'Day/night & rain', 'Stunt jumps', 'Hidden tapes', 'Synthwave radio', 'Portfolio buildings']

// Shown while the game's code downloads; the game then continues the same bar for textures and shaders.
const Loading = () => {
  const [w, setW] = useState(2)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(15))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className='fixed inset-0 z-[1000] bg-[#120a24] flex flex-col items-center justify-center gap-5 p-6'>
      <h2 className='text-5xl md:text-6xl italic font-black text-[#ff2fd0]' style={{ fontFamily: '"Arial Black", Impact, sans-serif', textShadow: '0 0 18px #ff2fd0' }}>NEON BAY</h2>
      <div className='w-72 max-w-full h-3 rounded-full bg-white/10 overflow-hidden'>
        <div className='h-full bg-gradient-to-r from-[#ff2fd0] to-[#18e5ff] transition-all duration-[1500ms] ease-out' style={{ width: `${w}%` }} />
      </div>
      <p className='font-montserrat text-sm text-slate-300'>Downloading the game…</p>
    </div>
  )
}

const NeonBay = () => {
  const [playing, setPlaying] = useState(false)
  return (
    <section id='neon-bay' className='flex flex-col items-center'>
      <h1 className='text-center text-5xl font-bold font-palanquin'>Play <span className='text-blue-300'>Neon Bay</span></h1>
      <p className='text-center text-slate-300 mt-5 font-montserrat'>An open-world mini game I built with React Three Fiber. Explore the city to find my portfolio.</p>

      <div data-aos="fade-up" className='relative w-full max-w-[840px] mt-7 aspect-video max-sm:aspect-[4/5] rounded-xl overflow-hidden border-[1px] border-blue-300'>
        {/* retro sunset poster */}
        <div className='absolute inset-0 bg-gradient-to-b from-[#24104f] via-[#a5306f] to-[#ff8a7a]' />
        <div className='absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-square rounded-full bg-gradient-to-b from-[#fff3a0] via-[#ff9a3c] to-[#ff3d7f]'
          style={{ WebkitMaskImage: 'repeating-linear-gradient(to bottom, #000 0 62%, transparent 62% 66%, #000 66% 70%, transparent 70% 75%, #000 75% 80%, transparent 80% 86%, #000 86% 90%, transparent 90% 97%)', maskImage: 'repeating-linear-gradient(to bottom, #000 0 62%, transparent 62% 66%, #000 66% 70%, transparent 70% 75%, #000 75% 80%, transparent 80% 86%, #000 86% 90%, transparent 90% 97%)' }} />
        <div className='absolute inset-x-0 bottom-0 h-[32%] bg-[#1aa6c4]/90' />
        <div className='absolute inset-x-0 bottom-[32%] h-1 bg-white/70' />
        <svg className='absolute bottom-[28%] left-[6%] w-[16%] text-[#1a0b2e]' viewBox='0 0 100 140' fill='currentColor' aria-hidden>
          <path d='M48 140 C50 100 52 70 58 40 L62 40 C57 70 56 100 56 140 Z' />
          <path d='M60 40 C40 20 15 25 0 45 C20 32 40 32 60 42 C45 15 60 0 80 0 C66 12 64 26 62 40 C80 22 100 28 100 45 C85 34 72 34 62 42 C80 48 90 62 88 78 C78 60 68 50 60 44 Z' />
        </svg>
        <svg className='absolute bottom-[28%] right-[8%] w-[12%] text-[#1a0b2e]' viewBox='0 0 100 140' fill='currentColor' aria-hidden>
          <path d='M48 140 C50 100 52 70 58 40 L62 40 C57 70 56 100 56 140 Z' />
          <path d='M60 40 C40 20 15 25 0 45 C20 32 40 32 60 42 C45 15 60 0 80 0 C66 12 64 26 62 40 C80 22 100 28 100 45 C85 34 72 34 62 42 C80 48 90 62 88 78 C78 60 68 50 60 44 Z' />
        </svg>

        <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center bg-black/10'>
          <h2 className='text-6xl max-sm:text-5xl italic font-black text-white' style={{ fontFamily: '"Arial Black", Impact, sans-serif', textShadow: '0 0 6px #ff2fd0, 0 0 24px #ff2fd0, 3px 3px 0 #24104f' }}>
            NEON BAY
          </h2>
          <div className='flex flex-wrap justify-center gap-2 max-w-md'>
            {features.map((f) => (
              <span key={f} className='px-3 py-1 rounded-full bg-black/50 text-xs font-montserrat border border-white/30'>{f}</span>
            ))}
          </div>
          <button
            onClick={() => setPlaying(true)}
            className='mt-2 px-10 py-3 rounded-xl font-black text-2xl text-black bg-gradient-to-r from-[#ff2fd0] to-[#18e5ff] hover:scale-105 transition-transform shadow-[0_0_30px_#ff2fd0aa]'
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            ▶ PLAY
          </button>
          <p className='text-xs font-montserrat text-white/80'>Best with a keyboard · Touch controls on mobile · Sound on 🔊</p>
        </div>
      </div>

      {playing && (
        <Suspense fallback={<Loading />}>
          <Game onExit={() => setPlaying(false)} />
        </Suspense>
      )}
    </section>
  )
}

export default NeonBay
