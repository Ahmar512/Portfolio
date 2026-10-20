import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  WORLD, BLOCKS, BLOCK, CITY_EDGE, BEACH_END, PIER, SIDEWALK_H, HIGHWAY, roadCoord, blockCenter,
} from '../world'
import { signTexture, grainTexture } from '../textures'
import { FX, glow } from '../fx'
import { projects, skills } from '../../Constant'
import { ahmar, SRMU } from '../../assets/images'


const tmp = new THREE.Object3D()
const tmpColor = new THREE.Color()

function useInstances(ref, items, apply) {
  useLayoutEffect(() => {
    const mesh = ref.current
    items.forEach((it, i) => {
      tmp.rotation.set(0, 0, 0)
      tmp.scale.set(1, 1, 1)
      apply(it, tmp, tmpColor)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
      mesh.setColorAt(i, tmpColor)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, items])
}

const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)

// Standard material + a world-space window grid: reflective glass, randomly lit rooms, shop fronts.
function buildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = { value: FX.glow }
    shader.uniforms.uNight = { value: 0 }
    mat.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNorm; flat varying float vTop; flat varying float vSeed;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        mat4 bInst = mat4(1.0);
        #ifdef USE_INSTANCING
          bInst = instanceMatrix;
        #endif
        vec4 wp4 = modelMatrix * bInst * vec4(transformed, 1.0);
        vWPos = wp4.xyz;
        vWNorm = normalize(mat3(modelMatrix) * mat3(bInst) * objectNormal);
        vTop = (modelMatrix * bInst * vec4(0.0, 1.0, 0.0, 1.0)).y;
        vec4 origin = modelMatrix * bInst * vec4(0.0, 0.0, 0.0, 1.0);
        vSeed = floor(origin.x * 3.0) + floor(origin.z * 3.0) * 7.0;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uGlow;
        uniform float uNight;
        varying vec3 vWPos; varying vec3 vWNorm; flat varying float vTop; flat varying float vSeed;
        float hash21(vec2 p) {
          p = fract(p * vec2(0.1031, 0.1030));
          p += dot(p, p.yx + 33.33);
          return fract((p.x + p.y) * p.x);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float winMask = 0.0;
        float winLit = 0.0;
        vec3 litCol = vec3(1.0, 0.78, 0.48);
        vec3 nrm = normalize(vWNorm);
        if (abs(nrm.y) < 0.5) {
          float u = abs(nrm.x) > 0.5 ? vWPos.z : vWPos.x;
          vec2 cell = vec2(u / 2.4, (vWPos.y - 0.6) / 3.4);
          vec2 f = fract(cell);
          vec2 id = floor(cell);
          // fade the grid out once a window is only a few pixels big, to avoid shimmering
          vec2 fw = fwidth(cell);
          float fade = 1.0 - smoothstep(0.12, 0.3, max(fw.x, fw.y));
          float inside = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.86);
          float floors = step(1.0, id.y) * step(vWPos.y, vTop - 1.1);
          winMask = mix(0.45, inside, fade) * floors;
          float h = hash21(id * vec2(1.0, 3.0) + vec2(mod(vSeed, 997.0), abs(nrm.x) > 0.5 ? 17.0 : 0.0));
          winLit = step(mix(0.8, 0.6, uNight), h) * inside * floors * fade;
          litCol = h > 0.93 ? vec3(0.55, 0.9, 1.0) : vec3(1.0, 0.78, 0.48);
          float shopU = fract(u / 5.0);
          float shop = (1.0 - step(1.0, id.y)) * step(0.12, shopU) * step(shopU, 0.88) * step(0.45, vWPos.y) * step(vWPos.y, 3.3);
          winMask = max(winMask, shop * fade);
          winLit = max(winLit, shop * mix(0.5, 1.0, uNight) * fade * step(0.45, hash21(vec2(floor(u / 5.0), mod(vSeed, 997.0)))));
          diffuseColor.rgb *= mix(1.0, 0.75, step(vWPos.y, 0.45));
        } else if (nrm.y > 0.5) {
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.19, 0.22), 0.85);
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.05, 0.09), winMask);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.05, winMask);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.9, winMask);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += litCol * winLit * uGlow * mix(0.45, 0.5, uNight);`)
  }
  return mat
}

function Buildings({ G }) {
  const bodies = useRef()
  const trims = useRef()
  const roofs = useRef()
  const mat = useMemo(buildingMaterial, [])
  useFrame(() => {
    const n = G.env.night
    if (mat.userData.shader) mat.userData.shader.uniforms.uNight.value = n
    if (trims.current) trims.current.material.color.setScalar(0.55 + 0.45 * n)
  })

  // rooftop clutter: AC units and water tanks
  const roofItems = useMemo(() => {
    let seed = 11
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const out = []
    for (const b of WORLD.buildings) {
      if (b.y > 0 || b.w < 9) continue
      const n = 1 + Math.floor(r() * 3)
      for (let k = 0; k < n; k++) {
        out.push({
          x: b.x + (r() - 0.5) * (b.w - 3), z: b.z + (r() - 0.5) * (b.d - 3), y: b.h,
          w: 1.2 + r() * 1.5, h: 0.8 + r() * 1.2, d: 1.2 + r() * 1.5, color: r() < 0.5 ? '#9a9aa2' : '#c9c4bd',
        })
      }
    }
    return out
  }, [])

  useInstances(bodies, WORLD.buildings, (b, o, c) => {
    o.position.set(b.x, b.y, b.z)
    o.scale.set(b.w, b.h, b.d)
    c.set(b.color)
  })
  useInstances(trims, WORLD.buildings, (b, o, c) => {
    o.position.set(b.x, b.y + b.h, b.z)
    o.scale.set(b.w + 0.3, 0.3, b.d + 0.3)
    c.set(b.neon).multiplyScalar(FX.glow * 0.7)
  })
  useInstances(roofs, roofItems, (b, o, c) => {
    o.position.set(b.x, b.y, b.z)
    o.scale.set(b.w, b.h, b.d)
    c.set(b.color)
  })

  return (
    <group>
      <instancedMesh ref={bodies} args={[unitBox, mat, WORLD.buildings.length]} castShadow receiveShadow />
      <instancedMesh ref={trims} args={[unitBox, null, WORLD.buildings.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[unitBox, null, roofItems.length]} castShadow>
        <meshStandardMaterial roughness={0.6} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}

function frondTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const g = c.getContext('2d')
  g.strokeStyle = '#3d6b2a'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(32, 0)
  g.lineTo(32, 256)
  g.stroke()
  for (let y = 6; y < 250; y += 7) {
    const len = 30 * Math.sin((y / 256) * Math.PI) + 4
    for (const s of [-1, 1]) {
      const grad = g.createLinearGradient(32, y, 32 + s * len, y + 14)
      grad.addColorStop(0, '#2f7f36')
      grad.addColorStop(1, '#5cb84a')
      g.strokeStyle = grad
      g.lineWidth = 3.2
      g.beginPath()
      g.moveTo(32, y)
      g.quadraticCurveTo(32 + s * len * 0.6, y + 3, 32 + s * len, y + 14)
      g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Palms() {
  const trunks = useRef()
  const crowns = useRef()
  const nuts = useRef()
  const { trunkGeo, crownGeo, nutGeo, trunkM, crownM, leafMat, leafDepth } = useMemo(() => {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.28, 1, 10, 24).translate(0, 0.5, 0)
    const pos = trunkGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const k = 1 + 0.07 * Math.max(0, Math.sin(y * Math.PI * 24))
      pos.setX(i, pos.getX(i) * k)
      pos.setZ(i, pos.getZ(i) * k)
    }
    trunkGeo.computeVertexNormals()

    const fronds = []
    for (let k = 0; k < 10; k++) {
      const f = new THREE.PlaneGeometry(1.2, 4, 1, 10).translate(0, 2, 0).rotateX(-Math.PI / 2)
      const p = f.attributes.position
      const droop = 1.3 + (k % 3) * 0.35
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i)
        p.setY(i, p.getY(i) + 0.9 * (z / 4) - droop * Math.pow(z / 4, 2) * 1.6)
      }
      f.rotateY((k / 10) * Math.PI * 2 + (k % 2) * 0.2)
      f.computeVertexNormals()
      fronds.push(f)
    }
    const crownGeo = mergeGeometries(fronds)
    const nutGeo = mergeGeometries([0, 1, 2].map((k) => new THREE.SphereGeometry(0.2, 8, 6).translate(Math.cos(k * 2.1) * 0.22, -0.25, Math.sin(k * 2.1) * 0.22)))

    const tex = frondTexture()
    const leafMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 })
    const leafDepth = new THREE.MeshDepthMaterial({ map: tex, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking })

    const q = new THREE.Quaternion()
    const up = new THREE.Vector3()
    const trunkM = []
    const crownM = []
    for (const p of WORLD.palms) {
      q.setFromEuler(new THREE.Euler(p.tilt, p.rot, 0, 'YXZ'))
      trunkM.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, p.h, 1)))
      up.set(0, 1, 0).applyQuaternion(q).multiplyScalar(p.h)
      crownM.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x + up.x, up.y, p.z + up.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rot * 3, 0)), new THREE.Vector3(1, 1, 1)))
    }
    return { trunkGeo, crownGeo, nutGeo, trunkM, crownM, leafMat, leafDepth }
  }, [])

  useLayoutEffect(() => {
    for (const [ref, list] of [[trunks, trunkM], [crowns, crownM], [nuts, crownM]]) {
      list.forEach((m, i) => ref.current.setMatrixAt(i, m))
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
    crowns.current.customDepthMaterial = leafDepth
  }, [trunkM, crownM, leafDepth])

  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, null, trunkM.length]} castShadow>
        <meshStandardMaterial color="#8a6e52" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[crownGeo, leafMat, crownM.length]} castShadow />
      <instancedMesh ref={nuts} args={[nutGeo, null, crownM.length]}>
        <meshStandardMaterial color="#5a4024" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}

function StreetLamps({ G }) {
  useFrame(() => {
    const e = G.env
    const on = Math.max(THREE.MathUtils.clamp((e.night - 0.15) / 0.4, 0, 1), e.rain * 0.5)
    if (bulbs.current) bulbs.current.material.color.setScalar(0.1 + 0.9 * on)
    if (pools.current) {
      pools.current.material.opacity = (0.32 + e.wet * 0.25) * on
      pools.current.visible = on > 0.02
    }
  })
  const poles = useRef()
  const bulbs = useRef()
  const pools = useRef()
  const { poleGeo, bulbGeo, poolGeo, poolMat } = useMemo(() => {
    const poleGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.07, 0.11, 6.4, 8).translate(0, 3.2, 0),
      new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6).rotateX(Math.PI / 2).translate(0, 6.35, 0.8),
      new THREE.BoxGeometry(0.34, 0.12, 0.62).translate(0, 6.38, 1.62),
    ].map((g) => g.toNonIndexed()))
    const bulbGeo = new THREE.BoxGeometry(0.26, 0.03, 0.5).translate(0, 6.31, 1.62)
    const poolGeo = new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2).translate(0, 0.025, 2.2)
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,200,130,0.55)')
    grad.addColorStop(1, 'rgba(255,200,130,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 })
    return { poleGeo, bulbGeo, poolGeo, poolMat }
  }, [])
  const bulbColor = useMemo(() => glow('#ffd9a0', 1.2), [])

  useInstances(poles, WORLD.lamps, (l, o, c) => {
    o.position.set(l.x, SIDEWALK_H, l.z)
    o.rotation.set(0, l.rot, 0)
    o.scale.set(1, 1, 1)
    c.set('#2c2b33')
  })
  useInstances(bulbs, WORLD.lamps, (l, o, c) => {
    o.position.set(l.x, SIDEWALK_H, l.z)
    o.rotation.set(0, l.rot, 0)
    c.copy(bulbColor)
  })
  useInstances(pools, WORLD.lamps, (l, o, c) => {
    o.position.set(l.x, 0, l.z)
    o.rotation.set(0, l.rot, 0)
    c.set('#ffffff')
  })
  return (
    <group>
      <instancedMesh ref={poles} args={[poleGeo, null, WORLD.lamps.length]} castShadow>
        <meshStandardMaterial roughness={0.4} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[bulbGeo, null, WORLD.lamps.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[poolGeo, poolMat, WORLD.lamps.length]} />
    </group>
  )
}

function asphaltTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#3a3642'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,18,26' : '80,76,88'},${0.05 + Math.random() * 0.08})`
    g.beginPath()
    g.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 70, 10 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 9000; i++) {
    const v = Math.random()
    g.fillStyle = v < 0.5 ? `rgba(0,0,0,${v * 0.3})` : `rgba(255,255,255,${(v - 0.5) * 0.18})`
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5)
  }
  g.strokeStyle = 'rgba(15,12,20,0.45)'
  g.lineWidth = 1.2
  for (let i = 0; i < 6; i++) {
    g.beginPath()
    let x = Math.random() * 512, y = Math.random() * 512
    g.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (Math.random() - 0.5) * 50
      y += (Math.random() - 0.5) * 50
      g.lineTo(x, y)
    }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(24, 24)
  t.anisotropy = 8
  return t
}

function Ground({ G }) {
  const road = useRef()
  const walk = useRef()
  const dry = useMemo(() => new THREE.Color('#ffffff'), [])
  const damp = useMemo(() => new THREE.Color('#7b7a86'), [])
  useFrame(() => {
    const w = G.env.wet
    if (road.current) {
      road.current.roughness = THREE.MathUtils.lerp(0.9, 0.12, w)
      road.current.envMapIntensity = 1 + w * 1.2
      road.current.color.copy(dry).lerp(damp, w)
    }
    if (walk.current) {
      walk.current.roughness = THREE.MathUtils.lerp(0.85, 0.3, w)
      walk.current.color.copy(dry).lerp(damp, w * 0.6)
    }
  })
  const slabs = useRef()
  const dashes = useRef()
  const zebra = useRef()
  const blocks = useMemo(() => {
    const out = []
    const parks = new Set(WORLD.parks.map((p) => `${p.x},${p.z}`))
    for (let i = 0; i < BLOCKS; i++) {
      for (let j = 0; j < BLOCKS; j++) {
        const x = blockCenter(i), z = blockCenter(j)
        out.push({ x, z, s: BLOCK, color: '#c4b7c2' })
        if (parks.has(`${x},${z}`)) out.push({ x, z, s: BLOCK - 5, color: '#4f9e58', h: SIDEWALK_H + 0.1 })
      }
    }
    return out
  }, [])
  const dashList = useMemo(() => {
    const out = []
    for (let i = 0; i <= BLOCKS; i++) {
      for (let j = 0; j < BLOCKS; j++) {
        const start = roadCoord(j) + 12
        for (let s = 0; s < 6; s++) {
          out.push({ x: roadCoord(i), z: start + s * 6 + 1.5, vertical: true })
          out.push({ x: start + s * 6 + 1.5, z: roadCoord(i), vertical: false })
        }
      }
    }
    return out
  }, [])
  // zebra crossings on every approach to every junction
  const zebraList = useMemo(() => {
    const out = []
    for (let i = 0; i <= BLOCKS; i++) {
      for (let j = 0; j <= BLOCKS; j++) {
        const x = roadCoord(i), z = roadCoord(j)
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + dx, nj = j + dz
          if (ni < 0 || nj < 0 || ni > BLOCKS || nj > BLOCKS) continue
          for (let k = -5; k <= 5; k++) {
            if (dx) out.push({ x: x + dx * 9.4, z: z + k * 1.15, along: true })
            else out.push({ x: x + k * 1.15, z: z + dz * 9.4, along: false })
          }
        }
      }
    }
    return out
  }, [])
  useInstances(slabs, blocks, (b, o, c) => {
    o.position.set(b.x, 0, b.z)
    o.scale.set(b.s, b.h || SIDEWALK_H, b.s)
    c.set(b.color)
  })
  useInstances(dashes, dashList, (d, o, c) => {
    o.position.set(d.x, 0, d.z)
    o.scale.set(d.vertical ? 0.22 : 3, 0.06, d.vertical ? 3 : 0.22)
    c.set('#f2c94c')
  })
  useInstances(zebra, zebraList, (d, o, c) => {
    o.position.set(d.x, 0, d.z)
    o.scale.set(d.along ? 2.6 : 0.55, 0.06, d.along ? 0.55 : 2.6)
    c.set('#e9e6ea')
  })

  const asphalt = useMemo(asphaltTexture, [])
  const sand = useMemo(() => grainTexture('#efd29b', 0.25, 20), [])
  const W = CITY_EDGE * 2
  const sandW = BEACH_END - CITY_EDGE + 6

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, W]} />
        <meshStandardMaterial ref={road} map={asphalt} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[BEACH_END - 1500, -0.6, 0]}>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#3e6a4c" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[CITY_EDGE + sandW / 2, 0.005, 0]} receiveShadow>
        <planeGeometry args={[sandW, W]} />
        <meshStandardMaterial map={sand} roughness={1} />
      </mesh>
      <Ocean />
      <instancedMesh ref={slabs} args={[unitBox, null, blocks.length]} receiveShadow>
        <meshStandardMaterial ref={walk} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={dashes} args={[unitBox, null, dashList.length]} receiveShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={zebra} args={[unitBox, null, zebraList.length]} receiveShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <Hedges />
      <Pier />
      {WORLD.parks.map((p) => (
        <Fountain key={`${p.x},${p.z}`} x={p.x} z={p.z} />
      ))}
    </group>
  )
}

function waveNormalTexture() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const img = g.createImageData(size, size)
  const waves = Array.from({ length: 6 }, () => [Math.random() * 6.28, (1 + Math.floor(Math.random() * 4)), (1 + Math.floor(Math.random() * 4)), Math.random() * 6.28])
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0, dy = 0
      for (const [, kx, ky, ph] of waves) {
        const a = ((kx * x + ky * y) / size) * Math.PI * 2 + ph
        dx += Math.cos(a) * kx * 0.18
        dy += Math.cos(a) * ky * 0.18
      }
      const i = (y * size + x) * 4
      img.data[i] = 128 + dx * 60
      img.data[i + 1] = 128 + dy * 60
      img.data[i + 2] = 255
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(160, 160)
  return t
}

function Ocean() {
  const normal = useMemo(waveNormalTexture, [])
  useFrame((_, dt) => {
    normal.offset.x += dt * 0.004
    normal.offset.y += dt * 0.0025
  })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[BEACH_END + 1500, -0.15, 0]}>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#0f7f9c" roughness={0.06} metalness={0.35} normalMap={normal} normalScale={[0.35, 0.35]} envMapIntensity={1.3} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[BEACH_END + 0.5, -0.05, 0]}>
        <planeGeometry args={[2.5, CITY_EDGE * 2]} />
        <meshBasicMaterial color="#e9fbff" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function Hedges() {
  const len = CITY_EDGE * 2
  const beach = BEACH_END - CITY_EDGE
  const parts = [
    [-CITY_EDGE - 1, 0, 2, len + 4],
    [0, -CITY_EDGE - 1, len + 4, 2],
    [0, CITY_EDGE + 1, len + 4, 2],
    [CITY_EDGE + beach / 2, -CITY_EDGE - 1, beach + 2, 2],
    [CITY_EDGE + beach / 2, CITY_EDGE + 1, beach + 2, 2],
  ]
  return parts.map(([x, z, w, d], k) => (
    <mesh key={k} position={[x, 0, z]} scale={[w, 2.6, d]} geometry={unitBox} castShadow receiveShadow>
      <meshStandardMaterial color="#2f6e42" roughness={1} />
    </mesh>
  ))
}

function Pier() {
  const len = PIER.end - BEACH_END + 4
  const posts = []
  for (let x = BEACH_END + 6; x < PIER.end; x += 10) posts.push(x)
  return (
    <group>
      <mesh position={[BEACH_END - 4 + len / 2, -0.25, PIER.z]} scale={[len, 0.3, PIER.halfWidth * 2]} geometry={unitBox} receiveShadow castShadow>
        <meshStandardMaterial color="#9c7452" roughness={1} />
      </mesh>
      {posts.map((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`}>
            <mesh position={[x, -2, PIER.z + s * (PIER.halfWidth - 0.3)]} scale={[0.5, 3.2, 0.5]} geometry={unitBox}>
              <meshStandardMaterial color="#6b4f37" />
            </mesh>
            <mesh position={[x, 0, PIER.z + s * (PIER.halfWidth - 0.15)]} scale={[10, 1, 0.15]} geometry={unitBox}>
              <meshStandardMaterial color="#f4eee6" />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[PIER.end - 1, 0, PIER.z]} scale={[0.3, 1, PIER.halfWidth * 2]} geometry={unitBox}>
        <meshStandardMaterial color="#f4eee6" />
      </mesh>
    </group>
  )
}

function Fountain({ x, z }) {
  const water = useRef()
  useFrame(({ clock }) => {
    if (water.current) water.current.scale.y = 1 + Math.sin(clock.elapsedTime * 4) * 0.15
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3, 3.2, 0.8, 32]} />
        <meshStandardMaterial color="#efe6f2" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.05, 32]} />
        <meshStandardMaterial color="#2fbcd6" roughness={0.05} metalness={0.3} />
      </mesh>
      <mesh ref={water} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.15, 0.5, 2, 12]} />
        <meshStandardMaterial color="#bff6ff" transparent opacity={0.7} roughness={0.05} />
      </mesh>
    </group>
  )
}

function Billboard({ url, position, size, rotationY = 0, neon }) {
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(url)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [url])
  const frame = useMemo(() => glow(neon, 0.6), [neon])
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[size[0] + 0.4, size[1] + 0.4]} />
        <meshBasicMaterial color={frame} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={size} />
        <meshBasicMaterial color="#141022" />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </group>
  )
}

function Landmark({ l }) {
  const rotY = l.facing > 0 ? 0 : Math.PI
  const signW = Math.min(l.w * 0.9, 24)
  const signY = l.id === 'spray' ? 5.6 : Math.min(l.h - 2.6, 15)
  const tex = useMemo(() => signTexture(l.sign, l.neon, { sub: l.title ? l.title.toUpperCase() : undefined }), [l])
  const signColor = useMemo(() => glow('#ffffff', 0.6), [])
  const spire = useMemo(() => glow(l.neon, 1), [l])
  const front = l.faceZ + l.facing * 0.12
  const back = l.z - (l.facing * l.d) / 2 - l.facing * 0.12

  let extras = null
  if (l.id === 'projects') {
    extras = projects.slice(0, 4).map((p, k) => (
      <Billboard key={p.title} url={p.href} neon={l.neon} size={[6, 3.6]} rotationY={rotY}
        position={[l.x + (k - 1.5) * 7, 6, front + l.facing * 0.05]} />
    ))
  } else if (l.id === 'about') {
    extras = <Billboard url={ahmar} neon={l.neon} size={[7, 9]} rotationY={rotY} position={[l.x, 25, front + l.facing * 0.05]} />
  } else if (l.id === 'education') {
    extras = <Billboard url={SRMU} neon={l.neon} size={[5, 5]} rotationY={rotY} position={[l.x, 5, front + l.facing * 0.05]} />
  } else if (l.id === 'skills') {
    const icons = [...skills[0].tech, ...skills[1].tech].slice(0, 7)
    extras = icons.map((t, k) => (
      <Billboard key={t.label} url={t.href} neon={l.neon} size={[2.4, 2.4]} rotationY={rotY}
        position={[l.x + (k - 3) * 3.6, 4.5, front + l.facing * 0.05]} />
    ))
  } else if (l.id === 'mall') {
    extras = (
      <group>
        <mesh position={[l.x, 3, front + l.facing * 0.06]} rotation-y={rotY}>
          <planeGeometry args={[14, 6]} />
          <meshPhysicalMaterial color="#9fd8ee" roughness={0.05} metalness={0.4} transparent opacity={0.85} />
        </mesh>
        <mesh position={[l.x, 6.4, front + l.facing * 2]} castShadow>
          <boxGeometry args={[16, 0.35, 4]} />
          <meshStandardMaterial color="#f4f4f6" roughness={0.4} />
        </mesh>
      </group>
    )
  } else if (l.id === 'spray') {
    extras = (
      <mesh position={[l.x, 1.8, front + l.facing * 0.03]} rotation-y={rotY}>
        <planeGeometry args={[9, 3.6]} />
        <meshStandardMaterial color="#2a2438" roughness={0.5} metalness={0.6} />
      </mesh>
    )
  }

  return (
    <group>
      <mesh position={[l.x, signY, front]} rotation-y={rotY}>
        <planeGeometry args={[signW, signW / 4]} />
        <meshBasicMaterial map={tex} color={signColor} transparent toneMapped={false} />
      </mesh>
      {l.h > 12 && (
        <mesh position={[l.x, signY, back]} rotation-y={rotY + Math.PI}>
          <planeGeometry args={[signW, signW / 4]} />
          <meshBasicMaterial map={tex} color={signColor} transparent toneMapped={false} />
        </mesh>
      )}
      {extras}
      {l.id === 'about' && (
        <mesh position={[l.x, l.h * 1.12 + 6, l.z]}>
          <cylinderGeometry args={[0.15, 0.4, 10, 8]} />
          <meshBasicMaterial color={spire} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

export default function City({ G }) {
  return (
    <group>
      <Ground G={G} />
      <Buildings G={G} />
      <Palms />
      <StreetLamps G={G} />
      <Hotels G={G} />
      <Stadium G={G} />
      <Highway />
      {WORLD.landmarks.map((l) => (
        <Landmark key={l.id} l={l} />
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- Ocean Drive hotels
function Hotels({ G }) {
  const fins = useRef([])
  useFrame(() => {
    const k = 0.55 + 0.45 * G.env.night
    fins.current.forEach((m) => m && m.material.color.copy(m.userData.base).multiplyScalar(k))
  })
  return WORLD.hotels.map((h, i) => {
    const face = h.x + h.w / 2
    const tex = signTexture(`HOTEL ${h.name}`, h.neon, { width: 1024, height: 200 })
    const base = glow(h.neon, 1)
    return (
      <group key={i}>
        {/* name sign across the beach-facing facade */}
        <mesh position={[face + 0.15, h.h - 2.2, h.z]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[h.d * 0.9, h.d * 0.9 * 0.2]} />
          <meshBasicMaterial map={tex} color={glow('#ffffff', 0.6)} transparent toneMapped={false} />
        </mesh>
        {/* art-deco vertical neon fin */}
        <mesh ref={(el) => { if (el) { el.userData.base = base; fins.current[i] = el } }} position={[face + 0.4, h.h / 2 + 2, h.z - h.d / 2 + 1]}>
          <boxGeometry args={[0.6, h.h + 4, 0.25]} />
          <meshBasicMaterial color={base} toneMapped={false} />
        </mesh>
        {/* entrance canopy */}
        <mesh position={[face + 1.4, 3.2, h.z]} castShadow>
          <boxGeometry args={[2.8, 0.25, 5]} />
          <meshStandardMaterial color={h.neon} roughness={0.5} />
        </mesh>
      </group>
    )
  })
}

// ---------------------------------------------------------------- stadium
function Stadium({ G }) {
  const l = WORLD.lm.stadium
  const { stands, wall, field } = useMemo(() => {
    // stands: a sloped oval bowl
    const prof = [[14, 0.2], [14.2, 1.5], [16.5, 6], [19.5, 12], [19.8, 14], [20, 14], [20, 0]].map(([r, y]) => new THREE.Vector2(r, y))
    const stands = new THREE.LatheGeometry(prof, 48).scale(1, 1, 0.92)
    const wall = new THREE.CylinderGeometry(20.05, 20.05, 14, 48, 6, true).scale(1, 1, 0.92).translate(0, 7, 0)
    const field = new THREE.CircleGeometry(14, 48).rotateX(-Math.PI / 2).scale(1, 1, 0.92).translate(0, 0.2, 0)
    return { stands, wall, field }
  }, [])
  const lightColor = useMemo(() => glow('#f4f8ff', 1.4), [])
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: lightColor.clone(), toneMapped: false }), [lightColor])
  useFrame(() => {
    lightMat.color.copy(lightColor).multiplyScalar(0.1 + 0.9 * Math.max(G.env.night, G.env.rain * 0.6))
  })
  const towers = [[-17, -15], [17, -15], [-17, 15], [17, 15]]
  return (
    <group position={[l.x, 0, l.z]}>
      <mesh geometry={stands} castShadow receiveShadow>
        <meshStandardMaterial color="#b9bfcc" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={wall} castShadow>
        <meshStandardMaterial color={l.color} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={field} receiveShadow>
        <meshStandardMaterial color="#3f9a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 14.1, 0]} rotation-x={-Math.PI / 2} scale={[1, 0.92, 1]}>
        <ringGeometry args={[19.6, 20.4, 48]} />
        <meshBasicMaterial color={glow(l.neon, 0.8)} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {towers.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position={[0, 11, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.4, 22, 8]} />
            <meshStandardMaterial color="#5a5d66" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 22.4, 0]} rotation-y={Math.atan2(-x, -z)} material={lightMat}>
            <boxGeometry args={[3, 1.6, 0.4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- elevated highway (scenery)
const HW_CARS = 26
function Highway() {
  const cars = useRef()
  const H = HIGHWAY
  const len = H.z1 - H.z0
  const pillars = useMemo(() => {
    const out = []
    for (let z = H.z0; z <= H.z1; z += 24) out.push(z)
    return out
  }, [H])
  const carState = useMemo(() => Array.from({ length: HW_CARS }, (_, i) => ({ z: H.z0 + (i / HW_CARS) * len, dir: i % 2 ? 1 : -1, speed: 22 + (i % 5) * 3, color: ['#ececee', '#15171c', '#7a0f1c', '#1f3a6b', '#f5c518', '#b9bec6'][i % 6] })), [H, len])
  const o = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const c = new THREE.Color()
    carState.forEach((s, i) => cars.current.setColorAt(i, c.set(s.color)))
    cars.current.instanceColor.needsUpdate = true
  }, [carState])
  useFrame((_, dt) => {
    carState.forEach((s, i) => {
      s.z += s.dir * s.speed * dt
      if (s.z > H.z1) s.z = H.z0
      if (s.z < H.z0) s.z = H.z1
      o.position.set(H.x + s.dir * 3.6, H.y + 0.85, s.z)
      o.rotation.set(0, s.dir > 0 ? 0 : Math.PI, 0)
      o.updateMatrix()
      cars.current.setMatrixAt(i, o.matrix)
    })
    cars.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh position={[H.x, H.y, (H.z0 + H.z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[H.width, 0.9, len]} />
        <meshStandardMaterial color="#8f8c96" roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[H.x + s * (H.width / 2 - 0.2), H.y + 0.9, (H.z0 + H.z1) / 2]}>
          <boxGeometry args={[0.4, 0.9, len]} />
          <meshStandardMaterial color="#c9c6cf" roughness={0.7} />
        </mesh>
      ))}
      {pillars.map((z) => (
        <mesh key={z} position={[H.x, H.y / 2, z]} castShadow>
          <boxGeometry args={[3, H.y, 2.2]} />
          <meshStandardMaterial color="#a6a3ad" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh ref={cars} args={[new THREE.BoxGeometry(1.9, 1.3, 4.4), null, HW_CARS]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}
