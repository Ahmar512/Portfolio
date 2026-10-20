import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import City, { SKY } from './City'
import Entities from './Entities'
import Effects from './Effects'
import { WORLD } from '../world'
import { step, hudSnapshot } from '../sim'
import { FX } from '../fx'

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
// Only buildings block the camera (palms and fountains are too small to matter).
const CAM_BLOCKERS = WORLD.colliders.filter((c) => c.maxX - c.minX > 2 && c.maxZ - c.minZ > 2)
const blocked = (x, z) => CAM_BLOCKERS.some((c) => x > c.minX - 0.6 && x < c.maxX + 0.6 && z > c.minZ - 0.6 && z < c.maxZ + 0.6)

const CAM = {
  car: { dist: [10, 15, 6.5], height: [3.8, 5.8, 2.4] },
  foot: { dist: [5.5, 8.5, 3.5], height: [2.4, 3.6, 1.9] },
}

function Loop({ G, input, audioRef, hud }) {
  const { camera, scene } = useThree()
  if (import.meta.env.DEV) window.__neonScene = scene
  const cam = useRef({ yaw: G.player.heading, dist: 8, mode: 0 })
  const sun = useRef()
  const hudT = useRef(0)
  const wasPaused = useRef(null)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const audio = audioRef.current
    const c = cam.current
    input.update()

    if (input.take('pause') && !G.ui.intro) {
      if (G.ui.panel) G.ui.panel = null
      else G.ui.paused = !G.ui.paused
    }
    if (input.take('mute') && audio) G.ui.muted = audio.toggleMute()
    if (input.take('camera')) c.mode = (c.mode + 1) % 3
    if (input.take('horn') && G.player.vehicle) audio?.event({ type: 'horn', player: true })
    const radioDir = (input.take('radioNext') ? 1 : 0) - (input.take('radioPrev') ? 1 : 0)
    if (radioDir && G.player.vehicle && audio) {
      G.ui.toast = audio.changeStation(radioDir)
      G.ui.toastT = 2.5
    }

    const paused = G.ui.paused || !!G.ui.panel
    if (paused) {
      // drop presses made while paused so they don't fire on resume
      input.take('enter')
      input.take('action')
    }
    if (paused !== wasPaused.current) {
      wasPaused.current = paused
      if (paused) audio?.suspend()
      else audio?.resume()
    }

    step(G, dt, input)

    const P = G.player.vehicle || G.player
    for (const e of G.events) {
      if (e.type === 'horn' && Math.hypot(e.x - P.x, e.z - P.z) > 45) continue
      if (e.type === 'enter' && audio) {
        G.ui.toast = audio.stationName
        G.ui.toastT = 2.5
      }
      audio?.event(e)
    }
    G.events.length = 0
    if (audio && !paused) audio.update(G)

    // ---- chase camera ----
    const inCar = !!G.player.vehicle
    const cfg = inCar ? CAM.car : CAM.foot
    const speed = inCar ? Math.abs(P.speed) : 0
    if (G.deadT > 0) c.yaw += dt * 0.35
    else if (!paused) {
      c.yaw += wrap(P.heading - c.yaw) * Math.min(1, dt * (inCar ? 3.2 : 4))
    }
    G.camYaw = c.yaw
    const want = cfg.dist[c.mode] + speed * 0.07
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw)
    const tx = P.x, ty = P.y + (inCar ? 1.4 : 1.6), tz = P.z
    let free = 1
    for (let k = 1; k <= 14; k++) {
      const f = k / 14
      if (blocked(tx - fx * want * f, tz - fz * want * f)) { free = (k - 1) / 14; break }
    }
    const allowed = Math.max(1.5, want * free)
    c.dist = allowed < c.dist ? allowed : c.dist + (allowed - c.dist) * Math.min(1, dt * 2)
    const h = cfg.height[c.mode] * (0.6 + 0.4 * (c.dist / want))
    camera.position.set(tx - fx * c.dist, ty + h, tz - fz * c.dist)
    camera.lookAt(tx + fx * 3, ty + 0.4, tz + fz * 3)
    if (import.meta.env.DEV && window.__neonCam) {
      // dev-only hook used by screenshot tests
      const o = window.__neonCam
      camera.position.set(...o.pos)
      camera.lookAt(...o.look)
    }
    const fov = 62 + Math.min(speed, 45) * 0.28
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3)
      camera.updateProjectionMatrix()
    }

    // keep the shadow camera centred on the player
    if (sun.current) {
      FX.sunLight = sun.current
      sun.current.position.set(P.x + 60, 80, P.z + 25)
      sun.current.target.position.set(P.x, 0, P.z)
      sun.current.target.updateMatrixWorld()
    }

    hudT.current += delta
    if (hudT.current > 0.1) {
      hudT.current = 0
      hud.set(hudSnapshot(G))
    }
  })

  return (
    <directionalLight
      ref={sun}
      color="#ffd2a1"
      intensity={2.6}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-60}
      shadow-camera-right={60}
      shadow-camera-top={60}
      shadow-camera-bottom={-60}
      shadow-camera-near={10}
      shadow-camera-far={200}
      shadow-bias={-0.0004}
    />
  )
}

export default function Scene({ G, input, audioRef, hud }) {
  return (
    <>
      <fog attach="fog" args={[SKY.horizon, 140, 600]} />
      <hemisphereLight args={['#ffc8e6', '#4a3a6a', 0.55]} />
      <Effects />
      <Loop G={G} input={input} audioRef={audioRef} hud={hud} />
      <City />
      <Entities G={G} />
    </>
  )
}
