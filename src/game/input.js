// Keyboard, mouse, gamepad and touch input. Held inputs become axes / flags;
// one-shot actions are queued and `take`n by the game.

const ACTIONS = {
  KeyF: 'enter', Enter: 'enter',
  KeyE: 'action',
  KeyR: 'radioNext', KeyQ: 'radioPrev',
  KeyC: 'camera',
  KeyM: 'mute',
  KeyH: 'horn',
  KeyV: 'cinematic',
  Digit1: 'weapon1', Digit2: 'weapon2', Digit3: 'weapon3',
  Tab: 'weaponNext',
  Escape: 'pause', KeyP: 'pause',
}
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', ...Object.keys(ACTIONS)])

// Standard gamepad mapping
const PAD_ACTIONS = { 3: 'enter', 2: 'action', 4: 'radioNext', 9: 'pause', 8: 'camera', 12: 'weaponNext', 13: 'cinematic' }
const DEAD = 0.15
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD))

export function createInput() {
  const keys = new Set()
  const pressed = new Set()
  const touch = { x: 0, y: 0, active: false, hb: false, fire: false, aim: false }
  const mouse = { fire: false, aim: false, dx: 0, dy: 0, wheel: 0 }
  const padPrev = []

  const input = {
    throttle: 0, // vehicles (keys, stick or triggers)
    walk: 0, // on foot (keys or stick only; triggers are brake / aim)
    steer: 0,
    sprint: false,
    handbrake: false,
    jump: false,
    fire: false,
    aim: false,
    lookX: 0, // camera look deltas this frame (pixels-ish)
    lookY: 0,
    zoom: 0,
    usingPad: false,
    touch,
    mouse,
    target: null, // element that receives mouse input (the game root)
    press(action) {
      pressed.add(action)
    },
    take(action) {
      return pressed.delete(action)
    },
    clearPresses() {
      pressed.clear()
    },
    update(dt = 1 / 60) {
      const k = (...codes) => codes.some((c) => keys.has(c))
      let throttle = (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0)
      let walk
      let steer = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0)
      let sprint = k('ShiftLeft', 'ShiftRight')
      let hb = k('Space')
      let fire = mouse.fire || k('ControlLeft')
      let aim = mouse.aim
      let lookX = mouse.dx
      let lookY = mouse.dy
      mouse.dx = mouse.dy = 0
      input.zoom = mouse.wheel
      mouse.wheel = 0

      if (touch.active) {
        throttle = -touch.y
        steer = touch.x
        sprint = sprint || Math.hypot(touch.x, touch.y) > 0.9
      }
      hb = hb || touch.hb
      fire = fire || touch.fire
      aim = aim || touch.aim

      // Gamepad (first connected one)
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const pad = pads && Array.from(pads).find((p) => p && p.connected)
      if (pad) {
        const b = (i) => pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.4)
        const v = (i) => (pad.buttons[i] ? pad.buttons[i].value : 0)
        const lx = dz(pad.axes[0] || 0)
        const ly = dz(pad.axes[1] || 0)
        const rx = dz(pad.axes[2] || 0)
        const ry = dz(pad.axes[3] || 0)
        const trig = v(7) - v(6)
        const active = Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) + Math.abs(trig) > 0 || pad.buttons.some((x) => x.pressed)
        if (active) input.usingPad = true
        if (Math.abs(lx) > 0) steer = lx
        // triggers drive cars, the stick walks on foot; whichever is pushed harder wins
        const padThrottle = Math.abs(trig) > Math.abs(ly) ? trig : -ly
        if (Math.abs(padThrottle) > 0) throttle = padThrottle
        if (Math.abs(ly) > 0) walk = -ly
        sprint = sprint || b(1)
        hb = hb || b(0)
        fire = fire || b(5)
        aim = aim || b(6)
        lookX += rx * 900 * dt
        lookY += ry * 600 * dt
        for (const [i, action] of Object.entries(PAD_ACTIONS)) {
          const now = !!b(+i)
          if (now && !padPrev[i]) pressed.add(action)
          padPrev[i] = now
        }
      }

      input.throttle = Math.max(-1, Math.min(1, throttle))
      input.walk = walk === undefined ? input.throttle : walk
      input.steer = Math.max(-1, Math.min(1, steer))
      input.sprint = sprint
      input.handbrake = hb
      input.jump = hb
      input.fire = fire
      input.aim = aim
      input.lookX = lookX
      input.lookY = lookY
    },
    attach(root) {
      input.target = root
      const down = (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
        if (!GAME_KEYS.has(e.code)) return
        e.preventDefault()
        input.usingPad = false
        if (!e.repeat && ACTIONS[e.code]) pressed.add(ACTIONS[e.code])
        keys.add(e.code)
      }
      const up = (e) => keys.delete(e.code)
      const blur = () => {
        keys.clear()
        mouse.fire = mouse.aim = false
      }
      // Mouse: click locks the pointer (desktop), then moving it turns the camera.
      const onCanvas = (e) => root && e.target instanceof HTMLCanvasElement && root.contains(e.target)
      const mdown = (e) => {
        if (e.pointerType !== 'mouse' || !onCanvas(e)) return
        input.usingPad = false
        if (document.pointerLockElement !== root && root.requestPointerLock) {
          try {
            const r = root.requestPointerLock()
            if (r && r.catch) r.catch(() => {})
          } catch {
            // pointer lock unavailable: dragging still works
          }
        }
        if (e.button === 0) mouse.fire = true
        if (e.button === 2) mouse.aim = true
        mouse.dragging = true
      }
      const mup = (e) => {
        if (e.pointerType !== 'mouse') return
        if (e.button === 0) mouse.fire = false
        if (e.button === 2) mouse.aim = false
        mouse.dragging = false
      }
      const mmove = (e) => {
        if (e.pointerType !== 'mouse') return
        if (document.pointerLockElement === root || (mouse.dragging && onCanvas(e))) {
          mouse.dx += e.movementX || 0
          mouse.dy += e.movementY || 0
        }
      }
      const wheel = (e) => {
        if (!onCanvas(e)) return
        mouse.wheel += Math.sign(e.deltaY)
      }
      const lockChange = () => {
        if (document.pointerLockElement !== root) mouse.fire = mouse.aim = false
      }
      window.addEventListener('keydown', down)
      window.addEventListener('keyup', up)
      window.addEventListener('blur', blur)
      window.addEventListener('pointerdown', mdown)
      window.addEventListener('pointerup', mup)
      window.addEventListener('pointermove', mmove)
      window.addEventListener('wheel', wheel, { passive: true })
      document.addEventListener('pointerlockchange', lockChange)
      return () => {
        window.removeEventListener('keydown', down)
        window.removeEventListener('keyup', up)
        window.removeEventListener('blur', blur)
        window.removeEventListener('pointerdown', mdown)
        window.removeEventListener('pointerup', mup)
        window.removeEventListener('pointermove', mmove)
        window.removeEventListener('wheel', wheel)
        document.removeEventListener('pointerlockchange', lockChange)
        if (document.pointerLockElement === root) document.exitPointerLock()
      }
    },
    releasePointer() {
      if (document.pointerLockElement && document.pointerLockElement === input.target) document.exitPointerLock()
      mouse.fire = mouse.aim = false
    },
  }
  return input
}
