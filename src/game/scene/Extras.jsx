// Motorbikes, boats, the police helicopter, gunfire, stunt ramps, hidden tapes and typed pickups.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { glow } from '../fx'
import { WORLD } from '../world'
import { wheelGeometry } from './carModels'
import { createHuman, poseHuman, PLAYER_LOOK, RIDER_LOOK } from './humanModel'

const tmpV = new THREE.Vector3()
const DOWN = new THREE.Vector3(0, -1, 0)
const DRAW_DIST = 190

let M = null
function mats() {
  if (M) return M
  M = {
    dark: new THREE.MeshStandardMaterial({ color: '#17171c', roughness: 0.5, metalness: 0.4 }),
    metal: new THREE.MeshStandardMaterial({ color: '#8a8d96', roughness: 0.3, metalness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e6e8ec', roughness: 0.12, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1422', roughness: 0.05, transparent: true, opacity: 0.7, clearcoat: 1 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#f4f4f2', roughness: 0.25, clearcoat: 1 }),
    teak: new THREE.MeshStandardMaterial({ color: '#9b6a42', roughness: 0.7 }),
    seat: new THREE.MeshStandardMaterial({ color: '#e9e2d4', roughness: 0.8 }),
    head: new THREE.MeshBasicMaterial({ color: glow('#fff4e0', 1), toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: glow('#ff1a2a', 0.8), toneMapped: false }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.55 }),
    wake: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }),
    navy: new THREE.MeshPhysicalMaterial({ color: '#14213d', roughness: 0.35, metalness: 0.4, clearcoat: 1 }),
    smoke: new THREE.MeshStandardMaterial({ color: '#38343c', transparent: true, opacity: 0.5, depthWrite: false }),
  }
  return M
}

const box = (w, h, d, x, y, z, rx = 0) => {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rx) g.rotateX(rx)
  return g.translate(x, y, z)
}

// A seated rider that follows the vehicle it is parented to
function Rider({ look, mode, position }) {
  const { mesh, rig } = useMemo(() => createHuman(look), [look])
  useFrame(({ clock }) => poseHuman(rig, 0, 0, mode, clock.elapsedTime))
  return (
    <group position={position}>
      <primitive object={mesh} />
    </group>
  )
}

// ---------------------------------------------------------------- motorbike
const bikeGeo = (() => {
  const body = mergeGeometries([
    box(0.34, 0.24, 0.55, 0, 0.84, 0.12),
    box(0.36, 0.32, 0.3, 0, 0.86, 0.55, -0.35),
    box(0.22, 0.12, 0.4, 0, 0.92, -0.62, 0.15),
  ])
  const frame = mergeGeometries([
    box(0.1, 0.08, 1.25, 0, 0.56, 0, 0.18),
    box(0.3, 0.32, 0.42, 0, 0.5, -0.05),
    box(0.28, 0.09, 0.55, 0, 0.9, -0.3),
  ])
  const chrome = mergeGeometries([
    new THREE.CylinderGeometry(0.05, 0.06, 0.6, 10).rotateX(Math.PI / 2).translate(0.17, 0.42, -0.55),
  ])
  const fork = mergeGeometries([
    new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8).rotateX(-0.35).translate(0.09, 0.62, 0.05),
    new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8).rotateX(-0.35).translate(-0.09, 0.62, 0.05),
    new THREE.CylinderGeometry(0.02, 0.02, 0.66, 8).rotateZ(Math.PI / 2).translate(0, 1.0, -0.1),
  ])
  return { body, frame, chrome, fork, wheel: wheelGeometry(0.33) }
})()

export function Bike({ v, G }) {
  const root = useRef()
  const lean = useRef()
  const steer = useRef()
  const spinF = useRef()
  const spinR = useRef()
  const m = mats()
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: v.color, metalness: 0.5, roughness: 0.3, clearcoat: 1 }), [v])
  const playerRider = useRef()
  const aiRider = useRef()
  useFrame(({ camera }) => {
    const g = root.current
    g.visible = v.ai !== 'inactive' && tmpV.set(v.x, 0, v.z).distanceTo(camera.position) < DRAW_DIST
    if (!g.visible) return
    g.position.set(v.x, v.y, v.z)
    g.rotation.y = v.heading
    const roll = THREE.MathUtils.clamp(v.steer * Math.abs(v.speed) * 0.025, -0.6, 0.6)
    lean.current.rotation.z += (roll - lean.current.rotation.z) * 0.15
    lean.current.rotation.x = v.pitch || 0
    steer.current.rotation.y = -v.steer * 0.4
    spinF.current.rotation.x = v.wheel * 1.15
    spinR.current.rotation.x = v.wheel * 1.15
    paint.color.set(v.wreck ? '#1d1a1c' : v.color)
    const ridden = G.player.vehicle === v
    playerRider.current.visible = ridden
    aiRider.current.visible = !ridden && v.ai === 'traffic'
  })
  return (
    <group ref={root}>
      <group ref={lean}>
        <mesh geometry={bikeGeo.body} material={paint} castShadow />
        <mesh geometry={bikeGeo.frame} material={m.dark} castShadow />
        <mesh geometry={bikeGeo.chrome} material={m.chrome} />
        <mesh position={[0, 0.92, 0.72]} material={m.head}>
          <boxGeometry args={[0.16, 0.1, 0.05]} />
        </mesh>
        <mesh position={[0, 0.94, -0.83]} material={m.tail}>
          <boxGeometry args={[0.14, 0.05, 0.03]} />
        </mesh>
        <group ref={steer} position={[0, 0, 0.68]}>
          <mesh geometry={bikeGeo.fork} material={m.chrome} />
          <group ref={spinF} position={[0, 0.33, 0.06]}>
            <mesh geometry={bikeGeo.wheel} material={m.wheel} scale={[0.75, 1, 1]} castShadow />
          </group>
        </group>
        <group ref={spinR} position={[0, 0.33, -0.7]}>
          <mesh geometry={bikeGeo.wheel} material={m.wheel} scale={[0.85, 1, 1]} castShadow />
        </group>
        <group ref={playerRider}>
          <Rider look={PLAYER_LOOK} mode="ride" position={[0, 0.02, -0.28]} />
        </group>
        <group ref={aiRider}>
          <Rider look={RIDER_LOOK} mode="ride" position={[0, 0.02, -0.28]} />
        </group>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- speedboat
const boatGeo = (() => {
  const top = new THREE.Shape()
  top.moveTo(-1.1, -2.8)
  top.lineTo(1.1, -2.8)
  top.lineTo(1.15, 0.8)
  top.quadraticCurveTo(1.0, 2.2, 0, 3.0)
  top.quadraticCurveTo(-1.0, 2.2, -1.15, 0.8)
  top.closePath()
  const vertical = (shape, depth, bevel, y) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 })
    g.rotateX(Math.PI / 2)
    g.translate(0, y, 0)
    g.computeVertexNormals()
    return g
  }
  const hull = vertical(top, 0.85, 0.12, 0.5)
  const stripe = vertical(top, 0.12, 0.13, 0.26)
  const deck = vertical(top, 0.04, 0, 0.56).scale(0.88, 1, 0.9)
  const furniture = mergeGeometries([
    box(0.6, 0.45, 0.5, 0.4, 0.8, 0.2),
    box(1.6, 0.35, 0.5, 0, 0.75, -1.4),
    box(0.45, 0.35, 0.45, -0.4, 0.75, -0.25),
  ])
  const motor = mergeGeometries([box(0.4, 0.75, 0.45, 0, 0.55, -3.0), box(0.12, 0.6, 0.12, 0, 0.0, -3.05)])
  const shield = new THREE.PlaneGeometry(1.9, 0.45).rotateX(-0.6).translate(0, 0.98, 0.65)
  const wake = new THREE.PlaneGeometry(2.4, 9).rotateX(-Math.PI / 2).translate(0, 0.02, -7.5)
  return { hull, stripe, deck, furniture, motor, shield, wake }
})()

export function Boat({ v, G }) {
  const root = useRef()
  const rider = useRef()
  const m = mats()
  const stripeMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: v.color === '#f2f2f2' ? '#e0218a' : v.color, roughness: 0.3, clearcoat: 1 }), [v])
  const wakeMat = useMemo(() => m.wake.clone(), [m])
  useFrame(({ camera, clock }) => {
    const g = root.current
    g.visible = v.ai !== 'inactive' && tmpV.set(v.x, 0, v.z).distanceTo(camera.position) < 300
    if (!g.visible) return
    g.position.set(v.x, v.y, v.z)
    g.rotation.set(v.pitch || 0, v.heading, Math.sin(clock.elapsedTime * 1.3 + v.id) * 0.03 + v.steer * Math.abs(v.speed) * 0.006, 'YXZ')
    wakeMat.opacity = Math.min(0.55, Math.abs(v.speed) / 30)
    rider.current.visible = G.player.vehicle === v
  })
  return (
    <group ref={root}>
      <mesh geometry={boatGeo.hull} material={m.white} castShadow />
      <mesh geometry={boatGeo.stripe} material={stripeMat} />
      <mesh geometry={boatGeo.deck} material={m.teak} />
      <mesh geometry={boatGeo.furniture} material={m.seat} castShadow />
      <mesh geometry={boatGeo.motor} material={m.dark} />
      <mesh geometry={boatGeo.shield} material={m.glass} />
      <mesh geometry={boatGeo.wake} material={wakeMat} />
      <group ref={rider}>
        <Rider look={PLAYER_LOOK} mode="sit" position={[0.4, -0.15, -0.35]} />
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- police helicopter
const heliGeo = (() => {
  const body = mergeGeometries([
    new THREE.SphereGeometry(1, 20, 14).scale(1.25, 1.15, 2.1).translate(0, 0, 0.3),
    new THREE.CylinderGeometry(0.12, 0.28, 4.6, 10).rotateX(Math.PI / 2).translate(0, 0.25, -3.4),
    box(0.08, 1.1, 0.7, 0, 0.75, -5.5),
    box(1.6, 0.06, 0.4, 0, 0.35, -5.4),
  ].map((g) => g.toNonIndexed()))
  const skids = mergeGeometries([
    new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8).rotateX(Math.PI / 2).translate(0.9, -1.35, 0.2),
    new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8).rotateX(Math.PI / 2).translate(-0.9, -1.35, 0.2),
    box(0.06, 0.5, 0.06, 0.8, -1.1, 0.9), box(0.06, 0.5, 0.06, -0.8, -1.1, 0.9),
    box(0.06, 0.5, 0.06, 0.8, -1.1, -0.5), box(0.06, 0.5, 0.06, -0.8, -1.1, -0.5),
    new THREE.CylinderGeometry(0.15, 0.15, 0.5, 10).translate(0, 1.3, 0.3),
  ].map((g) => g.toNonIndexed()))
  const glass = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1.0, 0.9, 1.3).rotateX(Math.PI / 2.4).translate(0, 0.2, 1.3)
  const rotor = mergeGeometries([box(9.5, 0.05, 0.32, 0, 0, 0), box(0.32, 0.05, 9.5, 0, 0, 0)])
  const tailRotor = mergeGeometries([box(0.05, 1.6, 0.18, 0, 0, 0)])
  const beam = new THREE.CylinderGeometry(0.4, 7, 1, 20, 1, true).translate(0, -0.5, 0)
  return { body, skids, glass, rotor, tailRotor, beam }
})()

export function Heli({ G }) {
  const root = useRef()
  const rotor = useRef()
  const tail = useRef()
  const red = useRef()
  const blue = useRef()
  const beam = useRef()
  const smoke = useRef([])
  const m = mats()
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff6dd', transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), [])
  const redOn = useMemo(() => glow('#ff1e3c', 1.5), [])
  const blueOn = useMemo(() => glow('#2f6bff', 1.8), [])
  const off = useMemo(() => new THREE.Color('#222'), [])
  useFrame(({ clock }) => {
    const h = G.heli
    const g = root.current
    g.visible = h.active || h.falling
    if (!g.visible) return
    g.position.set(h.x, h.y, h.z)
    g.rotation.set(h.tilt, h.heading, 0, 'YXZ')
    rotor.current.rotation.y = h.rotor
    tail.current.rotation.x = h.rotor * 1.7
    const ph = Math.floor(clock.elapsedTime * 6) % 2
    red.current.material.color.copy(ph ? redOn : off)
    blue.current.material.color.copy(ph ? off : blueOn)
    // searchlight onto the player at night
    const P = G.player.vehicle || G.player
    const night = G.env.lightsOn && !h.falling
    beam.current.visible = night
    if (night) {
      const dx = P.x - h.x, dy = P.y - h.y, dz = P.z - h.z
      const len = Math.hypot(dx, dy, dz)
      beam.current.position.set(h.x, h.y - 1.2, h.z)
      beam.current.scale.set(1, len, 1)
      beam.current.quaternion.setFromUnitVectors(DOWN, tmpV.set(dx / len, dy / len, dz / len))
    }
    smoke.current.forEach((s, k) => {
      if (!s) return
      s.visible = h.falling
      if (!h.falling) return
      const t = (clock.elapsedTime * 1.5 + k / 4) % 1
      s.position.set(Math.sin(k) * 0.4, 0.8 + t * 3, -1 - t * 2)
      s.scale.setScalar(0.6 + t * 2)
      s.material.opacity = 0.6 * (1 - t)
    })
  })
  return (
    <>
      <group ref={root} visible={false}>
        <mesh geometry={heliGeo.body} material={m.navy} castShadow />
        <mesh geometry={heliGeo.skids} material={m.dark} />
        <mesh geometry={heliGeo.glass} material={m.glass} />
        <group ref={rotor} position={[0, 1.6, 0.3]}>
          <mesh geometry={heliGeo.rotor} material={m.dark} />
        </group>
        <group ref={tail} position={[0.15, 0.7, -5.5]}>
          <mesh geometry={heliGeo.tailRotor} material={m.dark} />
        </group>
        <mesh ref={red} position={[0.5, -0.9, 0.8]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        <mesh ref={blue} position={[-0.5, -0.9, 0.8]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} ref={(el) => (smoke.current[k] = el)} material={m.smoke.clone()} visible={false}>
            <sphereGeometry args={[0.6, 7, 5]} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} geometry={heliGeo.beam} material={beamMat} visible={false} />
    </>
  )
}

// ---------------------------------------------------------------- gunfire
export function Tracers({ G }) {
  const { geometry, material } = useMemo(() => {
    const n = G.tracers.length
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3))
    const col = new Float32Array(n * 6)
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false })
    return { geometry, material }
  }, [G])
  const player = useMemo(() => glow('#ffe39a', 1.2), [])
  const cop = useMemo(() => glow('#ff8a5a', 1.2), [])
  const flash = useRef()
  useFrame(() => {
    const pos = geometry.attributes.position.array
    const col = geometry.attributes.color.array
    G.tracers.forEach((t, i) => {
      if (!t.active) {
        pos.fill(0, i * 6, i * 6 + 6)
        return
      }
      // a short streak that travels from muzzle to target
      const f = Math.min(1, t.t / 0.06)
      const k0 = Math.max(0, f - 0.5), k1 = f
      for (let a = 0; a < 3; a++) {
        pos[i * 6 + a] = t.a[a] + (t.b[a] - t.a[a]) * k0
        pos[i * 6 + 3 + a] = t.a[a] + (t.b[a] - t.a[a]) * k1
      }
      const c = t.cop ? cop : player
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6)
    })
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    const p = G.player
    const f = flash.current
    f.visible = (p.shootT || 0) > 0.08 && !p.vehicle && p.weapon !== 'fists'
    if (f.visible) {
      const yaw = G.aiming ? G.camYaw : p.heading
      f.position.set(p.x + Math.sin(yaw) * 0.85 - Math.cos(yaw) * 0.15, p.y + 1.38, p.z + Math.cos(yaw) * 0.85 + Math.sin(yaw) * 0.15)
      f.rotation.z = Math.random() * Math.PI
    }
  })
  return (
    <>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} />
      <sprite ref={flash} scale={[0.5, 0.5, 0.5]} visible={false}>
        <spriteMaterial color={glow('#ffd27a', 2)} toneMapped={false} depthWrite={false} />
      </sprite>
    </>
  )
}

export function LockMarker({ G }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = G.lock
    ref.current.visible = !!t && !G.player.vehicle
    if (!t) return
    ref.current.position.set(t.x, t.y + (t.kind === 'heli' ? 2.5 : 1.3) + Math.sin(clock.elapsedTime * 6) * 0.08, t.z)
  })
  return (
    <mesh ref={ref} rotation-x={Math.PI} visible={false}>
      <coneGeometry args={[0.22, 0.45, 4]} />
      <meshBasicMaterial color={glow('#ff3b3b', 1.2)} toneMapped={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------- stunt ramps
function stripeTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#ffcc00'
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#151515'
  for (let k = -64; k < 128; k += 32) {
    g.beginPath()
    g.moveTo(k, 0)
    g.lineTo(k + 16, 0)
    g.lineTo(k + 80, 64)
    g.lineTo(k + 64, 64)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  return t
}

export function Ramps() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.6 }), [])
  return WORLD.ramps.map((r) => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(r.len, r.h)
    s.lineTo(r.len, 0)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: r.w, bevelEnabled: false })
    g.rotateY(-Math.PI / 2)
    g.translate(r.w / 2, 0, 0)
    return (
      <mesh key={r.id} geometry={g} material={mat} position={[r.x, 0, r.z]} rotation-y={r.heading} castShadow receiveShadow />
    )
  })
}

// ---------------------------------------------------------------- hidden neon tapes
export function Tapes({ G }) {
  const refs = useRef([])
  const neon = useMemo(() => glow('#ff2fd0', 1.3), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    WORLD.packages.forEach((p, k) => {
      const m = refs.current[k]
      if (!m) return
      m.visible = !G.progress.packages.has(p.id)
      m.rotation.y = t * 1.6 + k
      m.position.y = 0.9 + Math.sin(t * 2 + k) * 0.15
    })
  })
  return WORLD.packages.map((p, k) => (
    <group key={p.id} position={[p.x, 0.9, p.z]} ref={(el) => (refs.current[k] = el)}>
      <mesh>
        <boxGeometry args={[0.62, 0.4, 0.1]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[0.5, 0.16]} />
        <meshBasicMaterial color={neon} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.055]} rotation-y={Math.PI}>
        <planeGeometry args={[0.5, 0.16]} />
        <meshBasicMaterial color={neon} toneMapped={false} />
      </mesh>
    </group>
  ))
}

// ---------------------------------------------------------------- weapon & health pickups
export function SpecialPickups({ G }) {
  const refs = useRef([])
  const list = useMemo(() => G.pickups.map((p, i) => ({ p, i })).filter(({ p }) => p.type !== 'cash'), [G])
  const green = useMemo(() => glow('#39ff88', 1), [])
  const red = useMemo(() => glow('#ff2a3d', 1), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    list.forEach(({ p }, k) => {
      const m = refs.current[k]
      if (!m) return
      m.visible = p.active
      m.rotation.y = t * 1.8
      m.position.y = 1.1 + Math.sin(t * 2 + k) * 0.2
    })
  })
  return list.map(({ p }, k) => (
    <group key={k} position={[p.x, 1.1, p.z]} ref={(el) => (refs.current[k] = el)}>
      {p.type === 'smg' ? (
        <>
          <mesh>
            <boxGeometry args={[0.12, 0.22, 0.7]} />
            <meshStandardMaterial color="#222228" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.22, 0.05]}>
            <boxGeometry args={[0.08, 0.32, 0.1]} />
            <meshStandardMaterial color="#222228" />
          </mesh>
          <mesh>
            <torusGeometry args={[0.55, 0.03, 6, 32]} />
            <meshBasicMaterial color={green} toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          <mesh>
            <boxGeometry args={[0.6, 0.18, 0.18]} />
            <meshBasicMaterial color={red} toneMapped={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.18, 0.6, 0.18]} />
            <meshBasicMaterial color={red} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  ))
}

// ---------------------------------------------------------------- drift smoke & skid marks
const SKIDS = 600
const PUFFS = 36
function softDot() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,0.9)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export function DriftFX({ G }) {
  const skids = useRef()
  const puffs = useRef([])
  const st = useMemo(() => ({ next: 0, emitT: 0, puffT: 0, puffIdx: 0, life: Array.from({ length: PUFFS }, () => ({ t: 9, x: 0, y: 0, z: 0 })) }), [])
  const { skidGeo, skidMat, puffMat } = useMemo(() => {
    const skidGeo = new THREE.PlaneGeometry(0.3, 0.7).rotateX(-Math.PI / 2)
    const skidMat = new THREE.MeshBasicMaterial({ color: '#0b0b0e', transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    const puffMat = new THREE.SpriteMaterial({ map: softDot(), color: '#d8d8dc', transparent: true, depthWrite: false })
    return { skidGeo, skidMat, puffMat }
  }, [])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, dt) => {
    const v = G.player.vehicle
    const mesh = skids.current
    if (mesh.count === 0) {
      // park every mark far below the world until it's used
      o.position.set(0, -999, 0)
      o.updateMatrix()
      for (let i = 0; i < SKIDS; i++) mesh.setMatrixAt(i, o.matrix)
      mesh.count = SKIDS
      mesh.instanceMatrix.needsUpdate = true
    }
    const sliding = v && v.model !== 'boat' && !v.air && Math.abs(v.speed) > 8 && ((v.slip || 0) > 0.22 || (v.throttle < -0.5 && v.speed > 14))
    if (sliding) {
      const wheels = v.model === 'bike' ? [[0, -0.7]] : [[0.8, -1.35], [-0.8, -1.35]]
      const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
      st.emitT -= dt
      if (st.emitT <= 0) {
        st.emitT = 0.03
        for (const [lx, lz] of wheels) {
          o.position.set(v.x + fx * lz - fz * lx * -1, v.y + 0.02, v.z + fz * lz + fx * lx * -1)
          o.rotation.set(0, v.velAng ?? v.heading, 0)
          o.updateMatrix()
          mesh.setMatrixAt(st.next, o.matrix)
          st.next = (st.next + 1) % SKIDS
        }
        mesh.instanceMatrix.needsUpdate = true
      }
      st.puffT -= dt
      if (st.puffT <= 0 && (v.slip || 0) > 0.3) {
        st.puffT = 0.05
        const [lx, lz] = wheels[st.puffIdx % wheels.length]
        const p = st.life[st.puffIdx % PUFFS]
        p.t = 0
        p.x = v.x + fx * lz + fz * lx
        p.y = v.y + 0.3
        p.z = v.z + fz * lz - fx * lx
        st.puffIdx++
      }
    }
    st.life.forEach((p, i) => {
      const s = puffs.current[i]
      if (!s) return
      p.t += dt
      s.visible = p.t < 1.6
      if (!s.visible) return
      const k = p.t / 1.6
      s.position.set(p.x, p.y + k * 1.5, p.z)
      s.scale.setScalar(0.8 + k * 3)
      s.material.opacity = 0.45 * (1 - k)
    })
  })
  return (
    <>
      <instancedMesh ref={skids} args={[skidGeo, skidMat, SKIDS]} count={0} frustumCulled={false} />
      {Array.from({ length: PUFFS }, (_, i) => (
        <sprite key={i} ref={(el) => (puffs.current[i] = el)} material={puffMat.clone()} visible={false} />
      ))}
    </>
  )
}
