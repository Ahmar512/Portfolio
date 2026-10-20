import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MODELS } from '../sim'
import { MISSIONS } from '../world'
import { iconTexture, signTexture } from '../textures'
import { glow } from '../fx'
import { carParts } from './carModels'
import { createHuman, poseHuman } from './humanModel'

const DRAW_DIST = 190

let shared = null
// Created lazily so they pick up the quality settings chosen when the game starts.
function mats() {
  if (shared) return shared
  const plateCanvas = document.createElement('canvas')
  plateCanvas.width = 256
  plateCanvas.height = 64
  const g = plateCanvas.getContext('2d')
  g.fillStyle = '#f4f4f0'
  g.fillRect(0, 0, 256, 64)
  g.fillStyle = '#1f4fbf'
  g.fillRect(0, 0, 26, 64)
  g.strokeStyle = '#111'
  g.lineWidth = 4
  g.strokeRect(2, 2, 252, 60)
  g.fillStyle = '#111'
  g.font = '900 40px Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('NB 1986', 140, 34)
  const plateTex = new THREE.CanvasTexture(plateCanvas)
  plateTex.colorSpace = THREE.SRGBColorSpace

  const blob = document.createElement('canvas')
  blob.width = blob.height = 64
  const b = blob.getContext('2d')
  const grad = b.createRadialGradient(32, 32, 4, 32, 32, 32)
  grad.addColorStop(0, 'rgba(0,0,0,0.75)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  b.fillStyle = grad
  b.fillRect(0, 0, 64, 64)
  const blobTex = new THREE.CanvasTexture(blob)

  shared = {
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1422', metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.88, envMapIntensity: 1.6, clearcoat: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.5, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e6e8ec', roughness: 0.12, metalness: 1 }),
    head: new THREE.MeshBasicMaterial({ vertexColors: true, color: glow('#ffffff', 0.9), toneMapped: false }),
    plate: new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }),
    wheel: [
      new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.22, metalness: 1 }),
      new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: 0.6, metalness: 0.6 }),
    ],
    blob: new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }),
    fire: new THREE.MeshBasicMaterial({ color: glow('#ff7a1a', 1.2), transparent: true, opacity: 0.85, toneMapped: false }),
    police: signTexture('POLICE', '#ffffff', { width: 512, height: 128, bg: null }),
  }
  return shared
}

const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const tmpV = new THREE.Vector3()
const wreckColor = new THREE.Color('#1d1a1c')

function Car({ v }) {
  const root = useRef()
  const body = useRef()
  const steer = useRef([])
  const spin = useRef([])
  const red = useRef()
  const blue = useRef()
  const fire = useRef()
  const smoke = useRef([])
  const P = carParts(v.model)
  const M = mats()
  const m = MODELS[v.model]
  const paint = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: v.color, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 }),
    [v],
  )
  const tailMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, color: glow('#ffffff', 0.5), toneMapped: false }), [])
  const brakeOn = useMemo(() => glow('#ffffff', 1.4), [])
  const brakeOff = useMemo(() => glow('#ffffff', 0.5), [])
  const lastColor = useRef(v.color)
  const taxiTex = useMemo(() => (v.model === 'taxi' ? signTexture('TAXI', '#ffe14d', { width: 256, height: 96 }) : null), [v.model])
  const { W, L } = P.spec

  useFrame(({ clock, camera }) => {
    const g = root.current
    g.visible = v.ai !== 'inactive' && tmpV.set(v.x, 0, v.z).distanceTo(camera.position) < DRAW_DIST
    if (!g.visible) return
    g.position.set(v.x, v.y, v.z)
    g.rotation.y = v.heading
    const lean = THREE.MathUtils.clamp(v.steer * v.speed * 0.005, -0.06, 0.06)
    body.current.rotation.z += (lean - body.current.rotation.z) * 0.15
    const pitch = THREE.MathUtils.clamp(-v.throttle * Math.sign(v.speed || 1) * 0.015, -0.025, 0.025)
    body.current.rotation.x += (pitch - body.current.rotation.x) * 0.08
    for (let k = 0; k < 4; k++) {
      if (spin.current[k]) spin.current[k].rotation.x = v.wheel
      if (steer.current[k] && k < 2) steer.current[k].rotation.y = -v.steer * 0.5
    }
    if (v.wreck) paint.color.copy(wreckColor)
    else if (lastColor.current !== v.color || paint.color.equals(wreckColor)) {
      paint.color.set(v.color)
      lastColor.current = v.color
    }
    const braking = !v.wreck && ((v.throttle < -0.1 && v.speed > 0.5) || (v.ai === 'traffic' && v.blockT > 0))
    tailMat.color.copy(braking ? brakeOn : brakeOff)
    if (red.current) {
      const live = v.ai === 'police'
      const ph = Math.floor(clock.elapsedTime * 7) % 4
      red.current.material.color.copy(live && ph < 2 ? glow('#ff1e3c', 1.5) : new THREE.Color('#3a0c14'))
      blue.current.material.color.copy(live && ph >= 2 ? glow('#2f6bff', 1.8) : new THREE.Color('#0c1a3a'))
    }
    const burning = v.fire > 0 && !v.wreck
    fire.current.visible = burning
    if (burning) fire.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 25) * 0.2 + v.fire * 0.15)
    const smoking = v.wreck || v.health < m.health * 0.35
    smoke.current.forEach((p, k) => {
      if (!p) return
      p.visible = smoking
      if (!smoking) return
      const t = (clock.elapsedTime * 0.8 + k / 4) % 1
      p.position.set(Math.sin(k * 2.1) * 0.3, 1.1 + t * 3.5, L * 0.32)
      p.scale.setScalar(0.4 + t * 1.6)
      p.material.opacity = 0.5 * (1 - t)
    })
  })

  return (
    <group ref={root}>
      <mesh geometry={blobGeo} material={M.blob} position={[0, 0.02, 0]} scale={[W * 1.3, 1, L * 1.1]} />
      <group ref={body}>
        <mesh geometry={P.paint} material={paint} castShadow />
        <mesh geometry={P.glass} material={M.glass} />
        <mesh geometry={P.trim} material={M.trim} />
        <mesh geometry={P.chrome} material={M.chrome} />
        <mesh geometry={P.head} material={M.head} />
        <mesh geometry={P.tail} material={tailMat} />
        <mesh geometry={P.plates} material={M.plate} />
        {v.model === 'police' && (
          <>
            <mesh position={[0, P.roofY + 0.05, P.roofZ]}>
              <boxGeometry args={[1.2, 0.08, 0.3]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh ref={red} position={[-0.3, P.roofY + 0.14, P.roofZ]}>
              <boxGeometry args={[0.55, 0.1, 0.26]} />
              <meshBasicMaterial color="#3a0c14" toneMapped={false} />
            </mesh>
            <mesh ref={blue} position={[0.3, P.roofY + 0.14, P.roofZ]}>
              <boxGeometry args={[0.55, 0.1, 0.26]} />
              <meshBasicMaterial color="#0c1a3a" toneMapped={false} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * (W / 2 + 0.03), 0.72, -0.1]} rotation-y={s * Math.PI / 2}>
                  <planeGeometry args={[1.5, 0.38]} />
                  <meshBasicMaterial map={M.police} transparent depthWrite={false} />
                </mesh>
                <mesh position={[s * (W / 2 + 0.025), 0.52, 0]} rotation-y={s * Math.PI / 2}>
                  <planeGeometry args={[3.4, 0.06]} />
                  <meshBasicMaterial color="#4da3ff" />
                </mesh>
              </group>
            ))}
          </>
        )}
        {taxiTex && (
          <mesh position={[0, P.roofY + 0.16, P.roofZ]}>
            <boxGeometry args={[0.85, 0.26, 0.3]} />
            <meshBasicMaterial map={taxiTex} toneMapped={false} />
          </mesh>
        )}
      </group>
      {P.wheels.map(([x, y, z], k) => (
        <group key={k} position={[x, y, z]} ref={(el) => (steer.current[k] = el)}>
          <group ref={(el) => (spin.current[k] = el)}>
            <mesh geometry={P.wheel} material={M.wheel} rotation-y={x < 0 ? Math.PI : 0} castShadow />
          </group>
          <mesh position={[x < 0 ? 0.04 : -0.04, 0.12, -0.12]}>
            <boxGeometry args={[0.06, 0.12, 0.16]} />
            <meshStandardMaterial color={v.model === 'sport' ? '#d01f2f' : '#3a3a40'} />
          </mesh>
        </group>
      ))}
      <mesh ref={fire} material={M.fire} position={[0, 1.2, L * 0.3]} visible={false}>
        <sphereGeometry args={[0.7, 8, 6]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} ref={(el) => (smoke.current[k] = el)} visible={false}>
          <sphereGeometry args={[0.5, 7, 5]} />
          <meshStandardMaterial color="#38343c" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// Mirrors a sim object (player or pedestrian) onto a skinned human.
function Human({ look, read }) {
  const g = useRef()
  const { mesh, rig } = useMemo(() => createHuman(look), [look])
  const st = useMemo(() => ({}), [])
  useFrame(({ clock, camera }) => {
    const o = read(st)
    const grp = g.current
    grp.visible = !o.hidden && tmpV.set(o.x, o.y, o.z).distanceTo(camera.position) < 130
    if (!grp.visible) return
    grp.position.set(o.x, o.y, o.z)
    grp.rotation.y = o.heading
    if (o.mode === 'down') {
      if (o.flying) {
        grp.rotation.x += (o.spin || 0) * 0.016
        grp.position.y += 0.9
      } else {
        grp.rotation.x = -Math.PI / 2
        grp.position.y += 0.14
      }
    } else grp.rotation.x = 0
    poseHuman(rig, o.phase, o.gait, o.mode, clock.elapsedTime + o.x)
  })
  return (
    <group ref={g}>
      <primitive object={mesh} />
    </group>
  )
}

const PLAYER_LOOK = { skin: '#c99272', shirt: '#ff5fa2', pants: '#ece6da', hair: '#1c120c', shoes: '#f2f2f2', glasses: true, hairStyle: 'short' }

function Player({ G }) {
  const read = (st) => {
    const p = G.player
    st.x = p.x
    st.y = p.y
    st.z = p.z
    st.heading = p.heading
    st.phase = p.walk
    st.hidden = !!p.vehicle
    const spd = Math.abs(p.speed)
    st.gait = spd > 0.3 ? Math.min(2, spd / 4.6 + (spd > 6 ? 0.3 : 0)) : p.moving ? 0.6 : 0
    st.mode = G.deadT > 0 && G.deadKind === 'wasted' ? 'down' : p.vy !== 0 && p.y > 0.2 ? 'air' : 'move'
    st.flying = false
    return st
  }
  return <Human look={PLAYER_LOOK} read={read} />
}

function Peds({ G }) {
  return G.peds.map((ped) => (
    <Human
      key={ped.id}
      look={ped.look}
      read={(st) => {
        st.x = ped.x
        st.y = ped.y
        st.z = ped.z
        st.heading = ped.heading
        st.phase = ped.walk
        st.gait = ped.state === 'walk' ? ped.gait || 1 : 0
        st.mode = ped.state === 'down' ? 'down' : 'move'
        st.flying = ped.state === 'down' && (ped.y > 0.05 || ped.vy > 0)
        st.spin = ped.spin
        return st
      }}
    />
  ))
}

function Beam({ x, z, color, radius = 2.2, height = 14, visible = () => true, icon }) {
  const g = useRef()
  const ring = useRef()
  const sprite = useRef()
  const tex = useMemo(() => (icon ? iconTexture(icon, color) : null), [icon, color])
  const ringColor = useMemo(() => glow(color, 0.7), [color])
  useFrame(({ clock }) => {
    const v = visible()
    g.current.visible = v
    if (!v) return
    const t = clock.elapsedTime
    ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08)
    if (sprite.current) sprite.current.position.y = 4.2 + Math.sin(t * 2) * 0.3
  })
  return (
    <group ref={g} position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]}>
        <ringGeometry args={[radius - 0.3, radius, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {tex && (
        <sprite ref={sprite} scale={[1.6, 1.6, 1.6]} position={[0, 4.2, 0]}>
          <spriteMaterial map={tex} toneMapped={false} depthWrite={false} />
        </sprite>
      )}
    </group>
  )
}

function Markers({ G }) {
  const W = G.world
  return (
    <group>
      {W.landmarks.filter((l) => l.title).map((l) => (
        <Beam key={l.id} x={l.zone.x} z={l.zone.z} color={l.neon} radius={l.zone.r} height={10} icon={l.letter} />
      ))}
      <Beam x={W.lm.spray.zone.x} z={W.lm.spray.zone.z} color="#39ff88" radius={W.lm.spray.zone.r} height={6} icon="$" />
      {MISSIONS.map((d) => (
        <Beam key={d.id} x={d.giver.x} z={d.giver.z} color="#ffd21f" radius={1.6} height={12} icon="!" visible={() => !G.mission} />
      ))}
      <Objective G={G} />
    </group>
  )
}

function Objective({ G }) {
  const g = useRef()
  const mat = useRef()
  const yellow = useMemo(() => glow('#ffd21f', 0.5), [])
  const red = useMemo(() => glow('#ff3b6b', 0.5), [])
  useFrame(({ clock }) => {
    const o = G.objective
    g.current.visible = !!o
    if (!o) return
    g.current.position.set(o.x, 0, o.z)
    mat.current.color.copy(o.kind === 'race' ? red : yellow)
    mat.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 5) * 0.08
  })
  return (
    <group ref={g} visible={false}>
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[4, 4, 30, 32, 1, true]} />
        <meshBasicMaterial ref={mat} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Pickups({ G }) {
  const refs = useRef([])
  const tex = useMemo(() => iconTexture('$', '#1fbf4a'), [])
  const color = useMemo(() => glow('#3bff7a', 0.8), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    G.pickups.forEach((p, k) => {
      const m = refs.current[k]
      if (!m) return
      m.visible = p.active
      m.position.y = 1.2 + Math.sin(t * 2 + k) * 0.25
      m.rotation.y = t * 2
    })
  })
  return G.pickups.map((p, k) => (
    <group key={k} position={[p.x, 1.2, p.z]} ref={(el) => (refs.current[k] = el)}>
      <mesh>
        <boxGeometry args={[0.8, 0.4, 0.45]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <sprite position={[0, 1, 0]} scale={[0.9, 0.9, 0.9]}>
        <spriteMaterial map={tex} depthWrite={false} />
      </sprite>
    </group>
  ))
}

function Explosions({ G }) {
  const refs = useRef([])
  useFrame(() => {
    G.explosions.forEach((e, k) => {
      const m = refs.current[k]
      if (!m) return
      m.visible = e.active
      if (!e.active) return
      const p = e.t / 1.6
      m.position.set(e.x, 1 + p * 2, e.z)
      m.scale.setScalar(1 + p * 7)
      m.material.opacity = 1 - p
      m.material.color.setHSL(0.08 - p * 0.08, 1, 0.6 - p * 0.4).multiplyScalar(3 * (1 - p) + 0.5)
    })
  })
  return G.explosions.map((e, k) => (
    <mesh key={k} ref={(el) => (refs.current[k] = el)} visible={false}>
      <sphereGeometry args={[1, 16, 10]} />
      <meshBasicMaterial color="#ffa040" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  ))
}

export default function Entities({ G }) {
  return (
    <group>
      {G.vehicles.map((v) => (
        <Car key={v.id} v={v} />
      ))}
      <Player G={G} />
      <Peds G={G} />
      <Markers G={G} />
      <Pickups G={G} />
      <Explosions G={G} />
    </group>
  )
}
