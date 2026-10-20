import { useEffect, useRef } from 'react'
import { BLOCKS, CITY_EDGE, BEACH_END, PIER, ROAD, BLOCK, roadCoord, MISSIONS } from '../world'

// Radar in the corner, rotated so "up" is where the camera is looking.
export default function Minimap({ G, size }) {
  const ref = useRef()
  useEffect(() => {
    const canvas = ref.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const g = canvas.getContext('2d')
    const R = size / 2
    const scale = size / 330
    let raf

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const P = G.player.vehicle || G.player
      const yaw = G.camYaw ?? P.heading
      const fx = Math.sin(yaw), fz = Math.cos(yaw)
      const theta = -Math.PI / 2 - Math.atan2(fz, fx)
      const toMap = (x, z) => {
        const dx = x - P.x, dz = z - P.z
        const c = Math.cos(theta), s = Math.sin(theta)
        return [(dx * c - dz * s) * scale, (dx * s + dz * c) * scale]
      }

      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, size, size)
      g.save()
      g.beginPath()
      g.arc(R, R, R - 2, 0, Math.PI * 2)
      g.clip()
      g.fillStyle = '#2b4a3a'
      g.fillRect(0, 0, size, size)

      g.save()
      g.translate(R, R)
      g.scale(scale, scale)
      g.rotate(theta)
      g.translate(-P.x, -P.z)
      // ocean, beach, pier
      g.fillStyle = '#1b7a9a'
      g.fillRect(BEACH_END, -2000, 4000, 4000)
      g.fillStyle = '#d7b878'
      g.fillRect(CITY_EDGE, -CITY_EDGE, BEACH_END - CITY_EDGE, CITY_EDGE * 2)
      g.fillStyle = '#9a7652'
      g.fillRect(BEACH_END, PIER.z - PIER.halfWidth, PIER.end - BEACH_END, PIER.halfWidth * 2)
      // blocks and roads
      g.fillStyle = '#4c4462'
      g.fillRect(-CITY_EDGE, -CITY_EDGE, CITY_EDGE * 2, CITY_EDGE * 2)
      g.fillStyle = '#a69fb8'
      for (let i = 0; i <= BLOCKS; i++) {
        g.fillRect(roadCoord(i) - ROAD / 2, -CITY_EDGE, ROAD, CITY_EDGE * 2)
        g.fillRect(-CITY_EDGE, roadCoord(i) - ROAD / 2, CITY_EDGE * 2, ROAD)
      }
      g.fillStyle = '#4f9a5c'
      for (const p of G.world.parks) g.fillRect(p.x - BLOCK / 2 + 2, p.z - BLOCK / 2 + 2, BLOCK - 4, BLOCK - 4)
      g.restore()

      const blip = (x, z, color, label, clampEdge, r = 7) => {
        let [mx, my] = toMap(x, z)
        const d = Math.hypot(mx, my)
        if (d > R - r - 3) {
          if (!clampEdge) return
          mx *= (R - r - 3) / d
          my *= (R - r - 3) / d
        }
        g.beginPath()
        g.arc(R + mx, R + my, r, 0, Math.PI * 2)
        g.fillStyle = color
        g.fill()
        g.lineWidth = 1.5
        g.strokeStyle = '#fff'
        g.stroke()
        if (label) {
          g.fillStyle = '#fff'
          g.font = `900 ${r * 1.3}px Arial, sans-serif`
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(label, R + mx, R + my + 0.5)
        }
      }

      for (const p of G.pickups) if (p.active) blip(p.x, p.z, '#3bff7a', null, false, 2.5)
      for (const l of G.world.landmarks) if (l.letter) blip(l.zone.x, l.zone.z, l.neon, l.letter, true)
      const spray = G.world.lm.spray.zone
      blip(spray.x, spray.z, '#1faa5a', '$', false)
      if (!G.mission) for (const m of MISSIONS) if (m.giver) blip(m.giver.x, m.giver.z, '#e0b000', '!', true)
      const flash = Math.floor(performance.now() / 250) % 2
      for (const v of G.vehicles) {
        if (v.role === 'police' && v.ai === 'police') blip(v.x, v.z, flash ? '#ff2a3d' : '#2f6bff', null, false, 4)
      }
      if (G.objective) blip(G.objective.x, G.objective.z, G.objective.kind === 'race' ? '#ff3b6b' : '#ffd21f', null, true, 6)

      // north marker
      blip(P.x, P.z - 1000, '#111', 'N', true, 7)

      // player arrow (relative to camera)
      const rel = -(P.heading - yaw)
      g.save()
      g.translate(R, R)
      g.rotate(rel)
      g.beginPath()
      g.moveTo(0, -8)
      g.lineTo(6, 6)
      g.lineTo(0, 3)
      g.lineTo(-6, 6)
      g.closePath()
      g.fillStyle = '#fff'
      g.fill()
      g.strokeStyle = '#000'
      g.lineWidth = 1
      g.stroke()
      g.restore()
      g.restore()

      g.beginPath()
      g.arc(R, R, R - 2, 0, Math.PI * 2)
      g.lineWidth = 3
      g.strokeStyle = 'rgba(0,0,0,0.85)'
      g.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [G, size])

  return <canvas ref={ref} style={{ width: size, height: size }} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]" />
}
