// Sky, sun, moon, stars, fog, hemisphere light, sky reflections and rain, all driven by G.env.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FX, glow } from '../fx'

// Sky palettes keyed by sun elevation
const KEYS = [
  { e: -0.3, top: '#04050d', mid: '#0a0d26', horizon: '#161538' },
  { e: -0.08, top: '#120f35', mid: '#3a2563', horizon: '#9a3f74' },
  { e: 0.03, top: '#24104f', mid: '#a5306f', horizon: '#ff8a7a' },
  { e: 0.2, top: '#3557a8', mid: '#8aa6dc', horizon: '#ffc59a' },
  { e: 0.5, top: '#2a62c8', mid: '#69a7ea', horizon: '#cfe4ff' },
].map((k) => ({ ...k, top: new THREE.Color(k.top), mid: new THREE.Color(k.mid), horizon: new THREE.Color(k.horizon) }))
const RAIN = { top: new THREE.Color('#3a3f4c'), mid: new THREE.Color('#596070'), horizon: new THREE.Color('#7d8494') }
const tmpC = new THREE.Color()
const WHITE = new THREE.Color('#ffffff')
const SUN_LOW = new THREE.Color('#ffb070')
const SUN_HIGH = new THREE.Color('#fff2de')
const MOON = new THREE.Color('#8fa6ff')

function skyColors(elev, rain, out) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1]
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (elev >= KEYS[i].e && elev <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break }
    if (elev < KEYS[0].e) { a = b = KEYS[0]; break }
  }
  const t = a === b ? 0 : THREE.MathUtils.clamp((elev - a.e) / (b.e - a.e), 0, 1)
  const dark = THREE.MathUtils.clamp(1 - (0.1 - elev) / 0.35, 0.12, 1) // rain clouds get dark at night
  for (const k of ['top', 'mid', 'horizon']) {
    out[k].copy(a[k]).lerp(b[k], t)
    out[k].lerp(tmpC.copy(RAIN[k]).multiplyScalar(dark), rain * 0.85)
  }
  return out
}

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(1, 0.1, 0.3) },
      uNight: { value: 0 },
      uRain: { value: 0 },
      uFlash: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir;
      uniform float uNight; uniform float uRain; uniform float uFlash; uniform float uTime;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.2, h));
        col = mix(col, top, smoothstep(0.2, 0.65, h));
        if (h < 0.0) col = mix(horizon, horizon * 0.35, smoothstep(0.0, -0.3, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        col += vec3(1.0, 0.55, 0.25) * pow(s, 12.0) * 0.7 * (1.0 - uRain);
        // stars
        vec3 cell = floor(d * 260.0);
        float star = step(0.9965, hash(cell)) * smoothstep(0.05, 0.3, h);
        star *= 0.6 + 0.4 * sin(uTime * 2.0 + hash(cell + 3.0) * 30.0);
        col += vec3(star) * uNight * (1.0 - uRain) * 1.4;
        col += vec3(0.75, 0.8, 1.0) * uFlash * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
}

function discTexture(striped) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  if (striped) {
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#fff3a0')
    grad.addColorStop(0.55, '#ff9a3c')
    grad.addColorStop(1, '#ff3d7f')
    g.fillStyle = grad
  } else {
    const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.45, 'rgba(255,250,230,0.95)')
    grad.addColorStop(1, 'rgba(255,240,200,0)')
    g.fillStyle = grad
  }
  g.beginPath()
  g.arc(128, 128, striped ? 124 : 128, 0, Math.PI * 2)
  g.fill()
  if (striped) {
    g.globalCompositeOperation = 'destination-out'
    for (let k = 0; k < 7; k++) g.fillRect(0, 150 + k * 15, 256, 3 + k * 1.3)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function moonTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64)
  grad.addColorStop(0, '#f4f2ea')
  grad.addColorStop(0.8, '#d8d6cc')
  grad.addColorStop(1, 'rgba(216,214,204,0)')
  g.fillStyle = grad
  g.beginPath()
  g.arc(64, 64, 62, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(150,148,140,0.35)'
  for (const [x, y, r] of [[48, 50, 10], [76, 72, 14], [60, 88, 7], [84, 44, 6]]) {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const RAIN_COUNT = 5000
const RAIN_BOX = [70, 40, 70]

function Rain({ G }) {
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 6)
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = Math.random() * RAIN_BOX[0], y = Math.random() * RAIN_BOX[1], z = Math.random() * RAIN_BOX[2]
      pos.set([x, y, z, x + 0.06, y + 0.9, z + 0.03], i * 6)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uColor: { value: new THREE.Color('#cfd8e8') } },
      vertexShader: `
        uniform float uTime; uniform vec3 uCam; uniform float uAmount;
        varying float vA;
        void main() {
          vec3 p = position;
          vec3 box = vec3(${RAIN_BOX.map((n) => n.toFixed(1)).join(',')});
          p.y = mod(p.y - uTime * 26.0, box.y);
          p.x = uCam.x + mod(p.x - uCam.x + box.x * 0.5, box.x) - box.x * 0.5;
          p.z = uCam.z + mod(p.z - uCam.z + box.z * 0.5, box.z) - box.z * 0.5;
          p.y += uCam.y - box.y * 0.45;
          // thin the rain out when it is light
          vA = step(fract(position.x * 12.9898 + position.z * 4.1414), uAmount);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main() { if (vA < 0.5) discard; gl_FragColor = vec4(uColor, 0.32); }`,
    })
    return { geometry, material }
  }, [])
  const ref = useRef()
  useFrame(({ camera, clock }) => {
    const r = G.env.rain
    ref.current.visible = r > 0.02
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uCam.value.copy(camera.position)
    material.uniforms.uAmount.value = r
  })
  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

export default function Atmosphere({ G }) {
  const { scene, gl } = useThree()
  const group = useRef()
  const sky = useMemo(makeSkyMaterial, [])
  const hemi = useRef()
  const sun = useRef()
  const sunGlow = useRef()
  const moon = useRef()
  const cols = useMemo(() => ({ top: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color() }), [])
  const tex = useMemo(() => ({ striped: discTexture(true), plain: discTexture(false), moon: moonTexture() }), [])
  const v = useMemo(() => new THREE.Vector3(), [])

  // Environment map: re-baked from the current sky every few seconds when it has changed
  const env = useMemo(() => {
    const envScene = new THREE.Scene()
    const envSky = makeSkyMaterial()
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), envSky))
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: '#ffd28a' }))
    envScene.add(disc)
    return { envScene, envSky, disc, pmrem: null, rt: null, last: null, t: 0 }
  }, [])
  useEffect(() => {
    env.pmrem = new THREE.PMREMGenerator(gl)
    return () => {
      env.pmrem.dispose()
      env.rt?.dispose()
      scene.environment = null
    }
  }, [env, gl, scene])

  useFrame(({ camera, clock }, dt) => {
    const e = G.env
    skyColors(e.elev, e.rain, cols)
    const u = sky.uniforms
    u.top.value.copy(cols.top)
    u.mid.value.copy(cols.mid)
    u.horizon.value.copy(cols.horizon)
    u.sunDir.value.fromArray(e.sunDir)
    u.uNight.value = e.night
    u.uRain.value = e.rain
    u.uFlash.value = e.flash
    u.uTime.value = clock.elapsedTime

    group.current.position.copy(camera.position)
    // sun: striped retro disc near the horizon, plain bright disc when high
    v.fromArray(e.sunDir).multiplyScalar(700)
    sun.current.position.copy(v)
    sunGlow.current.position.copy(v)
    sun.current.lookAt(camera.position)
    sunGlow.current.lookAt(camera.position)
    const low = THREE.MathUtils.clamp(1 - e.elev / 0.25, 0, 1)
    const visible = THREE.MathUtils.clamp((e.elev + 0.05) / 0.08, 0, 1) * (1 - e.rain * 0.9)
    sun.current.material.opacity = visible * low
    sunGlow.current.material.opacity = visible * (1 - low)
    sun.current.visible = sun.current.material.opacity > 0.01
    sunGlow.current.visible = sunGlow.current.material.opacity > 0.01
    v.set(-e.sunDir[0], -e.sunDir[1], -0.25).normalize().multiplyScalar(650)
    moon.current.position.copy(v)
    moon.current.lookAt(camera.position)
    moon.current.material.opacity = e.night * (1 - e.rain * 0.85)
    moon.current.visible = moon.current.material.opacity > 0.01

    // fog matches the horizon; rain pulls it in
    if (scene.fog) {
      scene.fog.color.copy(cols.horizon)
      scene.fog.near = THREE.MathUtils.lerp(140, 45, e.rain)
      scene.fog.far = THREE.MathUtils.lerp(600, 260, e.rain)
    }
    if (hemi.current) {
      hemi.current.color.copy(cols.mid).lerp(WHITE, 0.4)
      hemi.current.groundColor.set('#3a2e55')
      hemi.current.intensity = THREE.MathUtils.lerp(0.6, 0.22, e.night) * (1 - e.rain * 0.3) + e.flash * 1.5
    }
    const light = FX.sunLight
    if (light) {
      if (e.elev > -0.02) {
        light.color.copy(SUN_LOW).lerp(SUN_HIGH, THREE.MathUtils.clamp(e.elev / 0.45, 0, 1))
        light.intensity = THREE.MathUtils.lerp(1.6, 2.8, THREE.MathUtils.clamp(e.elev / 0.4, 0, 1)) * (1 - e.rain * 0.6)
      } else {
        light.color.copy(MOON)
        light.intensity = 0.45 * (1 - e.rain * 0.5)
      }
    }
    gl.toneMappingExposure = THREE.MathUtils.lerp(0.9, 0.95, e.night)
    if (FX.bloomPass) {
      FX.bloomPass.strength = THREE.MathUtils.lerp(0.5, 0.32, e.night)
      FX.bloomPass.threshold = THREE.MathUtils.lerp(1.05, 1.25, e.night)
    }
    scene.environmentIntensity = THREE.MathUtils.lerp(0.75, 0.35, e.night)

    // re-bake reflections when the sky changed noticeably
    env.t -= dt
    const key = Math.round(e.clock / 15) + ':' + Math.round(e.rain * 6)
    if (env.pmrem && env.t <= 0 && key !== env.last) {
      env.last = key
      env.t = 2
      const eu = env.envSky.uniforms
      for (const k of ['top', 'mid', 'horizon', 'sunDir', 'uNight', 'uRain']) {
        if (eu[k].value.copy) eu[k].value.copy(u[k].value)
        else eu[k].value = u[k].value
      }
      eu.uFlash.value = 0
      env.disc.position.fromArray(e.sunDir).multiplyScalar(45)
      env.disc.lookAt(0, 0, 0)
      env.disc.material.color.set(e.elev > 0 ? '#ffd28a' : '#9fb0ff').multiplyScalar(e.elev > 0 ? 6 * (1 - e.rain) : 1.5)
      const rt = env.pmrem.fromScene(env.envScene, 0.02)
      env.rt?.dispose()
      env.rt = rt
      scene.environment = rt.texture
    }
  })

  return (
    <>
      <fog attach="fog" args={['#ff8a7a', 140, 600]} />
      <hemisphereLight ref={hemi} args={['#ffc8e6', '#3a2e55', 0.55]} />
      <group ref={group}>
        <mesh material={sky} renderOrder={-2}>
          <sphereGeometry args={[800, 32, 16]} />
        </mesh>
        <mesh ref={sun} renderOrder={-1}>
          <planeGeometry args={[120, 120]} />
          <meshBasicMaterial map={tex.striped} color={glow('#ffffff', 0.7)} transparent fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={sunGlow} renderOrder={-1}>
          <planeGeometry args={[90, 90]} />
          <meshBasicMaterial map={tex.plain} color={glow('#fff6e0', 0.9)} transparent fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={moon} renderOrder={-1}>
          <planeGeometry args={[46, 46]} />
          <meshBasicMaterial map={tex.moon} color={glow('#ffffff', 0.5)} transparent fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <Rain G={G} />
    </>
  )
}
