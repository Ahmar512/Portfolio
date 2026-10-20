// Static layout of Neon Bay: road grid, blocks, buildings, colliders and spawn points.
// Everything here is generated once from a fixed seed so the city is the same on every visit.

export const BLOCKS = 6 // blocks per axis
export const BLOCK = 44 // block size (incl. sidewalk)
export const ROAD = 14 // road width
export const PITCH = BLOCK + ROAD
export const HALF = (BLOCKS / 2) * PITCH // centre line of the outermost roads
export const CITY_EDGE = HALF + ROAD / 2
export const BEACH_END = CITY_EDGE + 45
export const PIER = { z: 0, halfWidth: 6, end: BEACH_END + 80 }
export const LANE = 3.5
export const SIDEWALK_H = 0.12

export const roadCoord = (i) => -HALF + i * PITCH
export const blockCenter = (b) => -HALF + PITCH / 2 + b * PITCH

export const nearestNode = (x, z) => [
  Math.max(0, Math.min(BLOCKS, Math.round((x + HALF) / PITCH))),
  Math.max(0, Math.min(BLOCKS, Math.round((z + HALF) / PITCH))),
]

// Is (x, z) on a raised block (sidewalk / plaza) rather than on the road?
export function groundHeight(x, z) {
  const lx = x + HALF
  const lz = z + HALF
  if (lx < 0 || lz < 0 || lx > BLOCKS * PITCH || lz > BLOCKS * PITCH) return 0
  const mx = lx % PITCH
  const mz = lz % PITCH
  const r = ROAD / 2
  return mx > r && mx < PITCH - r && mz > r && mz < PITCH - r ? SIDEWALK_H : 0
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const PASTELS = ['#f7a8c4', '#8fd6e0', '#f5e0b7', '#c9a0f0', '#ffd1a1', '#a8e6cf', '#f4eee6', '#ff9eb5', '#9ad0ff', '#ffe7a3']
export const NEONS = ['#ff2fd0', '#18e5ff', '#ffe14d', '#b44dff', '#ff6b3d', '#39ff88']

// Portfolio landmarks. `facing` is the z direction the entrance faces.
export const LANDMARKS = [
  { id: 'about', title: 'About Me', sign: 'AHMAR TOWER', block: [2, 2], facing: 1, w: 20, d: 18, h: 50, color: '#ff9ec7', neon: '#ff2fd0', letter: 'A' },
  { id: 'projects', title: 'Projects', sign: 'PROJECTS HQ', block: [3, 2], facing: 1, w: 30, d: 20, h: 28, color: '#8fe3f0', neon: '#18e5ff', letter: 'P' },
  { id: 'skills', title: 'Skills', sign: 'SKILL GYM', block: [2, 3], facing: -1, w: 30, d: 20, h: 14, color: '#ffc48a', neon: '#ffe14d', letter: 'S' },
  { id: 'education', title: 'Education', sign: 'NEON ACADEMY', block: [3, 3], facing: -1, w: 28, d: 20, h: 18, color: '#e8f5e9', neon: '#b44dff', letter: 'E' },
  { id: 'contact', title: 'Contact', sign: 'SUNSET CAFE', block: [5, 1], facing: 1, w: 18, d: 14, h: 9, color: '#ffe9c7', neon: '#ff6b3d', letter: 'C' },
]

export const SERVICES = [
  { id: 'police', sign: 'NBPD', block: [0, 3], facing: 1, w: 30, d: 18, h: 12, color: '#dfe8ff', neon: '#2f6bff' },
  { id: 'hospital', sign: 'HOSPITAL', block: [4, 5], facing: -1, w: 30, d: 20, h: 16, color: '#ffffff', neon: '#ff3b3b' },
  { id: 'spray', sign: 'NEON SPRAY', block: [1, 5], facing: -1, w: 16, d: 14, h: 7, color: '#7fffd4', neon: '#39ff88' },
  { id: 'pizza', sign: 'PIZZA BAY', block: [3, 4], facing: -1, w: 18, d: 14, h: 8, color: '#ffe0b0', neon: '#ff5a1f' },
  { id: 'mall', sign: 'NEON MALL', block: [1, 1], facing: 1, w: 36, d: 26, h: 12, color: '#eef0f6', neon: '#18e5ff' },
  // drawn by its own component; only the collider and sign placement come from here
  { id: 'stadium', sign: 'NEON BAY STADIUM', block: [0, 0], facing: 1, w: 40, d: 40, h: 14, color: '#d9dde6', neon: '#ff2fd0', custom: true },
]

const HOTEL_NAMES = ['FLAMINGO', 'CORAL CLUB', 'THE PALMS', 'SEA BREEZE', 'MOONLIGHT', 'OCEAN VIEW', 'STARLITE', 'BAYSIDE', 'PELICAN', 'TROPICANA', 'SUNRISE INN', 'BLUE LAGOON']

// Decorative elevated highway beyond the west edge of the city
export const HIGHWAY = { x: -HALF - ROAD / 2 - 30, y: 9, z0: -620, z1: 620, width: 16 }

const PARKS = [[1, 4], [4, 1]]

export const MISSIONS = [
  { id: 'delivery', name: 'Special Delivery', reward: 500, giver: { x: blockCenter(1), z: blockCenter(2) + 20 } },
  { id: 'race', name: 'Ocean Drive Dash', reward: 1000, giver: { x: 200, z: 60 } },
  { id: 'heat', name: 'Heat Wave', reward: 1500, giver: { x: blockCenter(4), z: blockCenter(3) + 20 } },
  { id: 'pizza', name: 'Pizza Rush', reward: 800, giver: { x: blockCenter(3) + 5, z: blockCenter(4) - 19 } },
  // started by pressing E inside any taxi
  { id: 'taxi', name: 'Taxi Driver', reward: 0, giver: null },
]

// Stunt ramps: start point, heading (direction of travel), length, width, height
export const RAMPS = [
  { id: 'beach-north', x: 205, z: 100, heading: Math.PI, len: 9, w: 5, h: 1.8 },
  { id: 'beach-south', x: 210, z: -100, heading: 0, len: 9, w: 5, h: 1.8 },
  { id: 'park', x: 70, z: -104, heading: Math.PI / 2, len: 8, w: 5, h: 1.6 },
]
const rampDir = (r) => [Math.sin(r.heading), Math.cos(r.heading)]
// true if (x, z) lies on a ramp's run-up, the ramp itself or its landing strip
function nearRampPath(x, z, pad = 3.5) {
  return RAMPS.some((r) => {
    const [dx, dz] = rampDir(r)
    const rx = x - r.x, rz = z - r.z
    const along = rx * dx + rz * dz
    const lat = Math.abs(rx * dz - rz * dx)
    return along > -16 && along < r.len + 38 && lat < r.w / 2 + pad
  })
}

export const DELIVERY = {
  pickup: { x: PIER.end - 10, z: PIER.z },
  drop: { x: blockCenter(1), z: blockCenter(4) + 17 },
}

export const RACE = {
  start: { x: roadCoord(6) + LANE, z: roadCoord(4) },
  checkpoints: [
    [roadCoord(6), roadCoord(1)],
    [roadCoord(6), roadCoord(0)],
    [roadCoord(4), roadCoord(0)],
    [roadCoord(1), roadCoord(0)],
    [roadCoord(1), roadCoord(2)],
    [roadCoord(1), roadCoord(5)],
    [roadCoord(3), roadCoord(5)],
    [roadCoord(3), roadCoord(3)],
    [roadCoord(6), roadCoord(3)],
    [PIER.end - 12, PIER.z],
  ].map(([x, z]) => ({ x, z })),
}

const keyOf = (b) => `${b[0]},${b[1]}`

function frontZ(spec) {
  return blockCenter(spec.block[1]) + spec.facing * (BLOCK / 2 - 3)
}

export function buildWorld() {
  const rnd = mulberry32(1986)
  const buildings = [] // { x, z, w, d, h, y, color, neon, bands }
  const colliders = []
  const palms = []
  const parks = []
  const special = new Map()

  const addBox = (b, collide = true) => {
    buildings.push(b)
    if (collide) colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 })
  }
  const addPalm = (x, z, collide = true) => {
    palms.push({ x, z, h: 7 + rnd() * 5, tilt: (rnd() - 0.5) * 0.35, rot: rnd() * Math.PI * 2 })
    if (collide) colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 })
  }

  const hotels = []
  const landmarks = [...LANDMARKS, ...SERVICES].map((spec) => {
    const cx = blockCenter(spec.block[0])
    const cz = blockCenter(spec.block[1])
    const bz = spec.custom ? cz : cz - spec.facing * 4
    const l = {
      ...spec,
      x: cx,
      z: bz,
      faceZ: bz + (spec.facing * spec.d) / 2,
      zone: { x: cx, z: frontZ(spec), r: spec.id === 'spray' ? 5.5 : 4.5 },
    }
    special.set(keyOf(spec.block), l)
    if (spec.custom) {
      colliders.push({ minX: cx - spec.w / 2, maxX: cx + spec.w / 2, minZ: cz - spec.d / 2, maxZ: cz + spec.d / 2 })
      return l
    }
    addBox({ x: cx, z: bz, w: spec.w, d: spec.d, h: spec.h, y: 0, color: spec.color, neon: spec.neon, bands: spec.id !== 'spray' })
    // Art-deco stepped tops on the taller ones
    if (spec.h > 15) {
      addBox({ x: cx, z: bz, w: spec.w * 0.7, d: spec.d * 0.7, h: spec.h * 0.12, y: spec.h, color: spec.color, neon: spec.neon, bands: false }, false)
    }
    if (spec.id === 'about') {
      addBox({ x: cx, z: bz, w: spec.w * 0.4, d: spec.d * 0.4, h: 6, y: spec.h * 1.12, color: spec.color, neon: spec.neon, bands: false }, false)
    }
    return l
  })

  for (let bi = 0; bi < BLOCKS; bi++) {
    for (let bj = 0; bj < BLOCKS; bj++) {
      const cx = blockCenter(bi)
      const cz = blockCenter(bj)
      const key = keyOf([bi, bj])
      const corners = [[-19.5, -19.5], [19.5, -19.5], [-19.5, 19.5], [19.5, 19.5]]
      corners.forEach(([ox, oz]) => addPalm(cx + ox, cz + oz))

      if (PARKS.some((p) => keyOf(p) === key)) {
        parks.push({ x: cx, z: cz })
        colliders.push({ minX: cx - 3, maxX: cx + 3, minZ: cz - 3, maxZ: cz + 3 }) // fountain
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + rnd()
          addPalm(cx + Math.cos(a) * (9 + rnd() * 6), cz + Math.sin(a) * (9 + rnd() * 6))
        }
        continue
      }
      if (special.has(key)) {
        const l = special.get(key)
        addPalm(cx - l.w / 2 - 3, l.zone.z - l.facing * 2)
        addPalm(cx + l.w / 2 + 3, l.zone.z - l.facing * 2)
        continue
      }

      // Ocean Drive: a row of low art-deco hotels facing the beach
      if (bi === BLOCKS - 1) {
        for (const side of [-1, 1]) {
          const w = 19, d = 17
          const h = 10 + Math.floor(rnd() * 4) * 3
          const x = cx + 9, z = cz + side * 10.5
          const color = PASTELS[Math.floor(rnd() * PASTELS.length)]
          const neon = NEONS[Math.floor(rnd() * NEONS.length)]
          addBox({ x, z, w, d, h, y: 0, color, neon, bands: true })
          addBox({ x: x + w / 2 - 1.5, z, w: 3, d: d * 0.4, h: 5, y: h, color, neon, bands: false }, false)
          hotels.push({ x, z, w, d, h, neon, name: HOTEL_NAMES[hotels.length % HOTEL_NAMES.length] })
        }
      }

      // Generic block: 2x2 lots
      const centreDist = Math.hypot(cx, cz) / (HALF * 1.4)
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (bi === BLOCKS - 1 && lx > 0) continue
        const lotX = cx + lx * 9.75
        const lotZ = cz + lz * 9.75
        if (rnd() < 0.12) {
          addPalm(lotX + (rnd() - 0.5) * 6, lotZ + (rnd() - 0.5) * 6)
          continue
        }
        const w = 9 + rnd() * 7
        const d = 9 + rnd() * 7
        const x = lotX + (rnd() - 0.5) * (18.5 - w)
        const z = lotZ + (rnd() - 0.5) * (18.5 - d)
        const tall = Math.pow(rnd(), 1.6) * 34 * (1.15 - centreDist)
        const h = 7 + Math.max(0, tall)
        const color = PASTELS[Math.floor(rnd() * PASTELS.length)]
        const neon = NEONS[Math.floor(rnd() * NEONS.length)]
        addBox({ x, z, w, d, h, y: 0, color, neon, bands: true })
        if (h > 20 && rnd() < 0.6) {
          addBox({ x, z, w: w * 0.65, d: d * 0.65, h: 3 + rnd() * 5, y: h, color, neon, bands: false }, false)
        }
      }
    }
  }

  // Street lamps along every block edge, facing the road
  const lamps = []
  for (let bi = 0; bi < BLOCKS; bi++) {
    for (let bj = 0; bj < BLOCKS; bj++) {
      const cx = blockCenter(bi), cz = blockCenter(bj)
      for (const off of [-11, 11]) {
        lamps.push({ x: cx + off, z: cz - 21.6, rot: Math.PI }, { x: cx + off, z: cz + 21.6, rot: 0 })
        lamps.push({ x: cx - 21.6, z: cz + off, rot: -Math.PI / 2 }, { x: cx + 21.6, z: cz + off, rot: Math.PI / 2 })
      }
    }
  }
  for (const l of lamps) colliders.push({ minX: l.x - 0.15, maxX: l.x + 0.15, minZ: l.z - 0.15, maxZ: l.z + 0.15 })

  // Beach palms
  for (let k = 0; k < 26; k++) {
    const z = -CITY_EDGE + 8 + (k / 26) * (CITY_EDGE * 2 - 16) + (rnd() - 0.5) * 8
    if (Math.abs(z - PIER.z) < 10) continue
    addPalm(CITY_EDGE + 10 + rnd() * 22, z)
  }

  // Keep stunt ramp run-ups and landings clear
  for (let k = palms.length - 1; k >= 0; k--) if (nearRampPath(palms[k].x, palms[k].z)) palms.splice(k, 1)
  for (let k = lamps.length - 1; k >= 0; k--) if (nearRampPath(lamps[k].x, lamps[k].z)) lamps.splice(k, 1)
  for (let k = colliders.length - 1; k >= 0; k--) {
    const c = colliders[k]
    if (c.maxX - c.minX < 1.2 && nearRampPath((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2)) colliders.splice(k, 1)
  }

  const insideBuilding = (x, z, pad) => colliders.some((c) => x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad)

  // Hidden neon tapes: tucked between buildings inside blocks, plus a couple of scenic spots
  const packages = []
  let guard = 0
  while (packages.length < 8 && guard++ < 2000) {
    const bi = Math.floor(rnd() * BLOCKS), bj = Math.floor(rnd() * BLOCKS)
    if (special.has(keyOf([bi, bj])) || PARKS.some((p) => keyOf(p) === keyOf([bi, bj]))) continue
    const x = blockCenter(bi) + (rnd() - 0.5) * 34
    const z = blockCenter(bj) + (rnd() - 0.5) * 34
    if (insideBuilding(x, z, 1.4)) continue
    if (packages.some((p) => Math.hypot(p.x - x, p.z - z) < 60)) continue
    packages.push({ x, z })
  }
  packages.push({ x: PIER.end - 4, z: PIER.z - 4 }, { x: BEACH_END - 6, z: CITY_EDGE - 6 })
  packages.forEach((p, k) => (p.id = `tape${k}`))

  // Pizza delivery addresses: sidewalk fronts of ordinary blocks
  const addresses = []
  for (let bi = 0; bi < BLOCKS; bi++) {
    for (let bj = 0; bj < BLOCKS; bj++) {
      if (special.has(keyOf([bi, bj])) || PARKS.some((p) => keyOf(p) === keyOf([bi, bj]))) continue
      const cx = blockCenter(bi), cz = blockCenter(bj)
      for (const [ox, oz] of [[0, -20.5], [0, 20.5], [-20.5, 0], [20.5, 0]]) {
        if (!insideBuilding(cx + ox, cz + oz, 0.8)) addresses.push({ x: cx + ox, z: cz + oz })
      }
    }
  }

  // Road graph nodes
  const nodes = []
  for (let i = 0; i <= BLOCKS; i++) for (let j = 0; j <= BLOCKS; j++) nodes.push({ i, j, x: roadCoord(i), z: roadCoord(j) })

  // Vehicles: player starter car, parked cars along curbs, traffic and a police pool.
  const vehicleSpawns = [{ role: 'parked', model: 'sport', color: '#e0218a', x: -6, z: 6, heading: Math.PI / 2 }]
  const parkedModels = ['sedan', 'sport', 'van', 'taxi', 'sedan', 'sport', 'sedan', 'van']
  const used = new Set()
  for (let k = 0; k < parkedModels.length; k++) {
    let i, j, horizontal
    do {
      i = Math.floor(rnd() * BLOCKS)
      j = Math.floor(rnd() * (BLOCKS + 1))
      horizontal = rnd() < 0.5
    } while (used.has(`${i},${j},${horizontal}`) || (i === 2 && j === 3))
    used.add(`${i},${j},${horizontal}`)
    const along = roadCoord(i) + PITCH / 2 + (rnd() - 0.5) * 20
    const side = rnd() < 0.5 ? 1 : -1
    const sp = horizontal
      ? { x: along, z: roadCoord(j) + side * 6, heading: side > 0 ? Math.PI / 2 : -Math.PI / 2 }
      : { x: roadCoord(j) - side * 6, z: along, heading: side > 0 ? 0 : Math.PI }
    vehicleSpawns.push({ role: 'parked', model: parkedModels[k], color: carColor(parkedModels[k], rnd), ...sp })
  }
  const trafficModels = ['sedan', 'taxi', 'sedan', 'van', 'sport', 'sedan', 'taxi', 'sedan', 'van', 'sedan']
  trafficModels.forEach((model) => vehicleSpawns.push({ role: 'traffic', model, color: carColor(model, rnd) }))
  for (let k = 0; k < 7; k++) vehicleSpawns.push({ role: 'police', model: 'police', color: '#14213d' })
  vehicleSpawns.push(
    { role: 'parked', model: 'bike', color: '#d01f2f', x: -17, z: 6, heading: Math.PI / 2 },
    { role: 'parked', model: 'bike', color: '#ff5a1f', x: blockCenter(3) + 12, z: roadCoord(4) + 6, heading: Math.PI / 2 },
    { role: 'parked', model: 'bike', color: '#18e5ff', x: CITY_EDGE + 8, z: 30, heading: 0 },
    { role: 'traffic', model: 'bike', color: '#1f1f24' },
    { role: 'traffic', model: 'bike', color: '#f5c518' },
    { role: 'parked', model: 'boat', color: '#f2f2f2', x: BEACH_END + 30, z: PIER.z + PIER.halfWidth + 3.6, heading: Math.PI / 2 },
    { role: 'parked', model: 'boat', color: '#1d4fd8', x: BEACH_END + 55, z: PIER.z - PIER.halfWidth - 3.6, heading: Math.PI / 2 },
  )

  // Pedestrians walk loops around block sidewalks
  const pedSpawns = []
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  for (let k = 0; k < 22; k++) {
    const female = rnd() < 0.45
    pedSpawns.push({
      bi: Math.floor(rnd() * BLOCKS),
      bj: Math.floor(rnd() * BLOCKS),
      t: rnd() * 168,
      dir: rnd() < 0.5 ? 1 : -1,
      speed: 1.2 + rnd() * 0.7,
      look: {
        female,
        skin: pick(['#f1c9a5', '#e0ac69', '#c68c63', '#a8714a', '#7a4a2e', '#f5d5bd']),
        shirt: pick(['#f2efe8', '#3b5b8c', '#c0392b', '#f2a7c3', '#2e8b7a', '#f5d76e', '#1f1f24', '#7fc8d6', '#ff8c69', '#9b7ed1']),
        pants: pick(female ? ['#2d3a5a', '#f2efe8', '#1f1f24', '#e86a8a', '#4a90d9'] : ['#2d3a5a', '#e9e4d8', '#3b3b3b', '#7a6a55', '#4a6fa5']),
        hair: pick(['#1c120c', '#3b2414', '#6b4423', '#c9a25a', '#2a2a2a', '#8a3b1e']),
        shoes: pick(['#f2f2f2', '#1a1a1a', '#6b3a1e', '#c0392b']),
        hairStyle: female ? pick(['long', 'bun', 'long']) : pick(['short', 'short', 'bald']),
        shorts: !female && rnd() < 0.35,
        skirt: female && rnd() < 0.4,
        glasses: rnd() < 0.25,
        longSleeves: rnd() < 0.25,
        jacket: !female && rnd() < 0.15 ? pick(['#e9e4d8', '#2b2b33', '#9ad0ff']) : undefined,
      },
    })
  }

  // Cash pickups along the roads
  const pickups = []
  for (let k = 0; k < 18; k++) {
    const i = Math.floor(rnd() * (BLOCKS + 1))
    const j = Math.floor(rnd() * BLOCKS)
    const along = roadCoord(j) + PITCH / 2 + (rnd() - 0.5) * 30
    const off = (rnd() - 0.5) * 6
    pickups.push(rnd() < 0.5 ? { x: roadCoord(i) + off, z: along } : { x: along, z: roadCoord(i) + off })
    pickups[k].value = [50, 100, 100, 200, 250][Math.floor(rnd() * 5)]
  }
  pickups.push({ x: 290, z: 3, value: 500 }) // end of the pier
  pickups.forEach((p) => (p.type = 'cash'))
  pickups.push(
    { type: 'smg', x: CITY_EDGE + 14, z: -40 },
    { type: 'smg', x: blockCenter(0) + 21, z: blockCenter(1) },
    { type: 'health', x: -45, z: -9.5 },
    { type: 'health', x: blockCenter(4) - 6, z: blockCenter(5) - 19 },
    { type: 'health', x: blockCenter(1) + 14, z: blockCenter(4) + 14 },
  )

  const lm = Object.fromEntries(landmarks.map((l) => [l.id, l]))
  return {
    buildings,
    colliders,
    palms,
    lamps,
    parks,
    landmarks,
    lm,
    nodes,
    vehicleSpawns,
    pedSpawns,
    pickups,
    packages,
    addresses,
    hotels,
    ramps: RAMPS,
    spawn: { x: -14, z: 2, heading: Math.PI / 2 },
    hospital: { x: lm.hospital.zone.x, z: lm.hospital.zone.z, heading: Math.PI },
    policeStation: { x: lm.police.zone.x, z: lm.police.zone.z, heading: 0 },
  }
}

export const CAR_PAINTS = {
  sport: ['#e0218a', '#1d4fd8', '#e65c00', '#1fb5d1', '#d4d6da', '#7d1fd1'],
  sedan: ['#15171c', '#ececee', '#5b6770', '#1f3a6b', '#7a0f1c', '#b9bec6', '#2f4a3a'],
  van: ['#22262d', '#f2f2f2', '#3d4f3a', '#6e7b85', '#8a6d4c'],
}

function carColor(model, rnd) {
  if (model === 'taxi') return '#f5c518'
  const list = CAR_PAINTS[model] || CAR_PAINTS.sedan
  return list[Math.floor(rnd() * list.length)]
}

export const WORLD = buildWorld()
