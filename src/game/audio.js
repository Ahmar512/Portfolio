// All sound is synthesised with WebAudio: three procedural radio stations, engine, siren and SFX.
// No audio files are shipped, so there is nothing to license and nothing extra to download.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)

const STATIONS = [
  {
    name: 'NEON FM 103.5',
    genre: 'Synthwave',
    bpm: 100,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    bass: [45, 41, 48, 43],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    bassPat: 'x.x.x.x.x.x.x.x.',
    arpPat: 'xxxxxxxxxxxxxxxx',
    arp: [0, 1, 2, 1, 0, 1, 2, 3],
    lead: 0.07,
  },
  {
    name: 'BAY BREEZE 91.5',
    genre: 'Chill',
    bpm: 84,
    chords: [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 49, 52, 57]],
    bass: [38, 35, 43, 45],
    kick: 'x.........x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    bassPat: 'x.........x.....',
    arpPat: 'x..x..x...x..x..',
    arp: [3, 2, 1, 2, 0, 1],
    lead: 0.06,
  },
  {
    name: 'TURBO 88',
    genre: 'Italo Disco',
    bpm: 124,
    chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 51, 54]],
    bass: [40, 36, 38, 35],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    bassPat: 'xxxxxxxxxxxxxxxx',
    arpPat: 'x.xxx.xxx.xxx.xx',
    arp: [0, 2, 1, 2, 0, 3, 1, 2],
    lead: 0.06,
    octaveBass: true,
  },
  { name: 'RADIO OFF', off: true },
]

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.8
  master.connect(ctx.destination)

  const radio = ctx.createGain()
  radio.gain.value = 0
  radio.connect(master)
  const sfx = ctx.createGain()
  sfx.gain.value = 0.7
  sfx.connect(master)

  // Echo for the lead synth
  const delay = ctx.createDelay(1)
  const fb = ctx.createGain()
  const wet = ctx.createGain()
  fb.gain.value = 0.32
  wet.gain.value = 0.35
  delay.connect(fb).connect(delay)
  delay.connect(wet).connect(radio)

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  // ---- building blocks -------------------------------------------------
  const env = (g, t, peak, a, d) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }
  const tone = (type, freq, t, dur, peak, dest, { attack = 0.005, filter, endFreq } = {}) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    const g = ctx.createGain()
    env(g, t, peak, attack, dur)
    let node = o
    if (filter) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = filter
      node.connect(f)
      node = f
    }
    node.connect(g).connect(dest)
    o.start(t)
    o.stop(t + attack + dur + 0.05)
    return o
  }
  const burst = (t, dur, peak, dest, type, freq, endFreq) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, t)
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    const g = ctx.createGain()
    env(g, t, peak, 0.003, dur)
    s.connect(f).connect(g).connect(dest)
    s.start(t, Math.random() * 0.5)
    s.stop(t + dur + 0.05)
  }

  // ---- radio -------------------------------------------------------------
  let station = 0
  let step = 0
  let nextTime = 0
  let playing = false

  function scheduleStep(st, s, t, spb) {
    const i = s % 16
    const bar = Math.floor(s / 16) % st.chords.length
    const chord = st.chords[bar]
    if (st.kick[i] === 'x') tone('sine', 150, t, 0.28, 0.9, radio, { endFreq: 42 })
    if (st.snare[i] === 'x') {
      burst(t, 0.18, 0.35, radio, 'bandpass', 1800)
      tone('triangle', 190, t, 0.08, 0.2, radio)
    }
    if (st.hat[i] === 'x') burst(t, i % 4 === 2 ? 0.12 : 0.04, 0.09, radio, 'highpass', 7000)
    if (st.bassPat[i] === 'x') {
      const root = st.bass[bar] + (st.octaveBass && i % 2 ? 12 : 0)
      tone('sawtooth', mtof(root), t, spb * 1.6, 0.22, radio, { filter: 520 })
    }
    if (st.arpPat[i] === 'x') {
      const k = st.arp[(s >> 0) % st.arp.length] % chord.length
      const oct = st.arp[s % st.arp.length] >= chord.length ? 24 : 12
      const o = tone('square', mtof(chord[k] + oct), t, spb * 0.9, st.lead, radio, { filter: 2600 })
      const g2 = ctx.createGain()
      g2.gain.value = 0.5
      o.connect(g2).connect(delay)
    }
    if (i === 0) {
      // pad: detuned saws held for the bar
      const dur = spb * 16
      chord.forEach((n) => {
        [-6, 6].forEach((det) => {
          const o = ctx.createOscillator()
          o.type = 'sawtooth'
          o.frequency.value = mtof(n)
          o.detune.value = det
          const f = ctx.createBiquadFilter()
          f.type = 'lowpass'
          f.frequency.value = 1300
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.022, t + 0.4)
          g.gain.setValueAtTime(0.022, t + dur - 0.3)
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
          o.connect(f).connect(g).connect(radio)
          o.start(t)
          o.stop(t + dur + 0.05)
        })
      })
    }
  }

  const timer = setInterval(() => {
    const st = STATIONS[station]
    if (!playing || st.off || ctx.state !== 'running') return
    const spb = 60 / st.bpm / 4
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(st, step, nextTime, spb)
      step++
      nextTime += spb
    }
  }, 40)
  delay.delayTime.value = (60 / STATIONS[0].bpm) * 0.75

  // ---- engine & siren ------------------------------------------------------
  const engOsc = ctx.createOscillator()
  engOsc.type = 'sawtooth'
  const engOsc2 = ctx.createOscillator()
  engOsc2.type = 'square'
  const engF = ctx.createBiquadFilter()
  engF.type = 'lowpass'
  engF.frequency.value = 700
  const engG = ctx.createGain()
  engG.gain.value = 0
  engOsc.connect(engF)
  engOsc2.connect(engF)
  engF.connect(engG).connect(sfx)
  engOsc.start()
  engOsc2.start()

  const sirenOsc = ctx.createOscillator()
  sirenOsc.type = 'triangle'
  const sirenG = ctx.createGain()
  sirenG.gain.value = 0
  sirenOsc.connect(sirenG).connect(sfx)
  sirenOsc.start()

  let muted = false
  let inCar = false

  const now = () => ctx.currentTime

  const audio = {
    get stationName() {
      return STATIONS[station].name
    },
    get stationGenre() {
      return STATIONS[station].genre
    },
    get muted() {
      return muted
    },
    resume() {
      if (ctx.state === 'suspended') ctx.resume()
    },
    suspend() {
      if (ctx.state === 'running') ctx.suspend()
    },
    toggleMute() {
      muted = !muted
      master.gain.setTargetAtTime(muted ? 0 : 0.8, now(), 0.05)
      return muted
    },
    changeStation(dir) {
      station = (station + dir + STATIONS.length) % STATIONS.length
      step = 0
      nextTime = 0
      const st = STATIONS[station]
      if (!st.off) delay.delayTime.value = (60 / st.bpm) * 0.75
      burst(now(), 0.25, 0.25, sfx, 'bandpass', 3000, 600)
      return st.name
    },
    update(G) {
      const t = now()
      const v = G.player.vehicle
      const car = !!v && G.deadT <= 0
      if (car !== inCar) {
        inCar = car
        playing = car
        radio.gain.setTargetAtTime(car ? 0.55 : 0, t, car ? 0.3 : 0.15)
      }
      if (v) {
        const s = Math.abs(v.speed)
        const gear = Math.floor(s / 11)
        const rpm = (s % 11) / 11
        const f = 38 + rpm * 55 + gear * 9 + Math.max(0, v.throttle) * 8
        engOsc.frequency.setTargetAtTime(f, t, 0.05)
        engOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.05)
        engG.gain.setTargetAtTime(0.05 + Math.max(0, v.throttle) * 0.04, t, 0.1)
      } else engG.gain.setTargetAtTime(0, t, 0.1)

      let near = Infinity
      if (G.wanted.level > 0) {
        const P = v || G.player
        for (const u of G.vehicles) {
          if (u.role !== 'police' || u.ai !== 'police') continue
          near = Math.min(near, Math.hypot(u.x - P.x, u.z - P.z))
        }
      }
      const sv = near < 120 ? 0.09 * (1 - near / 120) : 0
      sirenG.gain.setTargetAtTime(sv, t, 0.2)
      sirenOsc.frequency.setTargetAtTime(Math.floor(t / 0.45) % 2 ? 700 : 960, t, 0.03)
    },
    event(e) {
      const t = now()
      switch (e.type) {
        case 'crash':
          burst(t, 0.35, Math.min(1, e.power / 22), sfx, 'lowpass', 900)
          tone('sine', 90, t, 0.25, Math.min(0.8, e.power / 25), sfx, { endFreq: 40 })
          break
        case 'hit':
          burst(t, 0.15, 0.5, sfx, 'lowpass', 400)
          break
        case 'explosion':
          burst(t, 1.4, 1, sfx, 'lowpass', 1500, 80)
          tone('sine', 60, t, 1, 0.9, sfx, { endFreq: 25 })
          break
        case 'cash':
          tone('sine', 988, t, 0.08, 0.3, sfx)
          tone('sine', 1319, t + 0.08, 0.18, 0.3, sfx)
          break
        case 'horn':
          if (e.player) {
            tone('square', 392, t, 0.35, 0.12, sfx, { filter: 1800, attack: 0.01 })
            tone('square', 494, t, 0.35, 0.12, sfx, { filter: 1800, attack: 0.01 })
          } else tone('square', 330, t, 0.25, 0.04, sfx, { filter: 1200 })
          break
        case 'wantedUp':
          tone('square', 660, t, 0.1, 0.12, sfx, { filter: 2400 })
          tone('square', 880, t + 0.12, 0.15, 0.12, sfx, { filter: 2400 })
          break
        case 'wantedDown':
          tone('sine', 880, t, 0.1, 0.15, sfx)
          tone('sine', 660, t + 0.1, 0.15, 0.15, sfx)
          break
        case 'missionStart':
        case 'missionPassed':
          [60, 64, 67, 72, 76].forEach((n, i) => tone('square', mtof(n + 12), t + i * 0.09, 0.25, 0.1, sfx, { filter: 3000 }))
          break
        case 'missionFailed':
        case 'wasted':
        case 'busted':
          [67, 63, 60, 55].forEach((n, i) => tone('sawtooth', mtof(n), t + i * 0.18, 0.4, 0.1, sfx, { filter: 1400 }))
          break
        case 'checkpoint':
          tone('sine', 1200, t, 0.12, 0.25, sfx)
          tone('sine', 1600, t + 0.07, 0.15, 0.2, sfx)
          break
        case 'countdown':
          tone('square', 660, t, 0.18, 0.12, sfx, { filter: 2500 })
          break
        case 'go':
          tone('square', 1320, t, 0.4, 0.14, sfx, { filter: 3500 })
          break
        case 'enter':
        case 'exit':
        case 'jack':
          burst(t, 0.08, 0.35, sfx, 'lowpass', 600)
          break
        case 'spray':
          burst(t, 1.2, 0.3, sfx, 'highpass', 3000)
          break
        case 'panel':
          tone('sine', 740, t, 0.1, 0.15, sfx)
          break
        default:
      }
    },
    dispose() {
      clearInterval(timer)
      ctx.close()
    },
  }
  return audio
}
