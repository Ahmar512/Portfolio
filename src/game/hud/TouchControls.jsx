import { useRef, useState } from 'react'

// On-screen joystick + buttons for phones and tablets. Dragging anywhere else turns the camera.
export default function TouchControls({ input, inCar }) {
  const base = useRef()
  const pointer = useRef(null)
  const look = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const move = (e) => {
    const r = base.current.getBoundingClientRect()
    const rad = r.width / 2
    let x = (e.clientX - (r.left + rad)) / rad
    let y = (e.clientY - (r.top + rad)) / rad
    const d = Math.hypot(x, y)
    if (d > 1) { x /= d; y /= d }
    input.touch.x = Math.abs(x) < 0.12 ? 0 : x
    input.touch.y = Math.abs(y) < 0.12 ? 0 : y
    setKnob({ x, y })
  }
  const end = (e) => {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    input.touch.active = false
    input.touch.x = input.touch.y = 0
    setKnob({ x: 0, y: 0 })
  }

  const Btn = ({ label, action, hold, className = '' }) => {
    const set = (v) => {
      if (hold) input.touch[hold] = v
    }
    return (
      <button
        className={`rounded-full bg-black/45 border-2 border-white/50 text-white font-black active:bg-white/30 ${className}`}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (hold) set(true)
          else input.press(action)
        }}
        onPointerUp={() => set(false)}
        onPointerCancel={() => set(false)}
        onPointerLeave={() => set(false)}
      >
        {label}
      </button>
    )
  }

  return (
    <>
      {/* look layer */}
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const l = look.current
          if (!l || l.id !== e.pointerId) return
          input.mouse.dx += (e.clientX - l.x) * 1.4
          input.mouse.dy += (e.clientY - l.y) * 1.4
          l.x = e.clientX
          l.y = e.clientY
        }}
        onPointerUp={() => (look.current = null)}
        onPointerCancel={() => (look.current = null)}
      />
      <div
        ref={base}
        className="absolute left-6 bottom-6 w-36 h-36 rounded-full bg-black/35 border-2 border-white/40 touch-none"
        onPointerDown={(e) => {
          pointer.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          input.touch.active = true
          move(e)
        }}
        onPointerMove={(e) => pointer.current === e.pointerId && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          className="absolute w-14 h-14 rounded-full bg-white/70 left-1/2 top-1/2 pointer-events-none"
          style={{ transform: `translate(calc(-50% + ${knob.x * 44}px), calc(-50% + ${knob.y * 44}px))` }}
        />
      </div>
      <div className="absolute right-5 bottom-6 grid grid-cols-2 gap-3 touch-none">
        <Btn label={inCar ? 'EXIT' : 'CAR'} action="enter" className="w-16 h-16 text-xs" />
        <Btn label="E" action="action" className="w-16 h-16 text-lg" />
        <Btn label={inCar ? 'BRAKE' : 'JUMP'} hold="hb" className="w-16 h-16 text-xs" />
        {inCar ? <Btn label="📻" action="radioNext" className="w-16 h-16 text-xl" /> : <Btn label="🔫" hold="fire" className="w-16 h-16 text-xl" />}
      </div>
      {!inCar && (
        <div className="absolute right-5 bottom-[11.5rem] touch-none">
          <Btn label="⇄" action="weaponNext" className="w-12 h-12 text-lg" />
        </div>
      )}
    </>
  )
}
