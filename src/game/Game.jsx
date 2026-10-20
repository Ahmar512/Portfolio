import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import HUD from './hud/HUD'
import { createGame, hudSnapshot } from './sim'
import { createInput } from './input'
import { createAudio } from './audio'
import { createStore } from './store'
import { setQuality } from './fx'

export default function Game({ onExit }) {
  const G = useMemo(() => {
    const g = createGame()
    g.ui.intro = true
    g.ui.paused = true
    return g
  }, [])
  const input = useMemo(() => createInput(), [])
  const hud = useMemo(() => createStore(hudSnapshot(G)), [G])
  const audioRef = useRef(null)
  const touch = useMemo(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    setQuality(!coarse)
    return coarse
  }, [])

  useEffect(() => input.attach(), [input])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__neonBay = G
    return () => delete window.__neonBay
  }, [G])

  useEffect(() => {
    const audio = createAudio()
    audioRef.current = audio
    return () => {
      audioRef.current = null
      audio?.dispose()
    }
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[1000] bg-black" style={{ touchAction: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows={touch ? false : 'soft'}
        dpr={touch ? [1, 1.25] : [1, 1.75]}
        camera={{ fov: 62, near: 0.5, far: 1000, position: [-24, 4, 2] }}
        gl={{ antialias: !touch, powerPreference: 'high-performance', toneMappingExposure: 0.9 }}
      >
        <Scene G={G} input={input} audioRef={audioRef} hud={hud} />
      </Canvas>
      <HUD G={G} hud={hud} audioRef={audioRef} input={input} onExit={onExit} touch={touch} />
    </div>
  )
}
