import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './scene/Scene'
import HUD from './hud/HUD'
import { createGame, hudSnapshot } from './sim'
import { createInput } from './input'
import { createAudio } from './audio'
import { createStore } from './store'
import { FX, setQuality } from './fx'
import { loadSave, loadSettings, writeSave } from './save'

export default function Game({ onExit }) {
  const touch = useMemo(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    setQuality(!coarse)
    FX.settings = loadSettings()
    FX.version++
    return coarse
  }, [])
  const G = useMemo(() => {
    const g = createGame(loadSave())
    g.ui.intro = true
    g.ui.paused = true
    g.ui.loading = true
    return g
  }, [])
  const input = useMemo(() => createInput(), [])
  const hud = useMemo(() => createStore(hudSnapshot(G)), [G])
  const loading = useMemo(() => createStore({ loaded: 0, total: 0, done: false }), [])
  const audioRef = useRef(null)
  const root = useRef(null)

  useEffect(() => input.attach(root.current), [input])

  // Loading progress: textures via three's default manager, then shader compilation (Scene's Warmup)
  useEffect(() => {
    const m = THREE.DefaultLoadingManager
    const prev = m.onProgress
    m.onProgress = (_, loaded, total) => loading.set({ ...loading.get(), loaded, total })
    return () => {
      m.onProgress = prev
    }
  }, [loading])
  const onReady = useCallback(() => {
    G.ui.loading = false
    loading.set({ ...loading.get(), done: true })
    hud.set(hudSnapshot(G))
  }, [G, hud, loading])

  // Autosave: right after progress events, and every 20s anyway
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      if (G.dirty || now - last > 20000) {
        G.dirty = false
        last = now
        writeSave(G)
      }
    }, 1000)
    return () => {
      clearInterval(id)
      writeSave(G)
    }
  }, [G])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__neonBay = G
    return () => delete window.__neonBay
  }, [G])

  useEffect(() => {
    const audio = createAudio()
    audioRef.current = audio
    if (audio && FX.settings) audio.setVolumes(FX.settings)
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
    <div ref={root} className="fixed inset-0 z-[1000] bg-black" style={{ touchAction: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows={touch ? false : 'soft'}
        dpr={touch ? [1, 1.25] : [1, 1.75]}
        camera={{ fov: 62, near: 0.5, far: 1000, position: [-24, 4, 2] }}
        gl={{ antialias: !touch, powerPreference: 'high-performance', toneMappingExposure: 0.9 }}
      >
        <Scene G={G} input={input} audioRef={audioRef} hud={hud} onReady={onReady} />
      </Canvas>
      <HUD G={G} hud={hud} loading={loading} audioRef={audioRef} input={input} onExit={onExit} touch={touch} />
    </div>
  )
}
