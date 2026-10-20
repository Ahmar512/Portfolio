import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { FX } from '../fx'

// Bloom so neon, headlights and lit windows glow. Desktop only; phones render directly.
export function Bloom() {
  const { gl, scene, camera, size } = useThree()
  const dpr = useThree((s) => s.viewport.dpr)
  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
    const c = new EffectComposer(gl, target)
    c.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.05)
    FX.bloomPass = bloom
    c.addPass(bloom)
    c.addPass(new OutputPass())
    return c
  }, [gl, scene, camera])
  useEffect(() => {
    composer.setPixelRatio(dpr)
    composer.setSize(size.width, size.height)
  }, [composer, dpr, size])
  useEffect(() => () => composer.dispose(), [composer])
  useFrame(() => composer.render(), 1)
  return null
}

const DPR = [1.75, 1.25, 1, 1, 1]
const DPR_MOBILE = [1.25, 1.1, 1, 1, 1]

function applyLevel(level, setDpr) {
  setDpr(Math.min(window.devicePixelRatio || 1, (FX.bloom ? DPR : DPR_MOBILE)[level]))
  if (FX.bloomPass) FX.bloomPass.enabled = level < 3
  if (FX.sunLight) FX.sunLight.castShadow = level < 4
}

// Fixed quality from settings, or (Auto) step down while the frame rate stays under 40fps:
// resolution, then bloom, then shadows.
function AutoQuality() {
  const { setDpr } = useThree()
  const st = useRef({ t: 0, frames: 0, level: 0, skip: 2, version: -1 })
  useFrame((_, dt) => {
    const s = st.current
    const mode = FX.settings?.quality || 'auto'
    if (s.version !== FX.version) {
      s.version = FX.version
      s.level = { high: 0, medium: 1, low: 4 }[mode] ?? 0
      s.skip = 2
      applyLevel(s.level, setDpr)
    }
    if (mode !== 'auto') return
    s.t += dt
    s.frames++
    if (s.t < 2) return
    const fps = s.frames / s.t
    s.t = 0
    s.frames = 0
    if (s.skip > 0) return void s.skip--
    if (fps >= 40 || s.level >= 4) return
    s.level++
    s.skip = 1
    applyLevel(s.level, setDpr)
  })
  return null
}

export default function Effects() {
  return (
    <>
      {FX.bloom && <Bloom />}
      <AutoQuality />
    </>
  )
}
