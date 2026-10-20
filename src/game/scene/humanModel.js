// Procedural low-poly human: rigid-skinned parts on a 15-bone skeleton, drawn as a single SkinnedMesh.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Bone layout: [name, parent index, position relative to parent]
const BONES = [
  ['hips', -1, [0, 0.98, 0]],
  ['spine', 0, [0, 0.12, 0]],
  ['chest', 1, [0, 0.22, 0]],
  ['neck', 2, [0, 0.2, 0]],
  ['head', 3, [0, 0.08, 0]],
  ['armL', 2, [0.19, 0.15, 0]],
  ['foreL', 5, [0.02, -0.3, 0]],
  ['armR', 2, [-0.19, 0.15, 0]],
  ['foreR', 7, [-0.02, -0.3, 0]],
  ['thighL', 0, [0.095, -0.04, 0]],
  ['shinL', 9, [0.005, -0.42, 0]],
  ['footL', 10, [0, -0.43, 0]],
  ['thighR', 0, [-0.095, -0.04, 0]],
  ['shinR', 12, [-0.005, -0.42, 0]],
  ['footR', 13, [0, -0.43, 0]],
]
const B = Object.fromEntries(BONES.map(([n], i) => [n, i]))

function part(geo, bone, color) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const n = g.attributes.position.count
  const c = new THREE.Color(color)
  const col = new Float32Array(n * 3)
  const si = new Uint16Array(n * 4)
  const sw = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    col.set([c.r, c.g, c.b], i * 3)
    si[i * 4] = bone
    sw[i * 4] = 1
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  g.deleteAttribute('uv')
  return g
}

const capsule = (r, len, x, y, z, segs = 10) => new THREE.CapsuleGeometry(r, len, 4, segs).translate(x, y, z)
const ball = (r, sx, sy, sz, x, y, z, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz).translate(x, y, z)

function torso(y0, pts, depth) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 16)
  return g.scale(1, 1, depth).translate(0, y0, 0)
}

const geoCache = new Map()

export function humanGeometry(look) {
  const key = JSON.stringify(look)
  if (geoCache.has(key)) return geoCache.get(key)
  const { skin, shirt, pants, hair, shoes, female, hairStyle = 'short', glasses } = look
  const P = []
  const legColor = female && look.skirt ? skin : pants

  // torso
  P.push(part(torso(0, [[0.001, 0.96], [0.155, 0.97], [0.15, 1.04], [0.145, 1.1], [0.14, 1.2]], 0.66), B.spine, shirt))
  P.push(part(torso(0, [[0.001, 0.86], [0.15, 0.88], [0.162, 0.95], [0.158, 0.99], [0.001, 1.0]], 0.66), B.hips, pants))
  P.push(part(torso(0, [[0.14, 1.12], [0.15, 1.24], female ? [0.16, 1.36] : [0.175, 1.38], [0.17, 1.46], [0.13, 1.51], [0.06, 1.54], [0.001, 1.545]], 0.62), B.chest, shirt))
  if (female) for (const s of [-1, 1]) P.push(part(ball(0.06, 1, 0.9, 0.8, s * 0.065, 1.33, 0.07), B.chest, shirt))
  if (look.skirt) P.push(part(new THREE.CylinderGeometry(0.15, 0.25, 0.42, 16, 1, true).translate(0, 0.74, 0), B.hips, pants))
  else P.push(part(ball(0.165, 1, 0.75, 0.68, 0, 0.92, 0), B.hips, pants))
  if (look.jacket) P.push(part(torso(0, [[0.155, 1.0], [0.165, 1.24], [0.185, 1.38], [0.18, 1.47], [0.14, 1.52]], 0.66), B.chest, look.jacket))

  // neck + head
  P.push(part(new THREE.CylinderGeometry(0.048, 0.055, 0.14, 10).translate(0, 1.58, 0), B.neck, skin))
  P.push(part(ball(0.1, 0.95, 1.18, 1.05, 0, 1.71, 0.005), B.head, skin))
  P.push(part(ball(0.07, 1, 0.65, 0.95, 0, 1.635, 0.035), B.head, skin)) // jaw
  P.push(part(new THREE.ConeGeometry(0.018, 0.05, 6).rotateX(Math.PI / 2).translate(0, 1.695, 0.115), B.head, skin)) // nose
  for (const s of [-1, 1]) {
    P.push(part(ball(0.03, 0.4, 0.75, 0.6, s * 0.096, 1.7, 0), B.head, skin)) // ears
    if (!glasses) {
      P.push(part(ball(0.014, 1, 0.8, 0.5, s * 0.037, 1.72, 0.094, 8, 6), B.head, '#f4f4f4'))
      P.push(part(ball(0.008, 1, 1, 0.6, s * 0.037, 1.72, 0.1, 6, 4), B.head, '#20140c'))
    }
    P.push(part(new THREE.BoxGeometry(0.045, 0.01, 0.012).translate(s * 0.038, 1.748, 0.097), B.head, hair))
  }
  P.push(part(new THREE.BoxGeometry(0.035, 0.008, 0.01).translate(0, 1.645, 0.102), B.head, '#9c4a43')) // mouth
  if (glasses) {
    P.push(part(new THREE.BoxGeometry(0.18, 0.04, 0.02).translate(0, 1.72, 0.1), B.head, '#0b0b10'))
    P.push(part(new THREE.BoxGeometry(0.008, 0.012, 0.11).translate(0.09, 1.725, 0.05), B.head, '#0b0b10'))
    P.push(part(new THREE.BoxGeometry(0.008, 0.012, 0.11).translate(-0.09, 1.725, 0.05), B.head, '#0b0b10'))
  }
  if (hairStyle !== 'bald') {
    P.push(part(new THREE.SphereGeometry(0.108, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.98, 1.12, 1.08).translate(0, 1.73, -0.01), B.head, hair))
    if (hairStyle === 'long') {
      P.push(part(new THREE.BoxGeometry(0.2, 0.3, 0.06).translate(0, 1.6, -0.08), B.head, hair))
      P.push(part(ball(0.1, 1, 1.3, 0.6, 0, 1.66, -0.07), B.head, hair))
    }
    if (hairStyle === 'bun') P.push(part(ball(0.05, 1, 1, 1, 0, 1.82, -0.07), B.head, hair))
  }

  // arms: joints at shoulder (0.19, 1.47) elbow (0.21, 1.17) wrist (0.22, 0.92)
  const sleeve = look.longSleeves ? shirt : skin
  for (const [s, arm, fore] of [[1, B.armL, B.foreL], [-1, B.armR, B.foreR]]) {
    P.push(part(ball(0.068, 1, 0.9, 0.9, s * 0.185, 1.465, 0), arm, look.jacket || shirt))
    P.push(part(capsule(0.046, 0.2, s * 0.2, 1.32, 0), arm, sleeve))
    P.push(part(new THREE.CylinderGeometry(0.062, 0.058, 0.16, 12).translate(s * 0.195, 1.39, 0), arm, look.jacket || shirt))
    P.push(part(capsule(0.04, 0.2, s * 0.215, 1.05, 0), fore, look.longSleeves ? shirt : skin))
    P.push(part(ball(0.042, 0.7, 1.4, 0.9, s * 0.222, 0.87, 0.005), fore, skin)) // hand
  }

  // legs: hip (0.095, 0.94) knee (0.1, 0.52) ankle (0.1, 0.09)
  for (const [s, thigh, shin, foot] of [[1, B.thighL, B.shinL, B.footL], [-1, B.thighR, B.shinR, B.footR]]) {
    P.push(part(capsule(0.078, 0.32, s * 0.097, 0.73, 0), thigh, look.shorts ? pants : legColor))
    P.push(part(capsule(0.058, 0.34, s * 0.1, 0.31, 0), shin, look.shorts || (female && look.skirt) ? skin : pants))
    P.push(part(new THREE.CapsuleGeometry(0.05, 0.14, 3, 8).rotateX(Math.PI / 2).scale(1, 0.75, 1).translate(s * 0.1, 0.045, 0.05), foot, shoes))
  }
  if (look.shorts) for (const s of [-1, 1]) P.push(part(new THREE.CylinderGeometry(0.09, 0.085, 0.24, 12).translate(s * 0.097, 0.78, 0), s > 0 ? B.thighL : B.thighR, pants))

  const g = mergeGeometries(P)
  g.computeBoundingSphere()
  geoCache.set(key, g)
  return g
}

export const PLAYER_LOOK = { skin: '#c99272', shirt: '#ff5fa2', pants: '#ece6da', hair: '#1c120c', shoes: '#f2f2f2', glasses: true, hairStyle: 'short' }
export const RIDER_LOOK = { skin: '#a8714a', shirt: '#2b2b33', pants: '#1f1f24', hair: '#1c120c', shoes: '#1a1a1a', glasses: true, hairStyle: 'short', jacket: '#1f1f24', longSleeves: true }

export const humanMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02 })

export function createHuman(look) {
  const geo = humanGeometry(look)
  const mesh = new THREE.SkinnedMesh(geo, humanMaterial)
  const bones = BONES.map(([name]) => {
    const b = new THREE.Bone()
    b.name = name
    return b
  })
  BONES.forEach(([, parent, pos], i) => {
    bones[i].position.fromArray(pos)
    if (parent >= 0) bones[parent].add(bones[i])
  })
  mesh.add(bones[0])
  mesh.bind(new THREE.Skeleton(bones))
  mesh.castShadow = true
  mesh.frustumCulled = false
  const rig = Object.fromEntries(BONES.map(([name], i) => [name, bones[i]]))
  return { mesh, rig }
}

// Pose the skeleton. phase: gait phase, gait: 0 idle .. 1 walk .. 2 run,
// mode: 'move' | 'air' | 'down' | 'ride' (motorbike) | 'sit' (boat); arms: null | 'aim' | 'gun'
export function poseHuman(rig, phase, gait, mode, t, arms = null) {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  const run = Math.max(0, gait - 1)
  const a = Math.min(gait, 1) * (0.42 + run * 0.35)

  rig.hips.position.y = 0.98 - run * 0.04 + Math.abs(c) * 0.03 * Math.min(gait, 1)
  rig.hips.rotation.set(0, s * 0.08 * a, 0)
  rig.spine.rotation.set(run * 0.22, -s * 0.1 * a, 0)
  rig.chest.rotation.set(0, -s * 0.12 * a, 0)
  rig.head.rotation.set(-run * 0.15, s * 0.08 * a, 0)
  rig.neck.rotation.set(0, 0, 0)

  // legs: negative x rotation swings forward
  rig.thighL.rotation.set(-s * a, 0, 0)
  rig.thighR.rotation.set(s * a, 0, 0)
  rig.shinL.rotation.set(a * (0.25 + 1.1 * Math.max(0, -c)), 0, 0)
  rig.shinR.rotation.set(a * (0.25 + 1.1 * Math.max(0, c)), 0, 0)
  rig.footL.rotation.set(0, 0, 0)
  rig.footR.rotation.set(0, 0, 0)

  const idle = 1 - Math.min(gait, 1)
  const breathe = Math.sin(t * 1.6) * 0.02 * idle
  rig.armL.rotation.set(s * a * 0.9 + breathe, 0, 0.07 + idle * 0.03)
  rig.armR.rotation.set(-s * a * 0.9 + breathe, 0, -0.07 - idle * 0.03)
  rig.foreL.rotation.set(-(0.2 + run * 0.9 + Math.max(0, -s) * a * 0.4), 0, 0)
  rig.foreR.rotation.set(-(0.2 + run * 0.9 + Math.max(0, s) * a * 0.4), 0, 0)

  if (arms === 'aim') {
    // two-handed aim straight ahead
    rig.armR.rotation.set(-1.45, 0.15, 0)
    rig.foreR.rotation.set(0, 0, 0)
    rig.armL.rotation.set(-1.35, -0.45, 0.25)
    rig.foreL.rotation.set(-0.35, 0, 0)
    rig.spine.rotation.y = 0
    rig.chest.rotation.y = 0
  } else if (arms === 'gun') {
    rig.armR.rotation.set(-0.35 + s * a * 0.3, 0, -0.05)
    rig.foreR.rotation.set(-0.6, 0, 0)
  }

  if (mode === 'ride' || mode === 'sit') {
    const bike = mode === 'ride'
    rig.hips.position.y = 0.98
    rig.hips.rotation.set(0, 0, 0)
    rig.spine.rotation.set(bike ? 0.45 : 0.1, 0, 0)
    rig.chest.rotation.set(bike ? 0.15 : 0, 0, 0)
    rig.head.rotation.set(bike ? -0.5 : -0.1, 0, 0)
    rig.thighL.rotation.set(-1.35, 0, bike ? 0.18 : 0.1)
    rig.thighR.rotation.set(-1.35, 0, bike ? -0.18 : -0.1)
    rig.shinL.rotation.set(bike ? 1.75 : 1.45, 0, 0)
    rig.shinR.rotation.set(bike ? 1.75 : 1.45, 0, 0)
    rig.armL.rotation.set(bike ? -0.9 : -1.0, 0, 0.25)
    rig.armR.rotation.set(bike ? -0.9 : -1.0, 0, -0.25)
    rig.foreL.rotation.set(bike ? -0.5 : -0.6, 0, 0)
    rig.foreR.rotation.set(bike ? -0.5 : -0.6, 0, 0)
    return
  }

  if (mode === 'air') {
    rig.thighL.rotation.x = -0.7
    rig.thighR.rotation.x = -0.2
    rig.shinL.rotation.x = 1.0
    rig.shinR.rotation.x = 0.6
    rig.armL.rotation.set(-0.4, 0, 0.5)
    rig.armR.rotation.set(-0.4, 0, -0.5)
  } else if (mode === 'down') {
    rig.hips.position.y = 0.98
    rig.armL.rotation.set(0, 0, 1.3)
    rig.armR.rotation.set(0, 0, -1.1)
    rig.foreL.rotation.set(-0.3, 0, 0)
    rig.foreR.rotation.set(-0.6, 0, 0)
    rig.thighL.rotation.set(0, 0, 0.25)
    rig.thighR.rotation.set(-0.3, 0, -0.15)
    rig.shinL.rotation.set(0.2, 0, 0)
    rig.shinR.rotation.set(0.7, 0, 0)
    rig.spine.rotation.set(0, 0, 0)
    rig.head.rotation.set(0, 0.6, 0)
  }
}
