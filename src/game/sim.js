// Game simulation. Plain JS on a mutable state object `G`; the React/three layer only reads it.
import {
  WORLD, BLOCKS, PITCH, CITY_EDGE, BEACH_END, PIER, LANE,
  roadCoord, blockCenter, nearestNode, groundHeight, MISSIONS, DELIVERY, RACE, RAMPS,
} from './world'

export const MODELS = {
  sport: { w: 2.0, len: 4.4, maxSpeed: 42, accel: 21, brake: 34, turn: 2.4, health: 100 },
  sedan: { w: 1.95, len: 4.3, maxSpeed: 31, accel: 14, brake: 30, turn: 2.1, health: 110 },
  taxi: { w: 1.95, len: 4.3, maxSpeed: 32, accel: 15, brake: 30, turn: 2.1, health: 110 },
  van: { w: 2.1, len: 4.7, maxSpeed: 25, accel: 11, brake: 26, turn: 1.8, health: 140 },
  police: { w: 2.0, len: 4.4, maxSpeed: 39, accel: 19, brake: 34, turn: 2.3, health: 120 },
  bike: { w: 0.8, len: 2.1, maxSpeed: 45, accel: 24, brake: 32, turn: 2.9, health: 60, r: 0.55, off: 0.5, grip: 12 },
  boat: { w: 2.2, len: 5.6, maxSpeed: 34, accel: 11, brake: 8, turn: 1.5, health: 150, r: 1.25, off: 1.5, grip: 1.3, water: true },
}
const radius = (v) => MODELS[v.model].r ?? CAR_R
const isWater = (v) => !!MODELS[v.model].water

const WANTED_TH = [0, 1, 3, 6, 10, 15]
const START_CLOCK = 18 * 60 + 30 // golden hour
const DAY_SECONDS = 1440 // real seconds per in-game day (1 game minute per second)
const SUNRISE = 6
const SUNSET = 19.5
export const TOUR = ['about', 'projects', 'skills', 'education', 'contact']
const CAR_R = 1.15 // radius of each of the two circles approximating a car
const CAR_OFF = 1.15 // distance of those circles from the car centre
const PLAYER_R = 0.45
const PERIM = 20.3 // ped sidewalk loop half-size

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
const rand = (a, b) => a + Math.random() * (b - a)

// ---------------------------------------------------------------------------
// Setup

function createVehicle(spawn, id) {
  const m = MODELS[spawn.model]
  return {
    id,
    role: spawn.role,
    model: spawn.model,
    color: spawn.color,
    home: spawn,
    ai: spawn.role === 'police' ? 'inactive' : spawn.role,
    x: spawn.x ?? 0,
    z: spawn.z ?? 0,
    y: 0,
    heading: spawn.heading ?? 0,
    speed: 0,
    steer: 0,
    wheel: 0,
    health: m.health,
    fire: 0, // seconds on fire; explodes at 4
    wreck: false,
    fi: 0, fj: 0, ti: 0, tj: 0,
    stuckT: 0,
    reverseT: 0,
    blockT: 0,
    hitCd: 0,
    throttle: 0,
  }
}

export function createGame(save = null) {
  const W = WORLD
  const G = {
    t: 0,
    world: W,
    cash: save?.cash ?? 0,
    progress: {
      packages: new Set(save?.packages || []),
      stunts: new Set(save?.stunts || []),
      tourDone: !!save?.tourDone,
      best: save?.best || {},
    },
    tour: save?.tourDone ? null : { seen: new Set() },
    player: {
      x: W.spawn.x, y: 0, z: W.spawn.z, heading: W.spawn.heading,
      vy: 0, speed: 0, health: 100, vehicle: null, walk: 0, moving: 0, hurtCd: 0, down: false,
      weapon: 'pistol', weapons: { smg: 0 }, fireCd: 0, stunT: 0,
    },
    tracers: Array.from({ length: 24 }, () => ({ active: false, t: 0, a: [0, 0, 0], b: [0, 0, 0], cop: false })),
    heli: { active: false, falling: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0, tilt: 0, health: 0, shootT: 0, rotor: 0 },
    panic: { x: 0, z: 0, t: 0 },
    roadblockT: 0,
    lock: null,
    hitT: 0,
    slowmo: 0,
    vehicles: W.vehicleSpawns.map(createVehicle),
    peds: W.pedSpawns.map((s, k) => ({ ...s, id: k, state: 'walk', x: 0, y: 0, z: 0, heading: 0, vx: 0, vy: 0, vz: 0, spin: 0, downT: 0, walk: Math.random() * 6 })),
    pickups: W.pickups.map((p) => ({ ...p, active: true, respawn: 0 })),
    wanted: { points: 0, level: 0, unseen: 0, bust: 0, spawnT: 0, crimeCd: 0 },
    mission: null,
    missionsDone: save?.missionsDone || {},
    objective: null, // { x, z, r, kind }
    explosions: Array.from({ length: 6 }, () => ({ active: false, x: 0, y: 0, z: 0, t: 0 })),
    events: [],
    ui: { prompt: null, panel: null, paused: false, banner: null, bannerT: 0, toast: null, toastT: 0, big: null, bigT: 0, missionText: null, timer: null },
    deadT: 0,
    deadKind: null,
    freezeT: 0,
    env: {
      clock: START_CLOCK, // minutes since midnight
      elev: 0, // sun elevation (sin of its angle); < 0 at night
      night: 0, // 0 day .. 1 night
      sunDir: [1, 0.1, 0.3],
      lightDir: [0.6, 0.8, 0.25],
      rain: 0,
      rainTarget: 0,
      wet: 0,
      weatherT: 90,
      flash: 0,
      lightsOn: false,
    },
    weatherMode: 'dynamic',
  }
  G.vehicles.forEach((v) => {
    if (v.role === 'traffic') placeOnRandomLane(G, v, 0)
  })
  G.peds.forEach((p) => placePed(p))
  return G
}

function placeOnRandomLane(G, v, minDist) {
  const P = G ? playerPos(G) : { x: 0, z: 0 }
  for (let tries = 0; tries < 40; tries++) {
    const fi = Math.floor(Math.random() * (BLOCKS + 1))
    const fj = Math.floor(Math.random() * (BLOCKS + 1))
    const opts = neighbours(fi, fj)
    const [ti, tj] = opts[Math.floor(Math.random() * opts.length)]
    const dx = Math.sign(ti - fi), dz = Math.sign(tj - fj)
    const s = rand(10, PITCH - 15)
    const x = roadCoord(fi) + dx * s - dz * LANE
    const z = roadCoord(fj) + dz * s + dx * LANE
    if (Math.hypot(x - P.x, z - P.z) < minDist) continue
    if (G && G.vehicles.some((u) => u !== v && u.ai !== 'inactive' && Math.hypot(u.x - x, u.z - z) < 8)) continue
    Object.assign(v, { fi, fj, ti, tj, x, z, heading: Math.atan2(dx, dz), velAng: undefined, air: false, speed: 6, ai: 'traffic', wreck: false, fire: 0, health: MODELS[v.model].health, stuckT: 0, reverseT: 0, blockT: 0 })
    return true
  }
  return false
}

function resetVehicle(G, v) {
  if (v.role === 'traffic') {
    if (!placeOnRandomLane(G, v, 90)) v.ai = 'inactive'
  } else if (v.role === 'parked') {
    Object.assign(v, { x: v.home.x, z: v.home.z, heading: v.home.heading, velAng: undefined, air: false, speed: 0, ai: 'parked', wreck: false, fire: 0, health: MODELS[v.model].health })
  } else {
    Object.assign(v, { ai: 'inactive', wreck: false, fire: 0, speed: 0 })
  }
}

function neighbours(i, j) {
  const out = []
  if (i > 0) out.push([i - 1, j])
  if (i < BLOCKS) out.push([i + 1, j])
  if (j > 0) out.push([i, j - 1])
  if (j < BLOCKS) out.push([i, j + 1])
  return out
}

function pedPerimeterPos(p) {
  const cx = blockCenter(p.bi), cz = blockCenter(p.bj)
  const L = PERIM * 2
  const t = ((p.t % (L * 4)) + L * 4) % (L * 4)
  const k = Math.floor(t / L)
  const u = (t % L) - PERIM
  const back = p.dir < 0 ? Math.PI : 0
  if (k === 0) return [cx + u, cz - PERIM, Math.PI / 2 + back]
  if (k === 1) return [cx + PERIM, cz + u, 0 + back]
  if (k === 2) return [cx - u, cz + PERIM, -Math.PI / 2 + back]
  return [cx - PERIM, cz - u, Math.PI + back]
}

function placePed(p) {
  const [x, z, h] = pedPerimeterPos(p)
  p.x = x; p.z = z; p.heading = h; p.y = 0
}

export function playerPos(G) {
  return G.player.vehicle || G.player
}

function emit(G, type, data) {
  G.events.push({ type, ...data })
}

export function banner(G, text, secs = 3) {
  G.ui.banner = text
  G.ui.bannerT = secs
}

// ---------------------------------------------------------------------------
// Collision helpers

const push = { x: 0, z: 0, nx: 0, nz: 0, hit: false }

// Push a circle out of all static colliders and world bounds. Result left in `push`.
function resolveStatic(px, pz, r) {
  let x = px, z = pz
  push.hit = false
  push.nx = 0; push.nz = 0
  let best = 0
  for (const b of WORLD.colliders) {
    if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue
    const cx = clamp(x, b.minX, b.maxX), cz = clamp(z, b.minZ, b.maxZ)
    const dx = x - cx, dz = z - cz
    const d2 = dx * dx + dz * dz
    let nx, nz, pen
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2)
      if (d >= r) continue
      nx = dx / d; nz = dz / d; pen = r - d
    } else {
      const l = x - b.minX, rr = b.maxX - x, t = z - b.minZ, bb = b.maxZ - z
      const m = Math.min(l, rr, t, bb)
      if (m === l) { nx = -1; nz = 0; pen = l + r } else if (m === rr) { nx = 1; nz = 0; pen = rr + r } else if (m === t) { nx = 0; nz = -1; pen = t + r } else { nx = 0; nz = 1; pen = bb + r }
    }
    x += nx * pen; z += nz * pen
    if (pen > best) { best = pen; push.nx = nx; push.nz = nz }
    push.hit = true
  }
  // World bounds: city edges on three sides, the shoreline (except the pier) on the east.
  const lim = CITY_EDGE - r
  const bound = (nx, nz, pen) => {
    x += nx * pen; z += nz * pen
    if (pen > best) { best = pen; push.nx = nx; push.nz = nz }
    push.hit = true
  }
  if (x < -lim) bound(1, 0, -lim - x)
  if (z < -lim) bound(0, 1, -lim - z)
  if (z > lim) bound(0, -1, z - lim)
  if (x > BEACH_END - r) {
    const lat = Math.abs(z - PIER.z) - (PIER.halfWidth - r)
    const depth = x - (BEACH_END - r)
    if (lat > 0) {
      if (depth < lat) bound(-1, 0, depth)
      else bound(0, -Math.sign(z - PIER.z), lat)
    }
    if (x > PIER.end - r) bound(-1, 0, x - (PIER.end - r))
  }
  push.x = x - px
  push.z = z - pz
}

// Boats: stay on the ocean, out of the beach and off the pier.
const PIER_BOX = { minX: BEACH_END - 4, maxX: PIER.end, minZ: PIER.z - PIER.halfWidth, maxZ: PIER.z + PIER.halfWidth }
function resolveWater(px, pz, r) {
  let x = px, z = pz
  push.hit = false
  let best = 0
  const bound = (nx, nz, pen) => {
    x += nx * pen; z += nz * pen
    if (pen > best) { best = pen; push.nx = nx; push.nz = nz }
    push.hit = true
  }
  const shore = BEACH_END + 3 + r
  if (x < shore) bound(1, 0, shore - x)
  if (x > BEACH_END + 450) bound(-1, 0, x - BEACH_END - 450)
  if (Math.abs(z) > 450) bound(0, -Math.sign(z), Math.abs(z) - 450)
  const b = PIER_BOX
  if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) {
    const cx = clamp(x, b.minX, b.maxX), cz = clamp(z, b.minZ, b.maxZ)
    const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz)
    if (d > 1e-6 && d < r) bound(dx / d, dz / d, r - d)
    else if (d <= 1e-6) {
      const up = b.maxZ - z, down = z - b.minZ
      if (up < down) bound(0, 1, up + r)
      else bound(0, -1, down + r)
    }
  }
  push.x = x - px
  push.z = z - pz
}

function carCircles(v) {
  const off = MODELS[v.model].off ?? CAR_OFF
  const fx = Math.sin(v.heading) * off, fz = Math.cos(v.heading) * off
  return [[v.x + fx, v.z + fz], [v.x - fx, v.z - fz]]
}

// Returns impact speed against walls.
function collideCarStatic(v) {
  let impact = 0
  const r = radius(v)
  for (const [cx, cz] of carCircles(v)) {
    if (isWater(v)) resolveWater(cx, cz, r)
    else resolveStatic(cx, cz, r)
    if (!push.hit) continue
    v.x += push.x; v.z += push.z
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
    const dot = (fx * push.nx + fz * push.nz) * Math.sign(v.speed)
    if (dot < 0) {
      impact = Math.max(impact, Math.abs(v.speed) * -dot)
      if (-dot > 0.75) v.speed = -v.speed * 0.25
      else v.speed *= 1 + dot * 0.6
    }
  }
  return impact
}

// ---------------------------------------------------------------------------
// Vehicles

let wetness = 0

function drive(v, dt, throttle, steer, handbrake) {
  const m = MODELS[v.model]
  if (v.air) {
    // airborne: no grip, just ballistic motion
    v.x += Math.sin(v.velAng ?? v.heading) * v.speed * dt
    v.z += Math.cos(v.velAng ?? v.heading) * v.speed * dt
    v.wheel += (v.speed * dt) / 0.38
    v.throttle = throttle
    return
  }
  const sp = v.speed
  if (throttle > 0) {
    if (sp < -0.5) v.speed += m.brake * throttle * dt
    else v.speed += m.accel * throttle * dt * (1 - (Math.max(0, sp) / m.maxSpeed) * 0.6)
  } else if (throttle < 0) {
    if (sp > 0.5) v.speed += m.brake * throttle * dt
    else v.speed += m.accel * 0.6 * throttle * dt
  } else {
    const roll = 5 * dt
    v.speed = Math.abs(sp) <= roll ? 0 : sp - Math.sign(sp) * roll
  }
  if (handbrake) v.speed *= Math.max(0, 1 - 2.2 * dt)
  v.speed = clamp(v.speed, -m.maxSpeed * 0.35, m.maxSpeed)
  v.steer += (steer - v.steer) * Math.min(1, 7 * dt)
  const s = Math.abs(v.speed)
  const grip = clamp(s / 6, 0, 1) * (1 - 0.45 * clamp(s / m.maxSpeed, 0, 1)) * (1 - wetness * 0.18)
  const turn = v.steer * m.turn * grip * (handbrake ? 1.5 : 1) * (v.speed < 0 ? -1 : 1)
  v.heading = wrap(v.heading - turn * dt)
  // The direction of travel lags behind where the car points: barely for normal driving,
  // a lot with the handbrake (drifting) and on water.
  if (v.velAng === undefined || s < 1) v.velAng = v.heading
  const tyres = (m.grip ?? 9) * (handbrake && !m.water ? 0.22 : 1) * (1 - wetness * 0.3)
  v.velAng = wrap(v.velAng + wrap(v.heading - v.velAng) * Math.min(1, tyres * dt))
  v.slip = Math.abs(wrap(v.heading - v.velAng))
  if (v.slip > 0.25 && !m.water) v.speed *= 1 - v.slip * 0.5 * dt
  v.x += Math.sin(v.velAng) * v.speed * dt
  v.z += Math.cos(v.velAng) * v.speed * dt
  v.wheel += (v.speed * dt) / 0.38
  v.throttle = throttle
}

function steerTo(v, tx, tz) {
  const desired = Math.atan2(tx - v.x, tz - v.z)
  const diff = wrap(desired - v.heading)
  return { steer: clamp(-diff * 2.5, -1, 1), diff }
}

function obstacleAhead(G, v, range) {
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
  const check = (x, z, width) => {
    const rx = x - v.x, rz = z - v.z
    const ahead = rx * fx + rz * fz
    if (ahead <= 0 || ahead > range) return false
    return Math.abs(rx * fz - rz * fx) < width
  }
  for (const u of G.vehicles) {
    if (u === v || u.ai === 'inactive') continue
    // at crossings the lower id has right of way, so two cars never wait on each other
    const crossing = Math.abs(Math.sin(u.heading - v.heading)) > 0.7 && Math.abs(u.speed) > 0.5
    if (crossing && u.id > v.id && u.ai !== 'player') continue
    if (check(u.x, u.z, 2.1)) return true
  }
  const p = G.player
  if (!p.vehicle && check(p.x, p.z, 2)) return true
  return false
}

function aiTraffic(G, v, dt) {
  const dx = Math.sign(v.ti - v.fi), dz = Math.sign(v.tj - v.fj)
  const ax = roadCoord(v.fi) - dz * LANE, az = roadCoord(v.fj) + dx * LANE
  const s = (v.x - ax) * dx + (v.z - az) * dz
  if (s > PITCH - 6) {
    const opts = neighbours(v.ti, v.tj).filter(([i, j]) => i !== v.fi || j !== v.fj)
    const straight = opts.find(([i, j]) => i - v.ti === dx && j - v.tj === dz)
    const next = straight && Math.random() < 0.5 ? straight : opts[Math.floor(Math.random() * opts.length)]
    v.fi = v.ti; v.fj = v.tj; v.ti = next[0]; v.tj = next[1]
    return aiTraffic(G, v, dt)
  }
  const look = Math.min(PITCH, Math.max(s, 0) + 9)
  const { steer, diff } = steerTo(v, ax + dx * look, az + dz * look)
  const cruise = (v.role === 'police' ? 13 : 11) * (1 - Math.min(Math.abs(diff), 1) * 0.6)
  let throttle = clamp((cruise - v.speed) * 0.4, -1, 1)
  if (obstacleAhead(G, v, 7 + Math.max(0, v.speed) * 0.6)) {
    throttle = v.speed > 0.5 ? -1 : 0
    v.blockT += dt
    if (v.blockT > 2 && v.blockT - dt <= 2) emit(G, 'horn', { x: v.x, z: v.z })
    if (v.blockT > 6) { v.reverseT = 1.5; v.blockT = 0 }
  } else v.blockT = 0
  if (v.reverseT > 0) {
    v.reverseT -= dt
    return drive(v, dt, -0.7, -steer, false)
  }
  drive(v, dt, throttle, steer, false)
}

function aiPolice(G, v, dt) {
  const P = playerPos(G)
  const pv = G.player.vehicle
  const dist = Math.hypot(P.x - v.x, P.z - v.z)
  let tx, tz
  if (dist < 40) {
    const lead = pv ? Math.min(dist / 30, 1) * 0.7 : 0
    tx = P.x + (pv ? Math.sin(pv.heading) * pv.speed * lead : 0)
    tz = P.z + (pv ? Math.cos(pv.heading) * pv.speed * lead : 0)
  } else {
    const [pi, pj] = nearestNode(P.x, P.z)
    if (Math.hypot(roadCoord(v.ti) - v.x, roadCoord(v.tj) - v.z) < 9) {
      const ci = v.ti, cj = v.tj
      if (ci === pi && cj === pj) { tx = P.x; tz = P.z }
      else if (ci !== pi && (Math.abs(pi - ci) >= Math.abs(pj - cj) || cj === pj)) v.ti = ci + Math.sign(pi - ci)
      else v.tj = cj + Math.sign(pj - cj)
    }
    if (tx === undefined) { tx = roadCoord(v.ti); tz = roadCoord(v.tj) }
  }
  const { steer, diff } = steerTo(v, tx, tz)
  let throttle = 1
  let hb = false
  if (Math.abs(diff) > 1.1 && v.speed > 14) { throttle = -0.6; hb = Math.abs(diff) > 1.4 }
  if (!pv && dist < 18) throttle = v.speed > 3 + dist * 0.25 ? -1 : 0.3
  else if (dist < 7 && Math.abs(pv.speed) < 4) throttle = v.speed > 2 ? -1 : 0.2

  if (v.reverseT > 0) {
    v.reverseT -= dt
    return drive(v, dt, -1, -steer, false)
  }
  if (throttle > 0.5 && Math.abs(v.speed) < 1.5) {
    v.stuckT += dt
    if (v.stuckT > 1.2) { v.reverseT = 1.1; v.stuckT = 0 }
  } else v.stuckT = 0
  drive(v, dt, throttle, steer, hb)
}

function laneFromHeading(v) {
  const [i, j] = nearestNode(v.x, v.z)
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
  let best = null, bestDot = -Infinity
  for (const [ni, nj] of neighbours(i, j)) {
    const d = (ni - i) * fx + (nj - j) * fz
    if (d > bestDot) { bestDot = d; best = [ni, nj] }
  }
  v.fi = i; v.fj = j; v.ti = best[0]; v.tj = best[1]
}

function damageVehicle(G, v, amount) {
  if (v.wreck) return
  v.health -= amount
  if (v.health <= 0 && v.fire === 0) {
    v.health = 0
    v.fire = 0.001
  }
}

function explode(G, x, z) {
  const e = G.explosions.find((e) => !e.active) || G.explosions[0]
  Object.assign(e, { active: true, x, y: 1, z, t: 0 })
  emit(G, 'explosion', { x, z })
  const p = G.player
  if (!p.vehicle && Math.hypot(p.x - x, p.z - z) < 7) hurtPlayer(G, 60)
  for (const u of G.vehicles) {
    if (u.ai === 'inactive' || u.wreck) continue
    const d = Math.hypot(u.x - x, u.z - z)
    if (d > 0.1 && d < 8) damageVehicle(G, u, 45)
  }
  for (const ped of G.peds) {
    if (ped.state === 'walk' && Math.hypot(ped.x - x, ped.z - z) < 7) knockPed(G, ped, (ped.x - x) * 2, (ped.z - z) * 2, false)
  }
}

// ---------------------------------------------------------------------------
// Stunt ramps & airtime

function rampLocal(r, x, z) {
  const dx = Math.sin(r.heading), dz = Math.cos(r.heading)
  const rx = x - r.x, rz = z - r.z
  return [rx * dx + rz * dz, Math.abs(rx * dz - rz * dx)]
}

function updateAir(G, v, dt, px, pz) {
  const ground = groundHeight(v.x, v.z)
  if (v.air) {
    v.vy -= 22 * dt
    v.y += v.vy * dt
    v.airT += dt
    v.pitch = clamp(-Math.atan2(v.vy, Math.max(4, Math.abs(v.speed))) * 0.8, -0.5, 0.5)
    if (v.y > ground) return
    // landing
    v.y = ground
    v.air = false
    const hard = -v.vy
    v.vy = 0
    v.pitch = 0
    v.speed *= 0.85
    if (hard > 12) damageVehicle(G, v, (hard - 12) * 3)
    if (v === G.player.vehicle) {
      emit(G, 'land', { power: hard })
      if (v.model === 'bike' && hard > 16) ejectRider(G, v, hard)
      if (v.jump) stuntReward(G, v)
    }
    v.jump = null
    return
  }
  let lift = 0
  for (const r of RAMPS) {
    const [along, lat] = rampLocal(r, v.x, v.z)
    if (lat > r.w / 2) continue
    const align = Math.cos(v.heading - r.heading) * Math.sign(v.speed)
    if (along >= 0 && along <= r.len && align > 0.5) lift = Math.max(lift, (r.h * along) / r.len)
    const [prev] = rampLocal(r, px, pz)
    if (prev <= r.len && along > r.len && align > 0.6 && Math.abs(v.speed) > 14) {
      v.air = true
      v.airT = 0
      v.vy = Math.abs(v.speed) * 0.33
      v.y = ground + r.h
      v.velAng = v.heading
      v.jump = { ramp: r.id, x: v.x, z: v.z }
      if (v === G.player.vehicle) {
        G.slowmo = 1.1
        emit(G, 'jump', {})
      }
      return
    }
  }
  v.y = ground + lift
  v.pitch = lift > 0 ? -0.2 : 0
}

function stuntReward(G, v) {
  const j = v.jump
  const dist = Math.hypot(v.x - j.x, v.z - j.z)
  if (dist < 6) return
  const unique = !G.progress.stunts.has(j.ramp)
  let reward = Math.round(dist * 6 + v.airT * 50)
  if (unique) {
    reward *= 3
    G.progress.stunts.add(j.ramp)
    G.ui.big = 'UNIQUE STUNT BONUS!'
    G.ui.bigSub = `${Math.round(dist)}m · $${reward}  (${G.progress.stunts.size}/${RAMPS.length})`
    G.ui.bigT = 3.5
    emit(G, 'save', {})
  } else banner(G, `STUNT! ${Math.round(dist)}m  $${reward}`, 3)
  G.cash += reward
  emit(G, 'stunt', {})
}

// Thrown off a motorbike
function ejectRider(G, v, power) {
  const p = G.player
  if (p.vehicle !== v) return
  exitVehicle(G, true)
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
  p.x = v.x - fx * 1.4
  p.z = v.z - fz * 1.4
  resolveStatic(p.x, p.z, PLAYER_R)
  p.x += push.x; p.z += push.z
  p.stunT = 1.6
  hurtPlayer(G, Math.min(60, (power - 8) * 2.5))
  emit(G, 'hit', {})
}

function updateVehicles(G, dt, input) {
  const p = G.player
  for (const v of G.vehicles) {
    if (v.ai === 'inactive') continue
    const px = v.x, pz = v.z
    v.hitCd = Math.max(0, v.hitCd - dt)
    if (v.fire > 0 && !v.wreck) {
      v.fire += dt
      if (v.fire > 4) {
        v.wreck = true
        v.speed = 0
        v.wreckT = 0
        explode(G, v.x, v.z)
        if (p.vehicle === v) {
          exitVehicle(G, true)
          killPlayer(G, 'wasted')
        }
        if (v.ai === 'traffic' || v.ai === 'police') v.ai = 'parked'
      }
    }
    if (v.wreck) {
      v.wreckT += dt
      drive(v, dt, 0, 0, true)
      if (v.wreckT > 25 && distToPlayer(G, v) > 70) resetVehicle(G, v)
    } else if (v.ai === 'player') {
      const live = G.deadT <= 0 && G.freezeT <= 0
      drive(v, dt, live ? input.throttle : 0, live ? input.steer : 0, live && input.handbrake)
      if (G.freezeT > 0) v.speed = 0
    } else if (v.ai === 'traffic') aiTraffic(G, v, dt)
    else if (v.ai === 'police') {
      if (G.wanted.level > 0 && G.deadT <= 0) aiPolice(G, v, dt)
      else {
        laneFromHeading(v)
        v.ai = 'patrol'
      }
    } else if (v.ai === 'roadblock') {
      drive(v, dt, 0, 0, true)
      v.rbT += dt
      const d = distToPlayer(G, v)
      const P = playerPos(G)
      const pv = G.player.vehicle
      const behind = pv && (v.x - P.x) * Math.sin(pv.velAng ?? pv.heading) + (v.z - P.z) * Math.cos(pv.velAng ?? pv.heading) < -20
      if (G.wanted.level === 0 || v.rbT > 45 || d > 160) v.ai = d > 90 ? 'inactive' : 'parked'
      else if (behind) v.ai = 'police'
    } else if (v.ai === 'patrol') {
      if (G.wanted.level > 0) v.ai = 'police'
      else {
        aiTraffic(G, v, dt)
        if (distToPlayer(G, v) > 110) v.ai = 'inactive'
      }
    } else {
      // parked / abandoned
      drive(v, dt, 0, 0, true)
      if (v.role !== 'parked' && distToPlayer(G, v) > 130) resetVehicle(G, v)
      else if (v.role === 'parked' && distToPlayer(G, v) > 130 && Math.hypot(v.x - v.home.x, v.z - v.home.z) > 2 && Math.hypot(p.x - v.home.x, p.z - v.home.z) > 130) resetVehicle(G, v)
    }

    const impact = collideCarStatic(v)
    if (impact > 8) {
      damageVehicle(G, v, (impact - 8) * 1.5)
      if (v.ai === 'player') {
        emit(G, 'crash', { power: impact })
        if (v.model === 'bike' && impact > 12) ejectRider(G, v, impact)
      }
    }
    if (isWater(v)) {
      v.y = -0.12 + Math.sin(G.t * 1.7 + v.id) * 0.07
      v.pitch = -Math.min(0.12, Math.abs(v.speed) * 0.004)
    } else updateAir(G, v, dt, px, pz)
  }

  // Car vs car
  const vs = G.vehicles
  for (let a = 0; a < vs.length; a++) {
    const A = vs[a]
    if (A.ai === 'inactive') continue
    for (let b = a + 1; b < vs.length; b++) {
      const B = vs[b]
      if (B.ai === 'inactive' || isWater(A) !== isWater(B) || A.air || B.air) continue
      const ddx = B.x - A.x, ddz = B.z - A.z
      if (ddx * ddx + ddz * ddz > 64) continue
      const rr = radius(A) + radius(B)
      let impact = 0
      for (const [ax, az] of carCircles(A)) {
        for (const [bx, bz] of carCircles(B)) {
          const dx = bx - ax, dz = bz - az
          const d = Math.hypot(dx, dz)
          if (d >= rr || d < 1e-5) continue
          const nx = dx / d, nz = dz / d, pen = rr - d
          const wA = A.ai === 'player' ? 0.35 : 0.5
          A.x -= nx * pen * wA; A.z -= nz * pen * wA
          B.x += nx * pen * (1 - wA); B.z += nz * pen * (1 - wA)
          const fax = Math.sin(A.heading), faz = Math.cos(A.heading)
          const fbx = Math.sin(B.heading), fbz = Math.cos(B.heading)
          const va = A.speed * (fax * nx + faz * nz)
          const vb = B.speed * (fbx * nx + fbz * nz)
          const rel = va - vb
          if (rel > 0) {
            impact = Math.max(impact, rel)
            A.speed -= rel * 0.55 * (fax * nx + faz * nz)
            B.speed += rel * 0.55 * (fbx * nx + fbz * nz)
          }
        }
      }
      if (impact > 6 && A.hitCd === 0 && B.hitCd === 0) {
        A.hitCd = B.hitCd = 0.5
        damageVehicle(G, A, (impact - 5) * 1.8)
        damageVehicle(G, B, (impact - 5) * 1.8)
        const playerCar = p.vehicle === A ? A : p.vehicle === B ? B : null
        if (playerCar) {
          emit(G, 'crash', { power: impact })
          if (playerCar.model === 'bike' && impact > 10) ejectRider(G, playerCar, impact)
          const other = playerCar === A ? B : A
          if (other.role === 'police' && other.ai !== 'parked' && G.wanted.crimeCd <= 0) addCrime(G, 2)
        }
      }
    }
  }
}

function distToPlayer(G, v) {
  const P = playerPos(G)
  return Math.hypot(P.x - v.x, P.z - v.z)
}

// ---------------------------------------------------------------------------
// Player

function updatePlayer(G, dt, input) {
  const p = G.player
  p.hurtCd = Math.max(0, p.hurtCd - dt)
  if (p.vehicle) {
    const v = p.vehicle
    p.x = v.x; p.z = v.z; p.heading = v.heading; p.y = v.y
    return
  }
  if (p.stunT > 0) p.stunT -= dt
  const live = G.deadT <= 0 && !(p.stunT > 0)
  const turn = live ? input.steer : 0
  const fwd = live ? input.walk ?? input.throttle : 0
  p.heading = wrap(p.heading - turn * 3 * dt)
  const run = input.sprint ? 8 : 4.6
  const target = fwd > 0 ? fwd * run : fwd * 2.5
  p.speed += (target - p.speed) * Math.min(1, 10 * dt)
  p.x += Math.sin(p.heading) * p.speed * dt
  p.z += Math.cos(p.heading) * p.speed * dt
  p.moving = Math.abs(p.speed) > 0.3 || Math.abs(turn) > 0.1 ? 1 : 0
  p.walk += dt * (Math.abs(p.speed) * 2.2 + (Math.abs(turn) > 0.1 ? 4 : 0))

  const ground = groundHeight(p.x, p.z)
  if (live && input.jump && p.y <= ground + 0.01) p.vy = 6.5
  p.vy -= 20 * dt
  p.y += p.vy * dt
  if (p.y <= ground) { p.y = ground; p.vy = 0 }

  resolveStatic(p.x, p.z, PLAYER_R)
  p.x += push.x; p.z += push.z

  // Cars push the player and hurt them when moving fast
  for (const v of G.vehicles) {
    if (v.ai === 'inactive') continue
    if (isWater(v) || v.air) continue
    for (const [cx, cz] of carCircles(v)) {
      const dx = p.x - cx, dz = p.z - cz
      const d = Math.hypot(dx, dz)
      const min = radius(v) + PLAYER_R
      if (d >= min || d < 1e-5) continue
      p.x += (dx / d) * (min - d); p.z += (dz / d) * (min - d)
      if (Math.abs(v.speed) > 7 && p.hurtCd === 0) {
        hurtPlayer(G, (Math.abs(v.speed) - 5) * 4)
        p.hurtCd = 1
        emit(G, 'hit', {})
      }
    }
  }
}

function hurtPlayer(G, amount) {
  const p = G.player
  if (G.deadT > 0) return
  p.health = Math.max(0, p.health - amount)
  if (p.health <= 0) killPlayer(G, 'wasted')
}

// boats sit beside the pier, so they can be boarded from a bit further away
const reach = (v) => (isWater(v) ? 6.5 : 4)

function enterVehicle(G) {
  const p = G.player
  let best = null, bestD = Infinity
  for (const v of G.vehicles) {
    if (v.ai === 'inactive' || v.wreck) continue
    const d = Math.hypot(v.x - p.x, v.z - p.z)
    if (d < reach(v) && d < bestD) { best = v; bestD = d }
  }
  if (!best) return false
  if (best.ai === 'traffic') { addCrime(G, 1); emit(G, 'jack', {}) }
  if (best.ai === 'police' || best.ai === 'patrol') addCrime(G, 2)
  best.ai = 'player'
  p.vehicle = best
  p.speed = 0
  emit(G, 'enter', {})
  return true
}

function exitVehicle(G, force) {
  const p = G.player
  const v = p.vehicle
  if (!v) return
  if (!force && Math.abs(v.speed) > 9) return
  if (isWater(v)) {
    // step off onto the pier or the beach
    const nearPier = v.x > BEACH_END - 4 && v.x < PIER.end && Math.abs(v.z - PIER.z) < PIER.halfWidth + 6
    if (nearPier) {
      p.x = clamp(v.x, BEACH_END, PIER.end - 2)
      p.z = PIER.z + Math.sign(v.z - PIER.z || 1) * (PIER.halfWidth - 1)
    } else if (v.x < BEACH_END + 12 || force) {
      p.x = BEACH_END - 2
      p.z = clamp(v.z, -CITY_EDGE + 3, CITY_EDGE - 3)
    } else {
      banner(G, 'Get closer to the pier or the beach to get off', 2)
      return
    }
    p.vehicle = null
    v.ai = 'parked'
    v.speed = 0
    p.y = 0
    p.heading = v.heading
    p.speed = 0
    emit(G, 'exit', {})
    return
  }
  p.vehicle = null
  if (!v.wreck) v.ai = 'parked'
  const lx = Math.cos(v.heading), lz = -Math.sin(v.heading)
  const side = v.model === 'bike' ? 1.1 : 2.1
  p.x = v.x + lx * side
  p.z = v.z + lz * side
  p.y = v.y
  p.heading = v.heading
  p.speed = 0
  resolveStatic(p.x, p.z, PLAYER_R)
  p.x += push.x; p.z += push.z
  emit(G, 'exit', {})
}

export function nearestEnterable(G) {
  const p = G.player
  if (p.vehicle) return null
  for (const v of G.vehicles) {
    if (v.ai === 'inactive' || v.wreck) continue
    if (Math.hypot(v.x - p.x, v.z - p.z) < reach(v)) return v
  }
  return null
}

function killPlayer(G, kind) {
  if (G.deadT > 0) return
  G.deadT = 4.5
  G.deadKind = kind
  const hadMission = !!G.mission
  if (hadMission) endMission(G)
  G.ui.big = kind === 'wasted' ? 'WASTED' : 'BUSTED'
  G.ui.bigSub = hadMission ? 'Mission failed' : null
  G.ui.bigT = 4.5
  emit(G, kind, {})
}

function respawn(G) {
  const p = G.player
  if (p.vehicle) exitVehicle(G, true)
  const sp = G.deadKind === 'wasted' ? G.world.hospital : G.world.policeStation
  const fee = G.deadKind === 'wasted' ? Math.min(G.cash, 100) : Math.floor(G.cash * 0.1)
  G.cash -= fee
  Object.assign(p, { x: sp.x, z: sp.z, y: 0, heading: sp.heading, health: 100, speed: 0, vy: 0 })
  setWanted(G, 0)
  for (const v of G.vehicles) if (v.role === 'police' && v.ai !== 'parked') v.ai = 'inactive'
  G.heli.active = false
  G.heli.falling = false
  p.stunT = 0
  if (fee > 0) banner(G, `${G.deadKind === 'wasted' ? 'Hospital bill' : 'Bail'}: -$${fee}`, 3)
  G.deadKind = null
}

// ---------------------------------------------------------------------------
// Pedestrians

function knockPed(G, ped, vx, vz, byPlayer, vy) {
  ped.state = 'down'
  ped.vx = vx; ped.vz = vz
  ped.vy = vy ?? 4 + Math.hypot(vx, vz) * 0.12
  ped.spin = (Math.random() - 0.5) * 12
  ped.downT = 0
  emit(G, 'hit', {})
  if (byPlayer) addCrime(G, 1)
}

function updatePeds(G, dt) {
  const p = G.player
  const P = playerPos(G)
  for (const ped of G.peds) {
    if (ped.state === 'walk') {
      const gunfire = G.panic.t > 0 && Math.hypot(ped.x - G.panic.x, ped.z - G.panic.z) < 35
      const panic = gunfire || (G.wanted.level > 0 && Math.hypot(ped.x - P.x, ped.z - P.z) < 25)
      if (panic && !ped.fleeing) {
        // run whichever way along the sidewalk leads away from the threat
        const th = gunfire ? G.panic : P
        const t0 = ped.t
        ped.t = t0 + 1
        const [x1, z1] = pedPerimeterPos(ped)
        ped.t = t0 - 1
        const [x2, z2] = pedPerimeterPos(ped)
        ped.t = t0
        ped.dir = Math.hypot(x1 - th.x, z1 - th.z) > Math.hypot(x2 - th.x, z2 - th.z) ? 1 : -1
      }
      ped.fleeing = panic
      ped.gait = panic ? 1.8 : 1
      ped.t += ped.dir * ped.speed * (panic ? 2.4 : 1) * dt
      ped.walk += dt * ped.speed * (panic ? 5 : 2.4)
      placePed(ped)
      ped.y = groundHeight(ped.x, ped.z)
      for (const v of G.vehicles) {
        if (v.ai === 'inactive' || Math.abs(v.speed) < 2 || isWater(v) || v.air) continue
        if (Math.abs(v.x - ped.x) > 4 || Math.abs(v.z - ped.z) > 4) continue
        const hit = carCircles(v).some(([cx, cz]) => Math.hypot(cx - ped.x, cz - ped.z) < radius(v) + 0.35)
        if (!hit) continue
        if (Math.abs(v.speed) > 5) {
          const fx = Math.sin(v.heading), fz = Math.cos(v.heading)
          knockPed(G, ped, fx * v.speed * 0.7 + rand(-2, 2), fz * v.speed * 0.7 + rand(-2, 2), v === p.vehicle)
          break
        }
      }
    } else {
      ped.downT += dt
      if (ped.y > 0 || ped.vy > 0) {
        ped.vy -= 20 * dt
        ped.y += ped.vy * dt
        ped.x += ped.vx * dt
        ped.z += ped.vz * dt
        if (ped.y <= 0) { ped.y = 0; ped.vy = 0 }
      } else {
        ped.vx *= Math.max(0, 1 - 6 * dt)
        ped.vz *= Math.max(0, 1 - 6 * dt)
        ped.x += ped.vx * dt
        ped.z += ped.vz * dt
      }
      if ((ped.downT > 7 && Math.hypot(ped.x - P.x, ped.z - P.z) > 40) || ped.downT > 25) {
        ped.bi = Math.floor(Math.random() * BLOCKS)
        ped.bj = Math.floor(Math.random() * BLOCKS)
        ped.t = Math.random() * PERIM * 8
        ped.state = 'walk'
        placePed(ped)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Wanted level & police

export function setWanted(G, level) {
  const W = G.wanted
  W.level = level
  W.points = WANTED_TH[level]
  W.unseen = 0
  W.bust = 0
}

function addCrime(G, pts) {
  const W = G.wanted
  const before = W.level
  W.points = Math.min(W.points + pts, 30)
  let lvl = 0
  for (let k = 0; k < WANTED_TH.length; k++) if (W.points >= WANTED_TH[k]) lvl = k
  W.level = Math.max(W.level, lvl)
  W.unseen = 0
  W.crimeCd = 2
  if (W.level > before) emit(G, 'wantedUp', {})
}

function spawnCop(G) {
  const v = G.vehicles.find((u) => u.role === 'police' && u.ai === 'inactive')
  if (!v) return
  const P = playerPos(G)
  const cands = G.world.nodes.filter((n) => {
    const d = Math.hypot(n.x - P.x, n.z - P.z)
    return d > 75 && d < 150
  })
  const pool = cands.length ? cands : G.world.nodes.filter((n) => Math.hypot(n.x - P.x, n.z - P.z) > 50)
  const n = pool[Math.floor(Math.random() * pool.length)]
  if (!n) return
  if (G.vehicles.some((u) => u !== v && u.ai !== 'inactive' && Math.hypot(u.x - n.x, u.z - n.z) < 6)) return
  Object.assign(v, {
    x: n.x, z: n.z, ti: n.i, tj: n.j, heading: Math.atan2(P.x - n.x, P.z - n.z), velAng: undefined, air: false, speed: 8,
    ai: 'police', wreck: false, fire: 0, health: MODELS.police.health, stuckT: 0, reverseT: 0,
  })
}

function updateWanted(G, dt) {
  const W = G.wanted
  W.crimeCd = Math.max(0, W.crimeCd - dt)
  const P = playerPos(G)
  const cops = G.vehicles.filter((v) => v.role === 'police' && (v.ai === 'police' || v.ai === 'roadblock'))
  if (W.level === 0) { W.bust = 0; return }

  // From two stars the police open fire
  if (W.level >= 2 && G.deadT <= 0) {
    for (const v of cops) {
      if (v.wreck || Math.hypot(v.x - P.x, v.z - P.z) > 32) continue
      v.shootT = (v.shootT ?? 1) - dt
      if (v.shootT > 0) continue
      v.shootT = [0, 0, 1.7, 1.3, 1.0, 0.75][W.level] * (0.7 + Math.random() * 0.6)
      if (rayFrac(v.x, v.z, P.x, P.z) < 0.98) continue
      copShoot(G, v.x, v.y + 1.3, v.z)
    }
  }
  // From three stars they set up roadblocks ahead of you
  G.roadblockT -= dt
  if (W.level >= 3 && G.player.vehicle && Math.abs(G.player.vehicle.speed) > 8 && G.roadblockT <= 0) {
    G.roadblockT = placeRoadblock(G) ? 25 : 3
  }

  const seen = cops.some((v) => Math.hypot(v.x - P.x, v.z - P.z) < 50)
  if (seen) W.unseen = 0
  else W.unseen += dt
  if (W.unseen > 8 + W.level * 2) {
    W.level -= 1
    W.points = WANTED_TH[W.level]
    W.unseen = 0
    emit(G, 'wantedDown', {})
  }

  const want = Math.min(5, W.level + (W.level >= 3 ? 1 : 0)) - cops.filter((v) => v.ai === 'roadblock').length
  W.spawnT -= dt
  if (cops.length < want && W.spawnT <= 0) {
    spawnCop(G)
    W.spawnT = 2.5
  }
  // Cops that got left far behind respawn closer
  for (const v of cops) if (distToPlayer(G, v) > 230) v.ai = 'inactive'

  // Busted: a cop right next to a stopped (or on-foot) player
  const pv = G.player.vehicle
  const slow = !pv || Math.abs(pv.speed) < 3
  const near = cops.some((v) => Math.hypot(v.x - P.x, v.z - P.z) < (pv ? 5.5 : 6.5) && Math.abs(v.speed) < 8)
  if (near && slow && G.deadT <= 0) {
    W.bust += dt
    if (W.bust > 1.6) killPlayer(G, 'busted')
  } else W.bust = Math.max(0, W.bust - dt)
}

// ---------------------------------------------------------------------------
// Weapons & combat

export const WEAPONS = {
  fists: { name: 'Fists', rate: 2.5 },
  pistol: { name: 'Pistol', rate: 3.2, dmg: 35, range: 45 },
  smg: { name: 'SMG', rate: 10, dmg: 15, range: 38 },
}
const WEAPON_ORDER = ['fists', 'pistol', 'smg']

// Buildings only: palms, lamps and fountains don't stop bullets
const BIG = WORLD.colliders.filter((c) => c.maxX - c.minX > 2 && c.maxZ - c.minZ > 2)

// Fraction (0..1) of the segment that is clear before it enters a building
export function rayFrac(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1
  let best = 1
  for (const b of BIG) {
    let t0 = 0, t1 = best
    if (Math.abs(dx) < 1e-9) {
      if (x1 < b.minX || x1 > b.maxX) continue
    } else {
      let a = (b.minX - x1) / dx, c = (b.maxX - x1) / dx
      if (a > c) [a, c] = [c, a]
      t0 = Math.max(t0, a)
      t1 = Math.min(t1, c)
      if (t0 > t1) continue
    }
    if (Math.abs(dz) < 1e-9) {
      if (z1 < b.minZ || z1 > b.maxZ) continue
    } else {
      let a = (b.minZ - z1) / dz, c = (b.maxZ - z1) / dz
      if (a > c) [a, c] = [c, a]
      t0 = Math.max(t0, a)
      t1 = Math.min(t1, c)
      if (t0 > t1) continue
    }
    if (t0 < best) best = t0
  }
  return best
}

function addTracer(G, a, b, cop) {
  const t = G.tracers.find((x) => !x.active) || G.tracers[0]
  t.active = true
  t.t = 0
  t.a = a
  t.b = b
  t.cop = cop
}

function acquireTarget(G, yaw, range, cone, includeCars) {
  const p = G.player
  let best = null
  let bestScore = Infinity
  const consider = (kind, obj, x, y, z, needLos = true) => {
    const dx = x - p.x, dz = z - p.z
    const d = Math.hypot(dx, dz)
    if (d > range || d < 0.6) return
    const ang = Math.abs(wrap(Math.atan2(dx, dz) - yaw))
    if (ang > cone) return
    const score = ang / cone + (d / range) * 0.5 - (kind === 'cop' || kind === 'heli' ? 0.25 : 0)
    if (score >= bestScore) return
    if (needLos && rayFrac(p.x, p.z, x, z) < 0.98) return
    best = { kind, obj, x, y, z, d }
    bestScore = score
  }
  for (const ped of G.peds) if (ped.state === 'walk') consider('ped', ped, ped.x, ped.y + 1.1, ped.z)
  for (const v of G.vehicles) {
    if (v.ai === 'inactive' || v.wreck || v === p.vehicle) continue
    const cop = v.role === 'police' && v.ai !== 'parked'
    if (cop || includeCars) consider(cop ? 'cop' : 'car', v, v.x, v.y + 0.9, v.z)
  }
  const h = G.heli
  if (h.active && !h.falling) consider('heli', h, h.x, h.y, h.z, false)
  return best
}

function applyHit(G, t, dmg, yaw) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw)
  if (t.kind === 'ped') knockPed(G, t.obj, fx * 2.5, fz * 2.5, true, 1.5)
  else if (t.kind === 'heli') {
    G.heli.health -= dmg
    if (G.heli.health <= 0) downHeli(G)
  } else {
    damageVehicle(G, t.obj, dmg * 0.6)
    if (t.kind === 'cop') addCrime(G, 0.5)
    else if (t.obj.ai === 'traffic') t.obj.blockT = 4
  }
}

function updateCombat(G, dt, input) {
  const p = G.player
  p.fireCd = Math.max(0, p.fireCd - dt)
  p.shootT = Math.max(0, (p.shootT || 0) - dt)
  G.hitT = Math.max(0, G.hitT - dt)
  G.ui.hurtT = Math.max(0, (G.ui.hurtT || 0) - dt)
  G.panic.t = Math.max(0, G.panic.t - dt)
  for (const t of G.tracers) if (t.active && (t.t += dt) > 0.09) t.active = false

  const owned = (w) => w !== 'smg' || p.weapons.smg > 0
  if (input.take('weapon1')) p.weapon = 'fists'
  if (input.take('weapon2')) p.weapon = 'pistol'
  if (input.take('weapon3') && owned('smg')) p.weapon = 'smg'
  if (input.take('weaponNext')) {
    let i = WEAPON_ORDER.indexOf(p.weapon)
    do i = (i + 1) % WEAPON_ORDER.length
    while (!owned(WEAPON_ORDER[i]))
    p.weapon = WEAPON_ORDER[i]
  }

  G.lock = null
  if (p.vehicle || G.deadT > 0 || p.stunT > 0) return
  const W = WEAPONS[p.weapon]
  const yaw = G.aiming ? G.camYaw : p.heading
  if (p.weapon !== 'fists') G.lock = acquireTarget(G, yaw, W.range, G.aiming ? 0.16 : 0.42, G.aiming)
  if (!input.fire || p.fireCd > 0) return
  p.fireCd = 1 / W.rate
  p.shootT = 0.15

  if (p.weapon === 'fists') {
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading)
    emit(G, 'punch', {})
    for (const ped of G.peds) {
      if (ped.state !== 'walk') continue
      const dx = ped.x - p.x, dz = ped.z - p.z
      if (Math.hypot(dx, dz) < 1.9 && dx * fx + dz * fz > 0.6) {
        knockPed(G, ped, fx * 2, fz * 2, true, 2)
        break
      }
    }
    return
  }

  const t = G.lock
  const ox = p.x + Math.sin(yaw) * 0.6, oz = p.z + Math.cos(yaw) * 0.6, oy = p.y + 1.35
  let end
  if (t && Math.random() < (G.aiming ? 0.93 : 0.78)) {
    end = [t.x, t.y, t.z]
    applyHit(G, t, W.dmg, yaw)
    G.hitT = 0.15
  } else {
    const a = (t ? Math.atan2(t.x - p.x, t.z - p.z) : yaw) + (Math.random() - 0.5) * (G.aiming ? 0.04 : 0.12)
    const range = t ? t.d + 4 : W.range
    let ex = p.x + Math.sin(a) * range, ez = p.z + Math.cos(a) * range
    const ey = t ? t.y : Math.max(0, oy - (G.aiming ? (G.camPitch || 0) * range * 0.5 : 0.2))
    const f = rayFrac(ox, oz, ex, ez)
    ex = ox + (ex - ox) * f
    ez = oz + (ez - oz) * f
    end = [ex, ey, ez]
  }
  addTracer(G, [ox, oy, oz], end, false)
  emit(G, 'shot', { weapon: p.weapon })
  if (p.weapon === 'smg' && --p.weapons.smg <= 0) p.weapon = 'pistol'

  // gunfire scares people and draws the police
  G.panic.x = p.x
  G.panic.z = p.z
  G.panic.t = 8
  const seen = G.peds.some((d) => d.state === 'walk' && Math.hypot(d.x - p.x, d.z - p.z) < 30) ||
    G.vehicles.some((v) => v.role === 'police' && v.ai !== 'inactive' && Math.hypot(v.x - p.x, v.z - p.z) < 50)
  if (seen) addCrime(G, 0.3)
}

function copShoot(G, x, y, z) {
  const P = playerPos(G)
  const pv = G.player.vehicle
  const fast = pv && Math.abs(pv.speed) > 18
  const hit = Math.random() < (fast ? 0.16 : 0.32) + G.wanted.level * 0.04
  const ty = pv ? P.y + 1 : P.y + 1.2
  const miss = hit ? 0 : 1.5 + Math.random() * 2
  const a = Math.random() * Math.PI * 2
  addTracer(G, [x, y, z], [P.x + Math.cos(a) * miss, ty, P.z + Math.sin(a) * miss], true)
  emit(G, 'copShot', { x, z })
  if (!hit) return
  if (pv) damageVehicle(G, pv, 4 + G.wanted.level)
  else {
    hurtPlayer(G, 5 + G.wanted.level)
    G.ui.hurtT = 0.35
  }
}

function placeRoadblock(G) {
  const pv = G.player.vehicle
  const P = playerPos(G)
  const fx = Math.sin(pv.velAng ?? pv.heading), fz = Math.cos(pv.velAng ?? pv.heading)
  const ahead = G.world.nodes
    .map((n) => ({ n, d: Math.hypot(n.x - P.x, n.z - P.z) }))
    .filter(({ n, d }) => d > 55 && d < 130 && ((n.x - P.x) * fx + (n.z - P.z) * fz) / d > 0.85)
    .sort((a, b) => a.d - b.d)
  const cops = G.vehicles.filter((u) => u.role === 'police' && u.ai === 'inactive').slice(0, 2)
  if (!ahead.length || cops.length < 2) return false
  const n = ahead[0].n
  const alongX = Math.abs(fx) > Math.abs(fz)
  const bx = n.x - (alongX ? Math.sign(fx) * 12 : 0)
  const bz = n.z - (alongX ? 0 : Math.sign(fz) * 12)
  cops.forEach((v, k) => {
    const off = k === 0 ? -2.9 : 2.9
    Object.assign(v, {
      x: bx + (alongX ? 0 : off), z: bz + (alongX ? off : 0),
      heading: (alongX ? 0 : Math.PI / 2) + (k ? Math.PI : 0), velAng: undefined, air: false,
      speed: 0, ai: 'roadblock', rbT: 0, wreck: false, fire: 0, health: MODELS.police.health, shootT: 1.5,
    })
  })
  banner(G, 'ROADBLOCK AHEAD!', 2.5)
  emit(G, 'wantedUp', {})
  return true
}

// Police helicopter from four stars
function updateHeli(G, dt) {
  const h = G.heli
  const W = G.wanted
  const P = playerPos(G)
  if (h.falling) {
    h.vy -= 9.8 * dt
    h.y += h.vy * dt
    h.x += h.vx * dt
    h.z += h.vz * dt
    h.heading += 4 * dt
    h.rotor += dt * 10
    if (h.y <= 1.5) {
      explode(G, h.x, h.z)
      h.falling = false
      h.active = false
    }
    return
  }
  if (!h.active) {
    if (W.level < 4 || G.deadT > 0) return
    const a = Math.random() * Math.PI * 2
    Object.assign(h, { active: true, x: P.x + Math.cos(a) * 160, z: P.z + Math.sin(a) * 160, y: 45, vx: 0, vz: 0, vy: 0, health: 260, shootT: 3, heading: 0 })
    banner(G, 'POLICE CHOPPER!', 2)
  }
  h.rotor += dt * 40
  const leaving = W.level < 4 || G.deadT > 0
  let tx, tz
  if (leaving) {
    tx = h.x + Math.sin(h.heading) * 200
    tz = h.z + Math.cos(h.heading) * 200
  } else {
    const a = G.t * 0.35
    tx = P.x + Math.cos(a) * 24
    tz = P.z + Math.sin(a) * 24
  }
  const dx = tx - h.x, dz = tz - h.z
  const d = Math.hypot(dx, dz) || 1
  const sp = Math.min(26, d * 0.8)
  h.vx += ((dx / d) * sp - h.vx) * Math.min(1, dt * 1.2)
  h.vz += ((dz / d) * sp - h.vz) * Math.min(1, dt * 1.2)
  h.x += h.vx * dt
  h.z += h.vz * dt
  h.y += ((leaving ? 70 : 28) - h.y) * Math.min(1, dt * 0.8)
  const face = leaving ? Math.atan2(h.vx, h.vz) : Math.atan2(P.x - h.x, P.z - h.z)
  h.heading = wrap(h.heading + wrap(face - h.heading) * Math.min(1, dt * 2))
  h.tilt = Math.min(0.3, Math.hypot(h.vx, h.vz) * 0.012)
  if (leaving) {
    if (Math.hypot(P.x - h.x, P.z - h.z) > 260) h.active = false
    return
  }
  if (Math.hypot(P.x - h.x, P.z - h.z) < 80) W.unseen = 0
  h.shootT -= dt
  if (h.shootT <= 0) {
    h.shootT = W.level >= 5 ? 1.3 : 2
    copShoot(G, h.x, h.y - 1.2, h.z)
  }
}

function downHeli(G) {
  const h = G.heli
  if (h.falling) return
  h.falling = true
  h.vy = 0
  addCrime(G, 2)
  banner(G, 'CHOPPER DOWN!', 2.5)
  emit(G, 'explosion', { x: h.x, z: h.z })
}

// ---------------------------------------------------------------------------
// Missions

function startMission(G, def) {
  G.mission = { id: def.id, def, stage: 0, t: 0, idx: 0 }
  banner(G, def.name, 3)
  emit(G, 'missionStart', {})
  if (def.id === 'heat') {
    setWanted(G, 3)
    G.mission.stage = 1
    G.ui.timer = 120
  }
  if (def.id === 'pizza') {
    const shop = def.giver
    const pool = G.world.addresses.filter((a) => Math.hypot(a.x - shop.x, a.z - shop.z) > 50)
    const list = []
    while (list.length < 4 && pool.length) {
      const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      if (list.every((b) => Math.hypot(a.x - b.x, a.z - b.z) > 45)) list.push(a)
    }
    G.mission.list = list
  }
  if (def.id === 'taxi') {
    G.mission.stage = 'pickup'
    G.mission.fares = 0
    G.mission.earned = 0
    G.mission.target = randomAddress(G, playerPos(G), 50, 170)
  }
}

function randomAddress(G, from, min, max) {
  const ok = G.world.addresses.filter((a) => {
    const d = Math.hypot(a.x - from.x, a.z - from.z)
    return d > min && d < max
  })
  const pool = ok.length ? ok : G.world.addresses
  return pool[Math.floor(Math.random() * pool.length)]
}

function passMission(G) {
  const def = G.mission.def
  G.cash += def.reward
  G.missionsDone[def.id] = true
  emit(G, 'save', {})
  G.ui.big = 'MISSION PASSED!'
  G.ui.bigSub = `$${def.reward}`
  G.ui.bigT = 4
  emit(G, 'missionPassed', {})
  endMission(G)
}

function failMission(G, reason) {
  G.ui.big = 'MISSION FAILED!'
  G.ui.bigSub = reason
  G.ui.bigT = 3.5
  emit(G, 'missionFailed', {})
  endMission(G)
}

function endMission(G) {
  G.mission = null
  G.objective = null
  G.ui.missionText = null
  G.ui.timer = null
  G.ui.counter = null
  G.freezeT = 0
}

function within(P, o, r) {
  return Math.hypot(P.x - o.x, P.z - o.z) < r
}

function updateMission(G, dt) {
  const m = G.mission
  if (!m) return
  const pv = G.player.vehicle
  const P = playerPos(G)
  m.t += dt
  if (G.ui.timer !== null && G.freezeT <= 0) {
    G.ui.timer = Math.max(0, G.ui.timer - dt)
    if (G.ui.timer === 0) {
      if (m.id === 'taxi') {
        banner(G, 'The fare got tired of waiting and jumped out!', 2.5)
        m.stage = 'pickup'
        m.target = randomAddress(G, P, 50, 170)
        G.ui.timer = null
        return
      }
      if (m.id === 'heat') return failMission(G, 'The heat never cooled down.')
      return failMission(G, 'Out of time!')
    }
  }

  if (m.id === 'delivery') {
    if (m.stage === 0) {
      G.objective = pv ? DELIVERY.pickup : null
      G.ui.missionText = pv ? 'Pick up the package at the end of the ~pier~.' : 'Get in a ~car~.'
      if (pv && within(P, DELIVERY.pickup, 6)) {
        m.stage = 1
        G.ui.timer = 75
        emit(G, 'checkpoint', {})
      }
    } else {
      G.objective = DELIVERY.drop
      G.ui.missionText = pv ? 'Deliver the package to the ~park~ before time runs out!' : 'Get back in a ~car~!'
      if (pv && within(P, DELIVERY.drop, 6)) passMission(G)
    }
  } else if (m.id === 'race') {
    if (m.stage === 0) {
      G.objective = RACE.start
      G.ui.missionText = pv ? 'Drive to the ~starting line~ on Ocean Drive.' : 'Get in a ~car~ and drive to the starting line.'
      if (pv && within(P, RACE.start, 6)) {
        m.stage = 1
        m.count = 3
        G.freezeT = 3
        emit(G, 'countdown', {})
        G.ui.missionText = 'Get ready...'
      }
    } else if (m.stage === 1) {
      const c = Math.ceil(G.freezeT)
      if (c !== m.count && c > 0) { m.count = c; emit(G, 'countdown', {}) }
      G.ui.banner = c > 0 ? String(c) : 'GO!'
      G.ui.bannerT = 0.6
      if (G.freezeT <= 0) {
        m.stage = 2
        m.idx = 0
        G.ui.timer = 95
        emit(G, 'go', {})
      }
    } else {
      const cp = RACE.checkpoints[m.idx]
      G.objective = { ...cp, kind: 'race' }
      G.ui.missionText = `Checkpoint ${m.idx + 1} / ${RACE.checkpoints.length}${pv ? '' : ' — get back in a ~car~!'}`
      if (pv && within(P, cp, 8)) {
        m.idx++
        emit(G, 'checkpoint', {})
        if (m.idx >= RACE.checkpoints.length) passMission(G)
      }
    }
  } else if (m.id === 'heat') {
    G.objective = null
    G.ui.missionText = 'The cops are onto you! ~Lose your wanted level~. (Tip: Neon Spray resprays your car.)'
    if (G.wanted.level === 0) passMission(G)
  } else if (m.id === 'pizza') {
    if (m.stage === 0) {
      G.objective = null
      G.ui.missionText = 'Hop on the ~scooter~ outside Pizza Bay (any vehicle works).'
      if (pv) {
        m.stage = 1
        m.idx = 0
        G.ui.timer = 50
      }
      return
    }
    const a = m.list[m.idx]
    G.objective = a
    G.ui.counter = `PIZZAS ${m.idx}/${m.list.length}`
    G.ui.missionText = 'Deliver the hot ~pizza~ before it gets cold!'
    const slow = !pv || Math.abs(pv.speed) < 7
    if (within(P, a, 4.5) && slow) {
      m.idx++
      emit(G, 'checkpoint', {})
      if (m.idx >= m.list.length) return passMission(G)
      G.ui.timer += 22
      banner(G, `Pizza delivered! +22s`, 2)
    }
  } else if (m.id === 'taxi') {
    if (!pv || pv.model !== 'taxi') {
      // leaving the cab ends the shift
      const earned = m.earned
      G.progress.best.taxi = Math.max(G.progress.best.taxi || 0, earned)
      G.ui.big = 'SHIFT OVER'
      G.ui.bigSub = `${m.fares} fares · $${earned}`
      G.ui.bigT = 3.5
      emit(G, 'save', {})
      return endMission(G)
    }
    G.ui.counter = `FARES ${m.fares} · $${m.earned}`
    const stopped = Math.abs(pv.speed) < 3
    if (m.stage === 'pickup') {
      G.objective = m.target
      G.ui.timer = null
      G.ui.missionText = 'Pick up the ~fare~ waiting on the sidewalk. Stop next to them.'
      if (within(P, m.target, 6) && stopped) {
        m.stage = 'drop'
        m.from = { x: P.x, z: P.z }
        m.target = randomAddress(G, P, 110, 280)
        const d = Math.hypot(m.target.x - P.x, m.target.z - P.z)
        G.ui.timer = Math.round(18 + d / 10)
        emit(G, 'checkpoint', {})
        banner(G, 'Fare picked up!', 1.5)
      }
    } else {
      G.objective = m.target
      G.ui.missionText = 'Take the fare to their ~destination~.'
      if (within(P, m.target, 6) && stopped) {
        const d = Math.hypot(m.target.x - m.from.x, m.target.z - m.from.z)
        const pay = Math.round(20 + d * 0.5 + (G.ui.timer || 0) * 2)
        G.cash += pay
        m.earned += pay
        m.fares++
        emit(G, 'cash', { value: pay })
        banner(G, `Fare paid  $${pay}`, 2)
        if (m.fares === 5 && !G.missionsDone.taxi) {
          G.missionsDone.taxi = true
          G.ui.big = 'TAXI MISSION COMPLETE!'
          G.ui.bigSub = '5 fares in one shift'
          G.ui.bigT = 3.5
          emit(G, 'missionPassed', {})
          emit(G, 'save', {})
        }
        m.stage = 'pickup'
        m.target = randomAddress(G, P, 50, 170)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Guided tour: points first-time visitors at each portfolio building in turn

function tourTarget(G) {
  if (!G.tour) return null
  const id = TOUR.find((t) => !G.tour.seen.has(t))
  return id ? G.world.lm[id] : null
}

function tourVisit(G, id) {
  if (!G.tour || G.tour.seen.has(id)) return
  G.tour.seen.add(id)
  if (!tourTarget(G)) {
    G.tour = null
    G.progress.tourDone = true
    G.cash += 250
    G.ui.big = 'TOUR COMPLETE!'
    G.ui.bigSub = 'Thanks for visiting  +$250'
    G.ui.bigT = 4
    emit(G, 'missionPassed', {})
  } else emit(G, 'checkpoint', {})
  emit(G, 'save', {})
}

export const PROGRESS_TOTALS = {
  get missions() {
    return MISSIONS.length
  },
  get packages() {
    return WORLD.packages ? WORLD.packages.length : 0
  },
  get stunts() {
    return WORLD.ramps ? WORLD.ramps.length : 0
  },
}

export function resetProgress(G) {
  G.cash = 0
  G.missionsDone = {}
  G.progress = { packages: new Set(), stunts: new Set(), tourDone: false, best: {} }
  G.tour = { seen: new Set() }
}

export function skipTour(G) {
  G.tour = null
  G.progress.tourDone = true
  if (!G.mission) G.objective = null
  G.ui.tourText = null
  emit(G, 'save', {})
}

function updateTour(G) {
  const l = tourTarget(G)
  if (!l) {
    G.ui.tourText = null
    return
  }
  const n = G.tour.seen.size + 1
  G.ui.tourText = `Tour ${n}/${TOUR.length}: visit ~${l.sign}~ and press E to see my ${l.title}.`
  if (!G.mission) G.objective = { x: l.zone.x, z: l.zone.z, kind: 'tour' }
}

// ---------------------------------------------------------------------------
// Interactions (E / F) and prompts

function updateInteractions(G, input) {
  const p = G.player
  const P = playerPos(G)
  const ui = G.ui
  ui.prompt = null
  if (G.deadT > 0) return

  if (input.take('enter')) {
    if (p.vehicle) exitVehicle(G, false)
    else enterVehicle(G)
  }

  const W = G.world
  const zone = W.landmarks.find((l) => l.title && within(P, l.zone, l.zone.r))
  const stopped = !p.vehicle || Math.abs(p.vehicle.speed) < 4
  const action = input.take('action')
  if (zone && stopped) {
    ui.prompt = `Press E to view ${zone.title}`
    if (action) {
      ui.panel = zone.id
      emit(G, 'panel', {})
      tourVisit(G, zone.id)
    }
    return
  }

  // Spray shop: drive in to lose your wanted level
  const spray = W.lm.spray.zone
  if (p.vehicle && within(P, spray, spray.r)) {
    if (G.wanted.level > 0 || p.vehicle.health < MODELS[p.vehicle.model].health) {
      if (G.cash >= 100) {
        G.cash -= 100
        setWanted(G, 0)
        p.vehicle.health = MODELS[p.vehicle.model].health
        p.vehicle.fire = 0
        p.vehicle.color = ['#e0218a', '#1d4fd8', '#f5c518', '#7d1fd1', '#18a058', '#15171c', '#ececee'][Math.floor(Math.random() * 7)]
        banner(G, 'Respray! -$100', 3)
        emit(G, 'spray', {})
      } else if (!ui.banner) banner(G, 'Respray costs $100', 2)
    }
  }

  if (!G.mission && p.vehicle?.model === 'taxi') {
    ui.prompt = 'Press E to start the Taxi job'
    if (action) startMission(G, MISSIONS.find((d) => d.id === 'taxi'))
    return
  }

  if (!G.mission) {
    const def = MISSIONS.find((d) => d.giver && within(P, d.giver, 3.2))
    if (def) {
      ui.prompt = `Press E to start mission: ${def.name}${G.missionsDone[def.id] ? ' (replay)' : ''}`
      if (action) startMission(G, def)
      return
    }
  }

  if (!p.vehicle) {
    const v = nearestEnterable(G)
    if (v) ui.prompt = `Press F to ${v.model === 'bike' ? 'ride the bike' : v.model === 'boat' ? 'board the boat' : 'enter the car'}`
  }
}

// ---------------------------------------------------------------------------
// Main step

// ---------------------------------------------------------------------------
// Time of day & weather

function updateEnv(G, dt) {
  const e = G.env
  e.clock = (e.clock + (dt * 1440) / DAY_SECONDS) % 1440
  const h = e.clock / 60
  // sun rises over the ocean (east, +x) and sets behind the city (west)
  const th = ((h - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI
  const sx = Math.cos(th), sy = Math.sin(th), sz = 0.3
  const len = Math.hypot(sx, sy, sz)
  e.sunDir = [sx / len, sy / len, sz / len]
  e.elev = sy / len
  e.night = clamp((0.06 - e.elev) / 0.2, 0, 1)
  if (e.elev > -0.02) {
    // sunlight, kept a little above the horizon so shadows stay sane
    const ly = Math.max(0.28, e.elev)
    const l = Math.hypot(sx, ly, sz)
    e.lightDir = [sx / l, ly / l, sz / l]
  } else {
    // moonlight from the opposite side of the sky
    const mx = -sx, my = Math.max(0.35, -sy), mz = -0.25
    const l = Math.hypot(mx, my, mz)
    e.lightDir = [mx / l, my / l, mz / l]
  }

  const mode = G.weatherMode
  if (mode === 'clear') e.rainTarget = 0
  else if (mode === 'rain') e.rainTarget = 1
  else if ((e.weatherT -= dt) <= 0) {
    e.rainTarget = Math.random() < 0.35 ? 0.6 + Math.random() * 0.4 : 0
    e.weatherT = 100 + Math.random() * 140
  }
  e.rain += clamp(e.rainTarget - e.rain, -dt / 12, dt / 12)
  // roads get wet quickly and dry slowly
  e.wet += e.rain > e.wet ? (e.rain - e.wet) * Math.min(1, dt / 6) : (e.rain - e.wet) * Math.min(1, dt / 40)
  wetness = e.wet
  e.flash = Math.max(0, e.flash - dt * 3)
  if (e.rain > 0.65 && Math.random() < dt * 0.06) {
    e.flash = 1
    emit(G, 'thunder', { delay: 0.4 + Math.random() * 2 })
  }
  e.lightsOn = e.night > 0.25 || e.rain > 0.4
}

export function step(G, dt, input) {
  if (G.ui.paused || G.ui.panel) return
  G.t += dt
  updateEnv(G, dt)
  if (G.freezeT > 0) G.freezeT -= dt
  if (G.deadT > 0) {
    G.deadT -= dt
    if (G.deadT <= 0) respawn(G)
  }

  updateVehicles(G, dt, input)
  updatePlayer(G, dt, input)
  updateCombat(G, dt, input)
  updatePeds(G, dt)

  const P = playerPos(G)
  for (const pk of G.pickups) {
    if (!pk.active) {
      pk.respawn -= dt
      if (pk.respawn <= 0) pk.active = true
      continue
    }
    if (pk.type === 'health' && G.player.health >= 100) continue
    if (pk.type === 'smg' && G.player.vehicle) continue
    if (Math.hypot(pk.x - P.x, pk.z - P.z) < (G.player.vehicle ? 2.8 : 1.6)) {
      pk.active = false
      pk.respawn = pk.type === 'smg' ? 90 : 60
      if (pk.type === 'smg') {
        G.player.weapons.smg += 150
        G.player.weapon = 'smg'
        banner(G, 'SMG  +150', 1.5)
        emit(G, 'pickupWeapon', {})
      } else if (pk.type === 'health') {
        G.player.health = 100
        emit(G, 'heal', {})
      } else {
        G.cash += pk.value
        emit(G, 'cash', { value: pk.value })
      }
    }
  }

  // hidden neon tapes
  for (const t of G.world.packages) {
    if (G.progress.packages.has(t.id)) continue
    if (Math.hypot(t.x - P.x, t.z - P.z) > (G.player.vehicle ? 2.8 : 1.6)) continue
    G.progress.packages.add(t.id)
    const n = G.progress.packages.size
    const total = G.world.packages.length
    G.cash += 100
    if (n === total) {
      G.cash += 5000
      G.ui.big = 'ALL NEON TAPES FOUND!'
      G.ui.bigSub = '+$5000'
      G.ui.bigT = 4
      emit(G, 'missionPassed', {})
    } else banner(G, `Neon tape ${n}/${total}`, 2.5)
    emit(G, 'tape', {})
    emit(G, 'save', {})
  }

  updateWanted(G, dt)
  updateHeli(G, dt)
  updateMission(G, dt)
  updateTour(G)
  updateInteractions(G, input)

  for (const e of G.explosions) if (e.active && (e.t += dt) > 1.6) e.active = false
  if (G.ui.bannerT > 0 && (G.ui.bannerT -= dt) <= 0) G.ui.banner = null
  if (G.ui.toastT > 0 && (G.ui.toastT -= dt) <= 0) G.ui.toast = null
  if (G.ui.bigT > 0 && (G.ui.bigT -= dt) <= 0) { G.ui.big = null; G.ui.bigSub = null }
}

// Angle of the current objective relative to where the camera looks (0 = straight ahead)
function objectiveBearing(G) {
  const o = G.objective
  if (!o) return null
  const P = playerPos(G)
  if (Math.hypot(o.x - P.x, o.z - P.z) < 12) return null
  const a = Math.atan2(o.x - P.x, o.z - P.z)
  return Math.round(wrap((G.camYaw ?? P.heading) - a) * 50) / 50
}

export function hudSnapshot(G) {
  const p = G.player
  const v = p.vehicle
  return {
    cash: G.cash,
    wanted: G.wanted.level,
    flashing: G.wanted.level > 0 && G.wanted.unseen > 0,
    health: Math.round(p.health),
    inCar: !!v,
    speed: v ? Math.round(Math.abs(v.speed) * 3.6) : 0,
    carHealth: v ? Math.round((v.health / MODELS[v.model].health) * 100) : 0,
    prompt: G.ui.prompt,
    missionText: G.ui.missionText || (G.mission ? null : G.ui.tourText),
    tour: !!G.tour,
    objBearing: objectiveBearing(G),
    timer: G.ui.timer === null ? null : Math.ceil(G.ui.timer),
    banner: G.ui.banner,
    toast: G.ui.toast,
    big: G.ui.big,
    bigSub: G.ui.bigSub,
    panel: G.ui.panel,
    paused: G.ui.paused,
    intro: !!G.ui.intro,
    muted: !!G.ui.muted,
    cinematic: !!G.ui.cinematic,
    aiming: !!G.aiming,
    fps: G.fps || 0,
    counter: G.ui.counter || null,
    weapon: G.player.vehicle ? null : WEAPONS[G.player.weapon].name,
    ammo: G.player.weapon === 'smg' ? G.player.weapons.smg : null,
    locked: !!G.lock,
    hitT: G.hitT > 0,
    hurtT: (G.ui.hurtT || 0) > 0,
    clock: Math.floor(G.env.clock),
  }
}

