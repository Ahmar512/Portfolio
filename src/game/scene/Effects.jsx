import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { makeSkyMaterial, SUN_DIR } from './City'
import { FX } from '../fx'

// Sunset sky baked into an environment map, so paint, glass and water reflect it.
export function SkyEnvironment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const envScene = new THREE.Scene()
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), makeSkyMaterial()))
    const sun = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(6) }))
    sun.position.copy(SUN_DIR).multiplyScalar(45)
    sun.lookAt(0, 0, 0)
    envScene.add(sun)
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromScene(envScene, 0.02)
    scene.environment = rt.texture
    scene.environmentIntensity = 0.7
    pmrem.dispose()
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])
  return null
}

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

// Steps quality down while the frame rate stays under 40fps: resolution, then bloom, then shadows.
function AutoQuality() {
  const { setDpr } = useThree()
  const st = useRef({ t: 0, frames: 0, level: 0, skip: 2 })
  useFrame((_, dt) => {
    const s = st.current
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
    if (s.level === 1) setDpr(1.25)
    else if (s.level === 2) setDpr(1)
    else if (s.level === 3 && FX.bloomPass) FX.bloomPass.enabled = false
    else if (FX.sunLight) FX.sunLight.castShadow = false
  })
  return null
}

export default function Effects() {
  return (
    <>
      <SkyEnvironment />
      {FX.bloom && <Bloom />}
      <AutoQuality />
    </>
  )
}
