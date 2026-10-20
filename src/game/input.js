// Keyboard + touch input. Held keys become axes; one-shot actions are queued and `take`n by the game.

const ACTIONS = {
  KeyF: 'enter', Enter: 'enter',
  KeyE: 'action',
  KeyR: 'radioNext', KeyQ: 'radioPrev',
  KeyC: 'camera',
  KeyM: 'mute',
  KeyH: 'horn',
  Escape: 'pause', KeyP: 'pause',
}
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', ...Object.keys(ACTIONS)])

export function createInput() {
  const keys = new Set()
  const pressed = new Set()
  const touch = { x: 0, y: 0, active: false, hb: false }

  const input = {
    throttle: 0,
    steer: 0,
    sprint: false,
    handbrake: false,
    jump: false,
    touch,
    press(action) {
      pressed.add(action)
    },
    take(action) {
      return pressed.delete(action)
    },
    update() {
      const k = (...codes) => codes.some((c) => keys.has(c))
      let throttle = (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0)
      let steer = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0)
      if (touch.active) {
        throttle = -touch.y
        steer = touch.x
      }
      input.throttle = throttle
      input.steer = steer
      input.sprint = k('ShiftLeft', 'ShiftRight') || (touch.active && Math.hypot(touch.x, touch.y) > 0.9)
      input.handbrake = k('Space') || touch.hb
      input.jump = input.handbrake
    },
    attach() {
      const down = (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (!GAME_KEYS.has(e.code)) return
        e.preventDefault()
        if (!e.repeat && ACTIONS[e.code]) pressed.add(ACTIONS[e.code])
        keys.add(e.code)
      }
      const up = (e) => keys.delete(e.code)
      const blur = () => keys.clear()
      window.addEventListener('keydown', down)
      window.addEventListener('keyup', up)
      window.addEventListener('blur', blur)
      return () => {
        window.removeEventListener('keydown', down)
        window.removeEventListener('keyup', up)
        window.removeEventListener('blur', blur)
      }
    },
  }
  return input
}
