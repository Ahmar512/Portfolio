// Progress and settings persist in localStorage. Every access is guarded: storage can be
// unavailable (private mode, blocked cookies) and the game must still work without it.

const SAVE_KEY = 'neonbay-save-v1'
const SETTINGS_KEY = 'neonbay-settings-v1'

export const DEFAULT_SETTINGS = {
  quality: 'auto', // auto | high | medium | low
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
  sensitivity: 1,
  invertY: false,
  weather: 'dynamic', // dynamic | clear | rain
  showFps: false,
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked: progress just won't persist
  }
}

export const loadSave = () => read(SAVE_KEY)

export function writeSave(G) {
  write(SAVE_KEY, {
    cash: G.cash,
    missionsDone: G.missionsDone,
    packages: [...G.progress.packages],
    stunts: [...G.progress.stunts],
    tourDone: G.progress.tourDone,
    best: G.progress.best,
    savedAt: Date.now(),
  })
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) || {}) })
export const saveSettings = (s) => write(SETTINGS_KEY, s)
