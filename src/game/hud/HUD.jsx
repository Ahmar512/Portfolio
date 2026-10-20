import { useStore } from '../store'
import Minimap from './Minimap'
import PortfolioPanel from './PortfolioPanel'
import TouchControls from './TouchControls'

const HEAVY = { fontFamily: '"Arial Black", Impact, sans-serif' }
const OUTLINE = { textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,.6)' }

function Highlighted({ text }) {
  return text.split('~').map((part, k) =>
    k % 2 ? (
      <span key={k} className="text-[#ffd21f]">{part}</span>
    ) : (
      <span key={k}>{part}</span>
    ),
  )
}

function Stars({ level, flashing }) {
  return (
    <div className={`flex gap-0.5 text-2xl ${flashing ? 'animate-pulse' : ''}`} style={OUTLINE}>
      {[1, 2, 3, 4, 5].map((k) => (
        <span key={k} className={k <= level ? 'text-[#ffd21f]' : 'text-white/25'}>★</span>
      ))}
    </div>
  )
}

const KEYS = [
  ['W A S D / Arrows', 'Walk / drive'],
  ['Shift', 'Sprint'],
  ['Space', 'Jump / handbrake'],
  ['F', 'Enter / exit car'],
  ['E', 'Interact (portfolio, missions)'],
  ['Q / R', 'Change radio station'],
  ['H', 'Horn'],
  ['C', 'Camera distance'],
  ['M', 'Mute'],
  ['Esc / P', 'Pause'],
]

function Controls({ touch }) {
  if (touch) {
    return (
      <ul className="text-sm text-slate-200 space-y-1 font-montserrat">
        <li>Left stick: walk / drive</li>
        <li>CAR: get in / out of a car</li>
        <li>E: interact with portfolio buildings & missions</li>
        <li>JUMP / BRAKE: hold to brake or jump</li>
        <li>📻: change radio station</li>
      </ul>
    )
  }
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-montserrat">
      {KEYS.map(([k, d]) => (
        <div key={k} className="contents">
          <span className="font-bold text-[#18e5ff]">{k}</span>
          <span className="text-slate-200">{d}</span>
        </div>
      ))}
    </div>
  )
}

function Overlay({ children }) {
  return <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">{children}</div>
}

export default function HUD({ G, hud, audioRef, input, onExit, touch }) {
  const s = useStore(hud)
  const refresh = () => hud.set({ ...hud.get(), paused: G.ui.paused, panel: G.ui.panel, intro: !!G.ui.intro, muted: !!G.ui.muted })
  const resume = () => {
    G.ui.paused = false
    G.ui.intro = false
    audioRef.current?.resume()
    refresh()
  }
  const pause = () => {
    G.ui.paused = true
    refresh()
  }
  const closePanel = () => {
    G.ui.panel = null
    refresh()
  }
  const mute = () => {
    if (audioRef.current) G.ui.muted = audioRef.current.toggleMute()
    refresh()
  }
  const hh = String(Math.floor(s.clock / 60) % 24).padStart(2, '0')
  const mm = String(s.clock % 60).padStart(2, '0')

  return (
    <div className="absolute inset-0 pointer-events-none text-white select-none">
      {/* top-left: buttons + help prompt */}
      <div className="absolute top-3 left-3 flex flex-col gap-3 items-start pointer-events-auto max-w-[min(360px,60vw)]">
        <div className="flex gap-2">
          <button onClick={onExit} className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/30 text-sm font-bold hover:bg-white/15">✕ Exit</button>
          <button onClick={pause} className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/30 text-sm font-bold hover:bg-white/15">❚❚</button>
          <button onClick={mute} className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/30 text-sm font-bold hover:bg-white/15">{s.muted ? '🔇' : '🔊'}</button>
        </div>
        {touch && <Minimap G={G} size={120} />}
        {s.prompt && (
          <div className="bg-black/75 rounded-md px-4 py-3 text-sm font-montserrat border-l-4 border-[#ff2fd0]">
            {touch ? s.prompt.replace('Press E', 'Tap E').replace('Press F', 'Tap CAR') : s.prompt}
          </div>
        )}
      </div>

      {/* top-right: clock, cash, health, wanted */}
      <div className="absolute top-3 right-4 flex flex-col items-end gap-1" style={HEAVY}>
        <div className="text-2xl tracking-wide" style={OUTLINE}>{hh}:{mm}</div>
        <div className="text-3xl text-[#3bdc6a] tracking-wider" style={OUTLINE}>${String(s.cash).padStart(8, '0')}</div>
        <div className="w-40 h-3 bg-black/70 border border-black rounded-sm overflow-hidden">
          <div className="h-full bg-[#ff3b6b] transition-all" style={{ width: `${s.health}%` }} />
        </div>
        <Stars level={s.wanted} flashing={s.flashing} />
        {s.timer !== null && (
          <div className="mt-1 text-2xl" style={OUTLINE}>
            TIME {Math.floor(s.timer / 60)}:{String(s.timer % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* radio / banners */}
      {s.toast && (
        <div className={`absolute ${touch ? 'top-[34%]' : 'top-16'} left-1/2 -translate-x-1/2 text-center whitespace-nowrap`} style={HEAVY}>
          <div className="text-xl sm:text-2xl text-[#ffd21f] italic" style={OUTLINE}>{s.toast}</div>
        </div>
      )}
      {s.banner && (
        <div className="absolute top-[26%] left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={HEAVY}>
          <div className="text-4xl md:text-5xl text-[#ff9ec7] italic" style={OUTLINE}>{s.banner}</div>
        </div>
      )}
      {s.big && (
        <div className="absolute inset-x-0 top-[40%] text-center" style={HEAVY}>
          <div className={`text-5xl md:text-7xl italic ${s.big === 'WASTED' ? 'text-[#c8102e]' : s.big === 'BUSTED' ? 'text-[#2f6bff]' : s.big.includes('FAILED') ? 'text-[#ff3b3b]' : 'text-[#ffd21f]'}`} style={OUTLINE}>
            {s.big}
          </div>
          {s.bigSub && <div className="text-2xl md:text-3xl mt-2" style={OUTLINE}>{s.bigSub}</div>}
        </div>
      )}

      {/* mission text */}
      {s.missionText && (
        <div className={`absolute inset-x-0 ${touch ? 'bottom-48' : 'bottom-10'} flex justify-center px-4`}>
          <div className="max-w-2xl text-center text-lg md:text-xl font-bold font-montserrat" style={OUTLINE}>
            <Highlighted text={s.missionText} />
          </div>
        </div>
      )}

      {!touch && (
        <div className="absolute left-4 bottom-4">
          <Minimap G={G} size={190} />
        </div>
      )}

      {s.inCar && (
        <div className={`absolute ${touch ? 'right-5 bottom-48' : 'right-5 bottom-5'} text-right`} style={HEAVY}>
          <div className="text-4xl" style={OUTLINE}>{s.speed}<span className="text-base ml-1">KM/H</span></div>
          <div className="w-32 h-2 ml-auto mt-1 bg-black/70 rounded-sm overflow-hidden">
            <div className="h-full" style={{ width: `${s.carHealth}%`, background: s.carHealth < 35 ? '#ff6b3d' : '#18e5ff' }} />
          </div>
        </div>
      )}

      {touch && !s.paused && !s.panel && (
        <div className="pointer-events-auto">
          <TouchControls input={input} inCar={s.inCar} />
        </div>
      )}

      <div className="pointer-events-auto">
        {s.panel && <PortfolioPanel id={s.panel} onClose={closePanel} />}

        {s.intro && (
          <Overlay>
            <div className="max-w-xl w-full rounded-2xl border-2 border-[#ff2fd0] bg-[#120a24]/95 p-6 shadow-[0_0_40px_#ff2fd055]">
              <h2 className="text-5xl italic text-[#ff2fd0]" style={{ ...HEAVY, textShadow: '0 0 18px #ff2fd0' }}>NEON BAY</h2>
              <p className="mt-3 text-slate-200 font-montserrat text-sm leading-relaxed">
                Welcome to my city. Steal a ride, cruise to the radio, run missions, and outrun the cops.
                The <span className="text-[#ff2fd0] font-bold">glowing beams</span> are my portfolio: stop inside one and press <b>E</b> to see my projects, skills, education and more.
              </p>
              <div className="mt-5">
                <Controls touch={touch} />
              </div>
              <button onClick={resume} className="mt-6 w-full py-3 rounded-xl font-black text-xl text-black bg-gradient-to-r from-[#ff2fd0] to-[#18e5ff] hover:brightness-110" style={HEAVY}>
                START
              </button>
            </div>
          </Overlay>
        )}

        {s.paused && !s.intro && (
          <Overlay>
            <div className="max-w-md w-full rounded-2xl border-2 border-[#18e5ff] bg-[#120a24]/95 p-6">
              <h2 className="text-4xl italic text-[#18e5ff] mb-4" style={HEAVY}>PAUSED</h2>
              <Controls touch={touch} />
              <div className="flex gap-3 mt-6">
                <button onClick={resume} className="flex-1 py-2.5 rounded-xl font-black text-black bg-[#18e5ff]">Resume</button>
                <button onClick={onExit} className="flex-1 py-2.5 rounded-xl font-black border border-white/40 hover:bg-white/10">Exit game</button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  )
}
