import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import City from './City'
import Atmosphere from './Atmosphere'
import Entities from './Entities'
import Effects from './Effects'
import { WORLD } from '../world'
import { step, hudSnapshot } from '../sim'
import { FX } from '../fx'

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// Only buildings block the camera (palms and fountains are too small to matter).
const CAM_BLOCKERS = WORLD.colliders.filter((c) => c.maxX - c.minX > 2 && c.maxZ - c.minZ > 2)
const blocked = (x, z) => CAM_BLOCKERS.some((c) => x > c.minX - 0.6 && x < c.maxX + 0.6 && z > c.minZ - 0.6 && z < c.maxZ + 0.6)

const CAM = {
  car: { dist: [10, 15, 6.5], height: [3.8, 5.8, 2.4] },
  foot: { dist: [5.5, 8.5, 3.5], height: [2.4, 3.6, 1.9] },
}

// Inputs the player can't use while the cinematic camera is running
const IDLE_INPUT = { throttle: 0, walk: 0, steer: 0, sprint: false, handbrake: false, jump: false, fire: false, aim: false, take: () => false }

const FLYOVER = new THREE.CatmullRomCurve3(
  [
    [-120, 55, -150], [10, 38, -110], [150, 28, -70], [255, 14, -10], [230, 22, 90],
    [120, 30, 140], [0, 60, 165], [-140, 42, 80], [-90, 18, 0], [-150, 34, -70],
  ].map((p) => new THREE.Vector3(...p)),
  true,
)

function Loop({ G, input, audioRef, hud }) {
  const { camera, scene, gl } = useThree()
  if (import.meta.env.DEV) {
    window.__neonScene = scene
    window.__neonGl = gl
  }
  const cam = useRef({ yaw: G.player.heading, dist: 8, mode: 0, lookYaw: 0, lookPitch: 0, idle: 0, zoom: 1, cine: 0 })
  const sun = useRef()
  const hudT = useRef(0)
  const fps = useRef({ t: 0, n: 0 })
  const wasPaused = useRef(null)
  const version = useRef(-1)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3() }), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const audio = audioRef.current
    const c = cam.current
    input.update(delta)

    if (version.current !== FX.version && audio && FX.settings) {
      version.current = FX.version
      audio.setVolumes(FX.settings)
    }
    G.weatherMode = FX.settings?.weather || 'dynamic'

    if (input.take('pause') && !G.ui.intro && !G.ui.loading) {
      if (G.ui.cinematic) G.ui.cinematic = false
      else if (G.ui.panel) G.ui.panel = null
      else G.ui.paused = !G.ui.paused
      if (G.ui.paused) input.releasePointer()
    }
    if (input.take('cinematic') && !G.ui.intro) {
      G.ui.cinematic = !G.ui.cinematic
      c.cine = 0
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
      input.clearPresses()
    }
    if (paused !== wasPaused.current) {
      wasPaused.current = paused
      if (paused) audio?.suspend()
      else audio?.resume()
    }

    // ---- free look (mouse / right stick / touch drag) ----
    const inCar = !!G.player.vehicle
    const P0 = G.player.vehicle || G.player
    const cinematic = !!G.ui.cinematic
    const sens = FX.settings?.sensitivity ?? 1
    const inv = FX.settings?.invertY ? -1 : 1
    if (!paused && !cinematic && (input.lookX || input.lookY)) {
      c.lookYaw = wrap(c.lookYaw - input.lookX * 0.0032 * sens)
      c.lookPitch = clamp(c.lookPitch + input.lookY * 0.0025 * sens * inv, -0.35, 0.95)
      c.idle = 0
    } else c.idle += dt
    if (input.zoom) c.zoom = clamp(c.zoom * (1 + input.zoom * 0.12), 0.6, 1.9)
    const aiming = !inCar && input.aim && G.deadT <= 0 && !paused && !cinematic
    if (!paused && !cinematic && G.deadT <= 0) {
      if (aiming) {
        // aim where the camera points
        G.player.heading = wrap(c.yaw + c.lookYaw)
        c.yaw = G.player.heading
        c.lookYaw = 0
      } else if (!inCar && input.walk > 0.1 && Math.abs(c.lookYaw) > 0.01) {
        // walking turns the character towards the camera direction
        const d = clamp(c.lookYaw, -6 * dt, 6 * dt)
        G.player.heading = wrap(G.player.heading + d)
        c.lookYaw -= d
      } else if (inCar && c.idle > 1.5 && Math.abs(P0.speed) > 4) {
        c.lookYaw *= Math.exp(-3 * dt)
        c.lookPitch *= Math.exp(-3 * dt)
      }
    }
    G.aiming = aiming

    step(G, dt, cinematic ? IDLE_INPUT : input)

    const P = G.player.vehicle || G.player
    for (const e of G.events) {
      if (e.type === 'horn' && !e.player && Math.hypot(e.x - P.x, e.z - P.z) > 45) continue
      if (e.type === 'enter' && audio && G.player.vehicle?.model !== 'boat') {
        G.ui.toast = audio.stationName
        G.ui.toastT = 2.5
      }
      if (e.type === 'save') G.dirty = true
      audio?.event(e, P)
    }
    G.events.length = 0
    if (audio && !paused) audio.update(G)

    // ---- camera ----
    const cfg = inCar ? CAM.car : CAM.foot
    const speed = inCar ? Math.abs(P.speed) : 0
    if (G.deadT > 0) c.yaw += dt * 0.35
    else if (!paused) c.yaw += wrap(P.heading - c.yaw) * Math.min(1, dt * (inCar ? 3.2 : 4))
    const yaw = c.yaw + c.lookYaw
    G.camYaw = yaw
    G.camPitch = c.lookPitch
    const want = aiming ? 2.8 : cfg.dist[c.mode] * c.zoom + speed * 0.07
    const fx = Math.sin(yaw), fz = Math.cos(yaw)
    const rx = -fz, rz = fx // camera right
    const side = aiming ? 0.65 : 0
    const tx = P.x + rx * side, ty = P.y + (inCar ? 1.4 : 1.6), tz = P.z + rz * side
    let free = 1
    for (let k = 1; k <= 14; k++) {
      const f = k / 14
      if (blocked(tx - fx * want * f, tz - fz * want * f)) { free = (k - 1) / 14; break }
    }
    const allowed = Math.max(1.5, want * free)
    c.dist = allowed < c.dist ? allowed : c.dist + (allowed - c.dist) * Math.min(1, dt * (aiming ? 8 : 2))
    const baseH = (aiming ? 0.35 : cfg.height[c.mode] * c.zoom) * (0.6 + 0.4 * (c.dist / want))
    const pitchH = Math.sin(c.lookPitch) * c.dist
    const back = Math.cos(c.lookPitch) * c.dist
    camera.position.set(tx - fx * back, Math.max(0.6, ty + baseH + pitchH), tz - fz * back)
    camera.lookAt(tx + fx * 3, ty + 0.4 - (aiming ? c.lookPitch * 2 : 0), tz + fz * 3)

    if (cinematic) {
      c.cine = (c.cine + dt / 110) % 1
      FLYOVER.getPointAt(c.cine, tmp.p)
      FLYOVER.getPointAt((c.cine + 0.02) % 1, tmp.q)
      tmp.q.y *= 0.35
      camera.position.copy(tmp.p)
      camera.lookAt(tmp.q)
    }
    if (import.meta.env.DEV && window.__neonCam) {
      // dev-only hook used by screenshot tests
      const o = window.__neonCam
      camera.position.set(...o.pos)
      camera.lookAt(...o.look)
    }
    const fov = cinematic ? 55 : aiming ? 50 : 62 + Math.min(speed, 45) * 0.28
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 4)
      camera.updateProjectionMatrix()
    }

    // keep the shadow camera centred on what the camera sees
    if (sun.current) {
      FX.sunLight = sun.current
      const sx = cinematic ? camera.position.x : P.x
      const sz = cinematic ? camera.position.z : P.z
      const d = G.env?.lightDir || [0.6, 0.8, 0.25]
      sun.current.position.set(sx + d[0] * 100, d[1] * 100, sz + d[2] * 100)
      sun.current.target.position.set(sx, 0, sz)
      sun.current.target.updateMatrixWorld()
    }

    const f = fps.current
    f.t += delta
    f.n++
    if (f.t > 0.5) {
      G.fps = Math.round(f.n / f.t)
      f.t = 0
      f.n = 0
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
      shadow-camera-far={260}
      shadow-bias={-0.0004}
    />
  )
}

// Compiles every shader up front (behind the loading screen) so the first seconds don't stutter.
function Warmup({ onDone }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let cancelled = false
    const id = requestAnimationFrame(() => {
      const done = () => !cancelled && onDone()
      if (gl.compileAsync) gl.compileAsync(scene, camera).then(done, done)
      else {
        gl.compile(scene, camera)
        done()
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [gl, scene, camera, onDone])
  return null
}

export default function Scene({ G, input, audioRef, hud, onReady }) {
  return (
    <>
      <Atmosphere G={G} />
      <Effects G={G} />
      <Loop G={G} input={input} audioRef={audioRef} hud={hud} />
      <City G={G} />
      <Entities G={G} />
      <Warmup onDone={onReady} />
    </>
  )
}
