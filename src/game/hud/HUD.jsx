import { useState } from 'react'
import { useStore } from '../store'
import { FX } from '../fx'
import { saveSettings, clearSave, writeSave } from '../save'
import { skipTour, resetProgress, PROGRESS_TOTALS } from '../sim'
import Minimap from './Minimap'
import PortfolioPanel from './PortfolioPanel'
import TouchControls from './TouchControls'

const HEAVY = { fontFamily: '"Arial Black", Impact, sans-serif' }
const OUTLINE = { textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,.6)' }
const BTN = 'px-3 py-1.5 rounded-lg bg-black/60 border border-white/30 text-sm font-bold hover:bg-white/15'

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
  ['Mouse', 'Look around (click the game to capture the mouse)'],
  ['Left click / Ctrl', 'Shoot'],
  ['Right click', 'Aim'],
  ['1 / 2 / 3, Tab', 'Fists / pistol / SMG'],
  ['Shift', 'Sprint'],
  ['Space', 'Jump / handbrake'],
  ['F', 'Enter / exit vehicle'],
  ['E', 'Interact (portfolio, missions, taxi job)'],
  ['Q / R', 'Change radio station'],
  ['Mouse wheel / C', 'Camera distance'],
  ['V', 'Cinematic camera'],
  ['H / M', 'Horn / mute'],
  ['Esc / P', 'Pause'],
]
const PAD = [
  ['Left stick', 'Walk / steer'],
  ['RT / LT', 'Accelerate / brake (aim on foot)'],
  ['Right stick', 'Look'],
  ['A / B', 'Handbrake, jump / sprint'],
  ['Y / X', 'Enter vehicle / interact'],
  ['RB', 'Shoot'],
  ['LB / D-pad', 'Radio / weapons'],
  ['Start', 'Pause'],
]

function KeyList({ rows }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-montserrat">
      {rows.map(([k, d]) => (
        <div key={k} className="contents">
          <span className="font-bold text-[#18e5ff]">{k}</span>
          <span className="text-slate-200">{d}</span>
        </div>
      ))}
    </div>
  )
}

function Controls({ touch }) {
  if (touch) {
    return (
      <ul className="text-sm text-slate-200 space-y-1 font-montserrat">
        <li>Left stick: walk / drive · drag the screen to look</li>
        <li>CAR: get in / out of a vehicle</li>
        <li>E: interact with portfolio buildings & missions</li>
        <li>JUMP / BRAKE: hold to brake or jump</li>
        <li>🔫: shoot · 📻: change radio station</li>
      </ul>
    )
  }
  return (
    <div className="space-y-4">
      <KeyList rows={KEYS} />
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1 font-montserrat">Gamepad</p>
        <KeyList rows={PAD} />
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5 text-sm font-montserrat">
      <span className="text-slate-200">{label}</span>
      {children}
    </label>
  )
}

function Settings({ G, onCinematic }) {
  const [s, setS] = useState(FX.settings)
  const [confirm, setConfirm] = useState(false)
  const set = (k, v) => {
    const n = { ...s, [k]: v }
    setS(n)
    FX.settings = n
    FX.version++
    saveSettings(n)
  }
  const select = 'bg-black/60 border border-white/30 rounded px-2 py-1'
  const slider = (k, min = 0, max = 1, stepv = 0.05) => (
    <input type="range" min={min} max={max} step={stepv} value={s[k]} onChange={(e) => set(k, +e.target.value)} className="w-36 accent-[#18e5ff]" />
  )
  return (
    <div>
      <Row label="Graphics">
        <select className={select} value={s.quality} onChange={(e) => set('quality', e.target.value)}>
          <option value="auto">Auto</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </Row>
      <Row label="Weather">
        <select className={select} value={s.weather} onChange={(e) => set('weather', e.target.value)}>
          <option value="dynamic">Dynamic</option>
          <option value="clear">Always clear</option>
          <option value="rain">Always rain</option>
        </select>
      </Row>
      <Row label="Master volume">{slider('master')}</Row>
      <Row label="Radio volume">{slider('music')}</Row>
      <Row label="Effects volume">{slider('sfx')}</Row>
      <Row label="Look sensitivity">{slider('sensitivity', 0.3, 2.5, 0.1)}</Row>
      <Row label="Invert look up/down">
        <input type="checkbox" checked={s.invertY} onChange={(e) => set('invertY', e.target.checked)} className="w-4 h-4 accent-[#18e5ff]" />
      </Row>
      <Row label="Show FPS">
        <input type="checkbox" checked={s.showFps} onChange={(e) => set('showFps', e.target.checked)} className="w-4 h-4 accent-[#18e5ff]" />
      </Row>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className={BTN} onClick={onCinematic}>🎬 Cinematic camera (V)</button>
        {confirm ? (
          <button
            className={`${BTN} border-red-400 text-red-300`}
            onClick={() => {
              clearSave()
              resetProgress(G)
              writeSave(G)
              setConfirm(false)
            }}
          >
            Really reset all progress?
          </button>
        ) : (
          <button className={BTN} onClick={() => setConfirm(true)}>Reset progress</button>
        )}
      </div>
    </div>
  )
}

function Progress({ G }) {
  const p = G.progress
  const rows = [
    ['Cash', `$${G.cash}`],
    ['Missions completed', `${Object.keys(G.missionsDone).length} / ${PROGRESS_TOTALS.missions}`],
    ['Hidden neon tapes', `${p.packages.size} / ${PROGRESS_TOTALS.packages}`],
    ['Stunt jumps', `${p.stunts.size} / ${PROGRESS_TOTALS.stunts}`],
    ['Portfolio tour', p.tourDone ? 'Done' : 'In progress'],
  ]
  if (p.best.taxi) rows.push(['Best taxi shift', `$${p.best.taxi}`])
  return <KeyList rows={rows} />
}

function Overlay({ children }) {
  return <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">{children}</div>
}

function Loading({ loading }) {
  const l = useStore(loading)
  if (l.done) return null
  const texFrac = l.total ? l.loaded / l.total : 0
  const pct = Math.round(15 + texFrac * 55 + (texFrac >= 1 ? 15 : 0))
  return (
    <div className="absolute inset-0 z-50 bg-[#120a24] flex flex-col items-center justify-center gap-5 p-6">
      <h2 className="text-5xl md:text-6xl italic text-[#ff2fd0]" style={{ ...HEAVY, textShadow: '0 0 18px #ff2fd0' }}>NEON BAY</h2>
      <div className="w-72 max-w-full h-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#ff2fd0] to-[#18e5ff] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-montserrat text-sm text-slate-300">
        {texFrac < 1 ? `Loading textures ${l.loaded}/${l.total || '…'}` : 'Building the city…'}
      </p>
    </div>
  )
}

function ObjectiveArrow({ bearing }) {
  if (bearing === null || bearing === undefined) return null
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2">
      <div style={{ transform: `rotate(${bearing}rad)` }} className="w-10 h-10 flex items-start justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <path d="M20 2 L34 30 L20 23 L6 30 Z" fill="#ffd21f" stroke="#000" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}

export default function HUD({ G, hud, loading, audioRef, input, onExit, touch }) {
  const s = useStore(hud)
  const [tab, setTab] = useState('controls')
  const refresh = () => hud.set({ ...hud.get(), paused: G.ui.paused, panel: G.ui.panel, intro: !!G.ui.intro, muted: !!G.ui.muted, cinematic: !!G.ui.cinematic, tour: !!G.tour })
  const resume = () => {
    G.ui.paused = false
    G.ui.intro = false
    audioRef.current?.resume()
    refresh()
  }
  const pause = () => {
    G.ui.paused = true
    input.releasePointer()
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
  const cinematic = () => {
    G.ui.cinematic = true
    G.ui.paused = false
    audioRef.current?.resume()
    refresh()
  }
  const exit = () => {
    input.releasePointer()
    onExit()
  }
  const hh = String(Math.floor(s.clock / 60) % 24).padStart(2, '0')
  const mm = String(s.clock % 60).padStart(2, '0')
  const showFps = FX.settings?.showFps

  if (s.cinematic) {
    return (
      <div className="absolute inset-0 pointer-events-none text-white select-none">
        <div className="absolute bottom-4 right-5 text-xs font-montserrat text-white/50 animate-pulse">Cinematic mode · press V or Esc to exit</div>
        <Loading loading={loading} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none text-white select-none">
      {/* top-left: buttons + help prompt */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-3 items-start pointer-events-auto max-w-[min(360px,60vw)]">
        <div className="flex gap-2">
          <button onClick={exit} className={BTN}>✕ Exit</button>
          <button onClick={pause} className={BTN}>❚❚</button>
          <button onClick={mute} className={BTN}>{s.muted ? '🔇' : '🔊'}</button>
          {s.tour && !s.intro && (
            <button onClick={() => { skipTour(G); refresh() }} className={BTN}>Skip tour</button>
          )}
        </div>
        {touch && <Minimap G={G} size={120} />}
        {s.prompt && (
          <div className="bg-black/75 rounded-md px-4 py-3 text-sm font-montserrat border-l-4 border-[#ff2fd0]">
            {touch ? s.prompt.replace('Press E', 'Tap E').replace('Press F', 'Tap CAR') : s.prompt}
          </div>
        )}
        {showFps && <div className="text-xs font-mono bg-black/60 px-2 py-1 rounded">{s.fps} FPS</div>}
      </div>

      {/* top-right: clock, cash, health, armour, wanted, weapon */}
      <div className="absolute top-3 right-4 flex flex-col items-end gap-1" style={HEAVY}>
        <div className="text-2xl tracking-wide" style={OUTLINE}>{hh}:{mm}</div>
        <div className="text-3xl text-[#3bdc6a] tracking-wider" style={OUTLINE}>${String(s.cash).padStart(8, '0')}</div>
        <div className="w-40 h-3 bg-black/70 border border-black rounded-sm overflow-hidden">
          <div className="h-full bg-[#ff3b6b] transition-all" style={{ width: `${s.health}%` }} />
        </div>
        <Stars level={s.wanted} flashing={s.flashing} />
        {s.weapon && s.weapon !== 'Fists' && (
          <div className="text-lg" style={OUTLINE}>
            {s.weapon} <span className="text-[#ffd21f]">{s.ammo === Infinity || s.ammo === null ? '∞' : s.ammo}</span>
          </div>
        )}
        {s.timer !== null && (
          <div className="mt-1 text-2xl" style={OUTLINE}>
            TIME {Math.floor(s.timer / 60)}:{String(s.timer % 60).padStart(2, '0')}
          </div>
        )}
        {s.counter && <div className="text-xl text-[#ffd21f]" style={OUTLINE}>{s.counter}</div>}
      </div>

      {s.toast && (
        <div className={`absolute ${touch ? 'top-[34%]' : 'top-16'} left-1/2 -translate-x-1/2 text-center whitespace-nowrap`} style={HEAVY}>
          <div className="text-xl sm:text-2xl text-[#ffd21f] italic" style={OUTLINE}>{s.toast}</div>
        </div>
      )}
      <ObjectiveArrow bearing={s.objBearing} />
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

      {s.aiming && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-6 h-6 rounded-full border-2 ${s.locked ? 'border-[#ff3b3b]' : 'border-white/90'}`} />
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" />
        </div>
      )}
      {s.hitT && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-white" style={OUTLINE}>✕</div>}
      {s.hurtT && <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(200,0,30,0.55)]" />}

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

      {touch && !s.paused && !s.panel && !s.intro && (
        <div className="pointer-events-auto">
          <TouchControls input={input} inCar={s.inCar} />
        </div>
      )}

      <div className="pointer-events-auto">
        {s.panel && <PortfolioPanel id={s.panel} onClose={closePanel} />}

        {s.intro && (
          <Overlay>
            <div className="max-w-xl w-full max-h-full overflow-y-auto rounded-2xl border-2 border-[#ff2fd0] bg-[#120a24]/95 p-6 shadow-[0_0_40px_#ff2fd055]">
              <h2 className="text-5xl italic text-[#ff2fd0]" style={{ ...HEAVY, textShadow: '0 0 18px #ff2fd0' }}>NEON BAY</h2>
              <p className="mt-3 text-slate-200 font-montserrat text-sm leading-relaxed">
                Welcome to my city. Steal a ride, cruise to the radio, run missions, and outrun the cops.
                The <span className="text-[#ff2fd0] font-bold">glowing beams</span> are my portfolio: stop inside one and press <b>E</b> to see my projects, skills, education and more.
                {s.tour && ' A yellow arrow will guide you on a quick tour.'}
              </p>
              {G.cash > 0 && <p className="mt-2 text-[#3bdc6a] text-sm font-montserrat">Welcome back! Your progress was restored (${G.cash}).</p>}
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
            <div className="max-w-lg w-full max-h-full overflow-y-auto rounded-2xl border-2 border-[#18e5ff] bg-[#120a24]/95 p-6">
              <h2 className="text-4xl italic text-[#18e5ff] mb-4" style={HEAVY}>PAUSED</h2>
              <div className="flex gap-2 mb-4">
                {['controls', 'settings', 'progress'].map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${tab === t ? 'bg-[#18e5ff] text-black' : 'bg-white/10'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'controls' && <Controls touch={touch} />}
              {tab === 'settings' && <Settings G={G} onCinematic={cinematic} />}
              {tab === 'progress' && <Progress G={G} />}
              <div className="flex gap-3 mt-6">
                <button onClick={resume} className="flex-1 py-2.5 rounded-xl font-black text-black bg-[#18e5ff]">Resume</button>
                <button onClick={exit} className="flex-1 py-2.5 rounded-xl font-black border border-white/40 hover:bg-white/10">Exit game</button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
      <Loading loading={loading} />
    </div>
  )
}
