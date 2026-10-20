// Procedural car bodies: side profiles extruded with rounded bevels, plus trim, chrome, lights and alloy wheels.
// Styled after modern German sports sedans / coupes / SUVs, without any real brand's badges or grille.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const SPECS = {
  sedan: {
    L: 4.7, W: 1.9, wheelR: 0.36, axleF: 1.42, axleR: -1.45, arch: 0.45, clear: 0.3,
    body: (s) => {
      s.moveTo(2.25, 0.3)
      s.bezierCurveTo(2.37, 0.32, 2.39, 0.55, 2.34, 0.66)
      s.quadraticCurveTo(2.28, 0.8, 2.05, 0.84)
      s.quadraticCurveTo(1.4, 0.95, 0.85, 1.0)
      s.lineTo(-1.25, 1.02)
      s.quadraticCurveTo(-1.9, 1.03, -2.25, 0.98)
      s.quadraticCurveTo(-2.38, 0.9, -2.36, 0.6)
      s.quadraticCurveTo(-2.35, 0.35, -2.2, 0.3)
    },
    cabin: [[0.95, 0.98], [0.6, 1.25], [0.25, 1.42], [-0.4, 1.48], [-0.95, 1.4], [-1.35, 1.2], [-1.6, 0.99]],
    cabinW: 0.8, head: [2.29, 0.71], grille: [2.36, 0.53], tail: [-2.35, 0.86], belt: 1.0,
  },
  sport: {
    L: 4.6, W: 1.96, wheelR: 0.36, axleF: 1.4, axleR: -1.38, arch: 0.45, clear: 0.28,
    body: (s) => {
      s.moveTo(2.2, 0.28)
      s.bezierCurveTo(2.33, 0.3, 2.35, 0.5, 2.31, 0.6)
      s.quadraticCurveTo(2.25, 0.74, 2.0, 0.78)
      s.quadraticCurveTo(1.2, 0.88, 0.6, 0.94)
      s.lineTo(-1.5, 0.98)
      s.quadraticCurveTo(-2.0, 0.99, -2.26, 0.95)
      s.quadraticCurveTo(-2.36, 0.86, -2.33, 0.58)
      s.quadraticCurveTo(-2.32, 0.33, -2.15, 0.28)
    },
    cabin: [[0.7, 0.92], [0.25, 1.2], [-0.15, 1.31], [-0.7, 1.35], [-1.15, 1.23], [-1.55, 1.07], [-1.8, 0.97]],
    cabinW: 0.78, head: [2.26, 0.66], grille: [2.33, 0.48], tail: [-2.33, 0.82], belt: 0.96, spoiler: true,
  },
  suv: {
    L: 4.85, W: 2.0, wheelR: 0.4, axleF: 1.5, axleR: -1.5, arch: 0.5, clear: 0.38,
    body: (s) => {
      s.moveTo(2.3, 0.38)
      s.bezierCurveTo(2.44, 0.4, 2.46, 0.75, 2.41, 0.86)
      s.quadraticCurveTo(2.33, 1.0, 2.1, 1.04)
      s.quadraticCurveTo(1.5, 1.12, 1.0, 1.18)
      s.lineTo(-2.0, 1.22)
      s.quadraticCurveTo(-2.4, 1.22, -2.42, 1.0)
      s.quadraticCurveTo(-2.45, 0.5, -2.3, 0.38)
    },
    cabin: [[1.05, 1.16], [0.75, 1.5], [0.35, 1.76], [-0.6, 1.82], [-1.9, 1.76], [-2.25, 1.6], [-2.3, 1.19]],
    cabinW: 0.86, head: [2.38, 0.93], grille: [2.44, 0.74], tail: [-2.42, 1.08], belt: 1.2, rails: true,
  },
}
// sim model -> body style
const STYLE = { sedan: 'sedan', taxi: 'sedan', police: 'sedan', sport: 'sport', van: 'suv' }

function nonIndexed(g) {
  return g.index ? g.toNonIndexed() : g
}
function merge(list, groups = false) {
  return mergeGeometries(list.map(nonIndexed), groups)
}

function extrude(shape, width, bevel = 0.08, curveSegments = 16) {
  const depth = Math.max(0.01, width - bevel * 2)
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 4, curveSegments })
  g.rotateY(-Math.PI / 2)
  g.translate(depth / 2, 0, 0)
  g.computeVertexNormals()
  return g
}

function box(w, h, d, x, y, z, ry = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rx) g.rotateX(rx)
  if (ry) g.rotateY(ry)
  return g.translate(x, y, z)
}

function colorize(g, hex) {
  const c = new THREE.Color(hex)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

function bodyShape(spec) {
  const s = new THREE.Shape()
  spec.body(s)
  const y = spec.clear
  const r = spec.arch
  const cy = spec.wheelR
  s.lineTo(spec.axleR - r, y)
  s.absarc(spec.axleR, cy, r, Math.PI, 0, true)
  s.lineTo(spec.axleF - r, y)
  s.absarc(spec.axleF, cy, r, Math.PI, 0, true)
  s.closePath()
  return s
}

function cabinShape(pts, lift = 0) {
  const s = new THREE.Shape()
  s.moveTo(pts[0][0], pts[0][1] + lift)
  s.quadraticCurveTo(pts[1][0], pts[1][1] + lift, pts[2][0], pts[2][1] + lift)
  s.quadraticCurveTo(pts[3][0], pts[3][1] + lift, pts[4][0], pts[4][1] + lift)
  s.quadraticCurveTo(pts[5][0], pts[5][1] + lift, pts[6][0], pts[6][1] + lift)
  s.closePath()
  return s
}

function roofShape(pts) {
  // thin painted shell over the middle of the greenhouse
  const [a, c, b] = [pts[2], pts[3], pts[4]]
  const s = new THREE.Shape()
  s.moveTo(a[0] - 0.05, a[1] + 0.012)
  s.quadraticCurveTo(c[0], c[1] + 0.02, b[0] + 0.05, b[1] + 0.012)
  s.lineTo(b[0] + 0.08, b[1] - 0.05)
  s.quadraticCurveTo(c[0], c[1] - 0.04, a[0] - 0.08, a[1] - 0.05)
  s.closePath()
  return s
}

export function wheelGeometry(r) {
  const prof = [[0.7, -0.13], [0.92, -0.135], [1, -0.095], [1.015, 0], [1, 0.095], [0.92, 0.135], [0.7, 0.13]].map(([a, b]) => new THREE.Vector2(a * r, b))
  const tire = new THREE.LatheGeometry(prof, 28).rotateZ(Math.PI / 2)
  const spokes = []
  for (let k = 0; k < 10; k++) {
    const a = Math.floor(k / 2) * ((Math.PI * 2) / 5) + (k % 2 ? 0.13 : -0.13)
    spokes.push(new THREE.BoxGeometry(0.04, r * 0.6, 0.035).translate(0, r * 0.34, 0).rotateX(a).translate(0.1, 0, 0))
  }
  spokes.push(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14).rotateZ(Math.PI / 2).translate(0.1, 0, 0))
  spokes.push(new THREE.TorusGeometry(r * 0.69, 0.016, 6, 32).rotateY(Math.PI / 2).translate(0.11, 0, 0))
  const dark = [
    new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.22, 24, 1, true).rotateZ(Math.PI / 2),
    new THREE.CylinderGeometry(r * 0.56, r * 0.56, 0.03, 24).rotateZ(Math.PI / 2).translate(-0.02, 0, 0),
  ]
  return merge([tire, merge(spokes), merge(dark)], true)
}

const cache = new Map()

export function carParts(model) {
  if (cache.has(model)) return cache.get(model)
  const spec = SPECS[STYLE[model]]
  const { W, belt, clear } = spec
  const cab = spec.cabin
  const cabinW = W * spec.cabinW

  const BODY_BEVEL = 0.12
  const paint = [extrude(bodyShape(spec), W, BODY_BEVEL), extrude(roofShape(cab), cabinW - 0.02, 0.06)]
  // the rounded bevel pushes the body surface out by ~0.9 * bevel, so details sit on that surface
  const bv = BODY_BEVEL * 0.9
  const glass = extrude(cabinShape(cab), cabinW, 0.1)

  // black plastic trim
  const trim = []
  const gs = spec.grille[0] + bv
  const gy = spec.grille[1]
  trim.push(box(W * 0.46, 0.14, 0.08, 0, gy, gs - 0.03))
  trim.push(box(W * 0.66, 0.1, 0.08, 0, clear + 0.12, gs - 0.06))
  trim.push(box(W * 0.62, 0.11, 0.08, 0, clear + 0.1, spec.tail[0] - bv + 0.03))
  for (const side of [-1, 1]) {
    trim.push(box(0.05, 0.09, spec.axleF - spec.axleR - spec.arch * 2.1, side * (W / 2 + 0.01), clear + 0.06, (spec.axleF + spec.axleR) / 2))
    trim.push(box(0.2, 0.1, 0.16, side * (W / 2 + 0.06), belt + 0.13, cab[0][0] - 0.2)) // mirror
    trim.push(box(0.015, belt - clear - 0.25, 0.012, side * (W / 2 + 0.012), (belt + clear) / 2 + 0.03, cab[0][0] - 0.35)) // door seams
    trim.push(box(0.015, belt - clear - 0.25, 0.012, side * (W / 2 + 0.012), (belt + clear) / 2 + 0.03, (cab[0][0] + cab[6][0]) / 2 - 0.1))
  }
  if (spec.spoiler) trim.push(box(W * 0.8, 0.04, 0.22, 0, 1.0 + bv, spec.tail[0] + 0.05))
  if (spec.rails) for (const side of [-1, 1]) trim.push(box(0.05, 0.05, 2.2, side * (cabinW / 2 - 0.1), cab[3][1] + 0.06, cab[3][0] - 0.2))

  // chrome
  const chrome = []
  for (let k = -3; k <= 3; k++) chrome.push(box(0.018, 0.12, 0.02, k * 0.1, gy, gs + 0.015))
  chrome.push(box(W * 0.47, 0.02, 0.03, 0, gy + 0.075, gs + 0.01))
  chrome.push(box(W * 0.47, 0.02, 0.03, 0, gy - 0.075, gs + 0.01))
  for (const side of [-1, 1]) {
    chrome.push(new THREE.CylinderGeometry(0.05, 0.055, 0.14, 14).rotateX(Math.PI / 2).translate(side * W * 0.3, clear + 0.02, spec.tail[0] - bv - 0.02))
    chrome.push(box(0.02, 0.02, cab[0][0] - cab[6][0] - 0.2, side * (cabinW / 2 + 0.005), belt + 0.005, (cab[0][0] + cab[6][0]) / 2))
    chrome.push(box(0.025, 0.03, 0.14, side * (W / 2 + 0.015), belt - 0.12, cab[0][0] - 0.6))
    chrome.push(box(0.025, 0.03, 0.14, side * (W / 2 + 0.015), belt - 0.12, (cab[0][0] + cab[6][0]) / 2 - 0.35))
  }

  // lights (vertex coloured, rendered unlit so they can bloom)
  const head = []
  const tail = []
  const hs = spec.head[0] + bv
  const hy = spec.head[1]
  const ts = spec.tail[0] - bv
  const ty = spec.tail[1]
  for (const side of [-1, 1]) {
    head.push(colorize(box(0.38, 0.075, 0.08, side * W * 0.32, hy, hs - 0.04, side * 0.28), '#e9f3ff'))
    head.push(colorize(box(0.34, 0.022, 0.08, side * W * 0.32, hy + 0.06, hs - 0.06, side * 0.28), '#bfe3ff'))
    head.push(colorize(box(0.12, 0.05, 0.06, side * W * 0.38, clear + 0.18, gs - 0.07), '#fff3d6'))
    tail.push(colorize(box(0.46, 0.075, 0.06, side * (W / 2 - 0.27), ty, ts + 0.02), '#ff1a2a'))
    tail.push(colorize(box(0.05, 0.075, 0.3, side * (W / 2 - 0.02), ty, ts + 0.18), '#ff1a2a'))
    tail.push(colorize(box(0.3, 0.025, 0.06, side * (W / 2 - 0.3), ty - 0.07, ts + 0.02), '#ff6a3d'))
  }

  const plates = merge([box(0.52, 0.12, 0.02, 0, gy - 0.16, gs + 0.02), box(0.52, 0.12, 0.02, 0, ty - 0.2, ts - 0.025, Math.PI)])

  const wy = spec.wheelR
  const wx = W / 2 - 0.2
  const parts = {
    spec,
    paint: merge(paint),
    glass,
    trim: merge(trim),
    chrome: merge(chrome),
    head: merge(head),
    tail: merge(tail),
    plates,
    wheel: wheelGeometry(spec.wheelR),
    wheels: [[-wx, wy, spec.axleF, true], [wx, wy, spec.axleF, true], [-wx, wy, spec.axleR, false], [wx, wy, spec.axleR, false]],
    roofY: cab[3][1] + 0.02,
    roofZ: cab[3][0],
  }
  cache.set(model, parts)
  return parts
}
