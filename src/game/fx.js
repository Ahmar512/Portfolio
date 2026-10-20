import * as THREE from 'three'

// Graphics quality, decided once when the game starts.
// With bloom on, emissive colours are pushed above 1.0 so only lights / neon glow.
export const FX = {
  bloom: true,
  glow: 3,
  bloomPass: null,
  sunLight: null,
  // user settings (see save.js); bump `version` after changing them so the scene re-applies
  settings: null,
  version: 0,
}

export function setQuality(high) {
  FX.bloom = high
  FX.glow = high ? 3 : 1
}

export function glow(color, k = 1) {
  return new THREE.Color(color).multiplyScalar(FX.glow * k)
}
