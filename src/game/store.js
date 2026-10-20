// Tiny external store so the HUD re-renders ~10x per second instead of every frame.
import { useSyncExternalStore } from 'react'

export function createStore(initial) {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set(next) {
      for (const k in next) {
        if (next[k] !== state[k]) {
          state = next
          subs.forEach((fn) => fn())
          return
        }
      }
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get)
}
