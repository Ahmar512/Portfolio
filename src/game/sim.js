// Game simulation. Plain JS on a mutable state object `G`; the React/three layer only reads it.
import {
  WORLD, BLOCKS, PITCH, CITY_EDGE, BEACH_END, PIER, LANE,
  roadCoord, blockCenter, nearestNode, groundHeight, MISSIONS, DELIVERY, RACE,
} from './world'

export const MODELS = {
  sport: { w: 2.0, len: 4.4, maxSpeed: 42, accel: 21, brake: 34, turn: 2.4, health: 100 },
  sedan: { w: 1.95, len: 4.3, maxSpeed: 31, accel: 14, brake: 30, turn: 2.1, health: 110 },
  taxi: { w: 1.95, len: 4.3, maxSpeed: 32, accel: 15, brake: 30, turn: 2.1, health: 110 },
  van: { w: 2.1, len: 4.7, maxSpeed: 25, accel: 11, brake: 26, turn: 1.8, health: 140 },
  police: { w: 2.0, len: 4.4, maxSpeed: 39, accel: 19, brake: 34, turn: 2.3, health: 120 },
}

const WANTED_TH = [0, 1, 3, 6, 10, 15]
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

export function createGame() {
  const W = WORLD
  const G = {
    t: 0,
    world: W,
    cash: 0,
    player: {
      x: W.spawn.x, y: 0, z: W.spawn.z, heading: W.spawn.heading,
      vy: 0, speed: 0, health: 100, vehicle: null, walk: 0, moving: 0, hurtCd: 0, down: false,
    },
    vehicles: W.vehicleSpawns.map(createVehicle),
    peds: W.pedSpawns.map((s, k) => ({ ...s, id: k, state: 'walk', x: 0, y: 0, z: 0, heading: 0, vx: 0, vy: 0, vz: 0, spin: 0, downT: 0, walk: Math.random() * 6 })),
    pickups: W.pickups.map((p) => ({ ...p, active: true, respawn: 0 })),
    wanted: { points: 0, level: 0, unseen: 0, bust: 0, spawnT: 0, crimeCd: 0 },
    mission: null,
    missionsDone: {},
    objective: null, // { x, z, r, kind }
    explosions: Array.from({ length: 6 }, () => ({ active: false, x: 0, y: 0, z: 0, t: 0 })),
    events: [],
    ui: { prompt: null, panel: null, paused: false, banner: null, bannerT: 0, toast: null, toastT: 0, big: null, bigT: 0, missionText: null, timer: null },
    deadT: 0,
    deadKind: null,
    freezeT: 0,
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
    Object.assign(v, { fi, fj, ti, tj, x, z, heading: Math.atan2(dx, dz), speed: 6, ai: 'traffic', wreck: false, fire: 0, health: MODELS[v.model].health, stuckT: 0, reverseT: 0, blockT: 0 })
    return true
  }
  return false
}

function resetVehicle(G, v) {
  if (v.role === 'traffic') {
    if (!placeOnRandomLane(G, v, 90)) v.ai = 'inactive'
  } else if (v.role === 'parked') {
    Object.assign(v, { x: v.home.x, z: v.home.z, heading: v.home.heading, speed: 0, ai: 'parked', wreck: false, fire: 0, health: MODELS[v.model].health })
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

function carCircles(v) {
  const fx = Math.sin(v.heading) * CAR_OFF, fz = Math.cos(v.heading) * CAR_OFF
  return [[v.x + fx, v.z + fz], [v.x - fx, v.z - fz]]
}

// Returns impact speed against walls.
function collideCarStatic(v) {
  let impact = 0
  for (const [cx, cz] of carCircles(v)) {
    resolveStatic(cx, cz, CAR_R)
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

function drive(v, dt, throttle, steer, handbrake) {
  const m = MODELS[v.model]
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
  const grip = clamp(s / 6, 0, 1) * (1 - 0.45 * clamp(s / m.maxSpeed, 0, 1))
  const turn = v.steer * m.turn * grip * (handbrake ? 1.5 : 1) * (v.speed < 0 ? -1 : 1)
  v.heading = wrap(v.heading - turn * dt)
  v.x += Math.sin(v.heading) * v.speed * dt
  v.z += Math.cos(v.heading) * v.speed * dt
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

function updateVehicles(G, dt, input) {
  const p = G.player
  for (const v of G.vehicles) {
    if (v.ai === 'inactive') continue
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
      if (v.ai === 'player') emit(G, 'crash', { power: impact })
    }
    v.y = groundHeight(v.x, v.z)
  }

  // Car vs car
  const vs = G.vehicles
  for (let a = 0; a < vs.length; a++) {
    const A = vs[a]
    if (A.ai === 'inactive') continue
    for (let b = a + 1; b < vs.length; b++) {
      const B = vs[b]
      if (B.ai === 'inactive') continue
      const ddx = B.x - A.x, ddz = B.z - A.z
      if (ddx * ddx + ddz * ddz > 36) continue
      let impact = 0
      for (const [ax, az] of carCircles(A)) {
        for (const [bx, bz] of carCircles(B)) {
          const dx = bx - ax, dz = bz - az
          const d = Math.hypot(dx, dz)
          if (d >= CAR_R * 2 || d < 1e-5) continue
          const nx = dx / d, nz = dz / d, pen = CAR_R * 2 - d
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
  const live = G.deadT <= 0
  const turn = live ? input.steer : 0
  const fwd = live ? input.throttle : 0
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
    for (const [cx, cz] of carCircles(v)) {
      const dx = p.x - cx, dz = p.z - cz
      const d = Math.hypot(dx, dz)
      const min = CAR_R + PLAYER_R
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

function enterVehicle(G) {
  const p = G.player
  let best = null, bestD = 4
  for (const v of G.vehicles) {
    if (v.ai === 'inactive' || v.wreck) continue
    const d = Math.hypot(v.x - p.x, v.z - p.z)
    if (d < bestD) { best = v; bestD = d }
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
  p.vehicle = null
  if (!v.wreck) v.ai = 'parked'
  const lx = Math.cos(v.heading), lz = -Math.sin(v.heading)
  p.x = v.x + lx * 2.1
  p.z = v.z + lz * 2.1
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
    if (Math.hypot(v.x - p.x, v.z - p.z) < 4) return v
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
  if (fee > 0) banner(G, `${G.deadKind === 'wasted' ? 'Hospital bill' : 'Bail'}: -$${fee}`, 3)
  G.deadKind = null
}

// ---------------------------------------------------------------------------
// Pedestrians

function knockPed(G, ped, vx, vz, byPlayer) {
  ped.state = 'down'
  ped.vx = vx; ped.vz = vz
  ped.vy = 4 + Math.hypot(vx, vz) * 0.12
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
      const panic = G.wanted.level > 0 && Math.hypot(ped.x - P.x, ped.z - P.z) < 25
      ped.gait = panic ? 1.8 : 1
      ped.t += ped.dir * ped.speed * (panic ? 2.4 : 1) * dt
      ped.walk += dt * ped.speed * (panic ? 5 : 2.4)
      placePed(ped)
      ped.y = groundHeight(ped.x, ped.z)
      for (const v of G.vehicles) {
        if (v.ai === 'inactive' || Math.abs(v.speed) < 2) continue
        if (Math.abs(v.x - ped.x) > 4 || Math.abs(v.z - ped.z) > 4) continue
        const hit = carCircles(v).some(([cx, cz]) => Math.hypot(cx - ped.x, cz - ped.z) < CAR_R + 0.35)
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
  if (G.vehicles.some((u) => u !== v && u.ai !== 'inactive' && Math.hypot(u.x - n.x, u.z - n.z) < 6)) return
  Object.assign(v, {
    x: n.x, z: n.z, ti: n.i, tj: n.j, heading: Math.atan2(P.x - n.x, P.z - n.z), speed: 8,
    ai: 'police', wreck: false, fire: 0, health: MODELS.police.health, stuckT: 0, reverseT: 0,
  })
}

function updateWanted(G, dt) {
  const W = G.wanted
  W.crimeCd = Math.max(0, W.crimeCd - dt)
  const P = playerPos(G)
  const cops = G.vehicles.filter((v) => v.role === 'police' && v.ai === 'police')
  if (W.level === 0) { W.bust = 0; return }

  const seen = cops.some((v) => Math.hypot(v.x - P.x, v.z - P.z) < 50)
  if (seen) W.unseen = 0
  else W.unseen += dt
  if (W.unseen > 8 + W.level * 2) {
    W.level -= 1
    W.points = WANTED_TH[W.level]
    W.unseen = 0
    emit(G, 'wantedDown', {})
  }

  const want = Math.min(5, W.level + (W.level >= 3 ? 1 : 0))
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
}

function passMission(G) {
  const def = G.mission.def
  G.cash += def.reward
  G.missionsDone[def.id] = true
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
  }
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

  if (!G.mission) {
    const def = MISSIONS.find((d) => within(P, d.giver, 3.2))
    if (def) {
      ui.prompt = `Press E to start mission: ${def.name}${G.missionsDone[def.id] ? ' (replay)' : ''}`
      if (action) startMission(G, def)
      return
    }
  }

  if (!p.vehicle && nearestEnterable(G)) ui.prompt = 'Press F to enter the car'
}

// ---------------------------------------------------------------------------
// Main step

export function step(G, dt, input) {
  if (G.ui.paused || G.ui.panel) return
  G.t += dt
  if (G.freezeT > 0) G.freezeT -= dt
  if (G.deadT > 0) {
    G.deadT -= dt
    if (G.deadT <= 0) respawn(G)
  }

  updateVehicles(G, dt, input)
  updatePlayer(G, dt, input)
  updatePeds(G, dt)

  const P = playerPos(G)
  for (const pk of G.pickups) {
    if (!pk.active) {
      pk.respawn -= dt
      if (pk.respawn <= 0) pk.active = true
      continue
    }
    if (Math.hypot(pk.x - P.x, pk.z - P.z) < (G.player.vehicle ? 2.8 : 1.6)) {
      pk.active = false
      pk.respawn = 60
      G.cash += pk.value
      emit(G, 'cash', { value: pk.value })
    }
  }

  updateWanted(G, dt)
  updateMission(G, dt)
  updateInteractions(G, input)

  for (const e of G.explosions) if (e.active && (e.t += dt) > 1.6) e.active = false
  if (G.ui.bannerT > 0 && (G.ui.bannerT -= dt) <= 0) G.ui.banner = null
  if (G.ui.toastT > 0 && (G.ui.toastT -= dt) <= 0) G.ui.toast = null
  if (G.ui.bigT > 0 && (G.ui.bigT -= dt) <= 0) { G.ui.big = null; G.ui.bigSub = null }
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
    missionText: G.ui.missionText,
    timer: G.ui.timer === null ? null : Math.ceil(G.ui.timer),
    banner: G.ui.banner,
    toast: G.ui.toast,
    big: G.ui.big,
    bigSub: G.ui.bigSub,
    panel: G.ui.panel,
    paused: G.ui.paused,
    intro: !!G.ui.intro,
    muted: !!G.ui.muted,
    clock: 19 * 60 + Math.floor(G.t),
  }
}

