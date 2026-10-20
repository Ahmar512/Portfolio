import * as THREE from 'three'

const cache = new Map()

// Neon sign rendered to a canvas texture (no font files needed).
export function signTexture(text, color, { sub, width = 1024, height = 256, bg = 'rgba(10,6,24,0.85)' } = {}) {
  const key = `${text}|${color}|${sub}|${width}|${height}|${bg}`
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const g = c.getContext('2d')
  if (bg) {
    g.fillStyle = bg
    roundRect(g, 6, 6, width - 12, height - 12, 28)
    g.fill()
    g.lineWidth = 8
    g.strokeStyle = color
    g.shadowColor = color
    g.shadowBlur = 24
    g.stroke()
  }
  const mainSize = sub ? height * 0.42 : height * 0.55
  g.font = `900 ${mainSize}px "Arial Black", Impact, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  fitFont(g, text, width * 0.88, mainSize)
  const y = sub ? height * 0.4 : height * 0.52
  g.shadowColor = color
  g.shadowBlur = 30
  g.fillStyle = color
  g.fillText(text, width / 2, y)
  g.shadowBlur = 8
  g.fillStyle = '#ffffff'
  g.globalAlpha = 0.85
  g.fillText(text, width / 2, y)
  g.globalAlpha = 1
  if (sub) {
    g.font = `700 ${height * 0.2}px Arial, sans-serif`
    g.shadowBlur = 12
    g.fillStyle = '#ffffff'
    g.fillText(sub, width / 2, height * 0.78)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

function fitFont(g, text, maxW, size) {
  let s = size
  while (g.measureText(text).width > maxW && s > 10) {
    s *= 0.92
    g.font = g.font.replace(/\d+(\.\d+)?px/, `${s}px`)
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

// Small round icon for floating markers (cash, missions...).
export function iconTexture(glyph, color) {
  const key = `icon|${glyph}|${color}`
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.beginPath()
  g.arc(64, 64, 56, 0, Math.PI * 2)
  g.fillStyle = color
  g.shadowColor = color
  g.shadowBlur = 12
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.shadowBlur = 0
  g.font = '900 72px "Arial Black", Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#ffffff'
  g.fillText(glyph, 64, 68)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  cache.set(key, tex)
  return tex
}

// Asphalt with a little grain so large road surfaces don't look flat.
export function grainTexture(base, spread, repeat) {
  const key = `grain|${base}|${spread}|${repeat}`
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 1400; i++) {
    const v = Math.random() * spread
    g.fillStyle = `rgba(255,255,255,${v})`
    g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  cache.set(key, tex)
  return tex
}
