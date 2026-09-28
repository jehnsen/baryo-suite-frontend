import { useSyncExternalStore } from "react"

type Listener = () => void

export interface Store<S> {
  getState: () => S
  getInitialState: () => S
  setState: (updater: (prev: S) => S) => void
  subscribe: (listener: Listener) => () => void
}

/** Minimal external store. Swap for TanStack Query / server data when the API lands. */
export function createStore<S>(initial: S): Store<S> {
  let state = initial
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    getInitialState: () => initial,
    setState: (updater) => {
      state = updater(state)
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Subscribe to a slice. Selectors must return a stable reference
 * (e.g. `s => s.residents`) — derive computed values with useMemo.
 */
export function useStoreSelector<S, T>(store: Store<S>, selector: (s: S) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getInitialState()),
  )
}
