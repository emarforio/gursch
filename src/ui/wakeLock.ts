import { useEffect } from 'react'
import { create } from 'zustand'

/** Kept on the device and never synced. Only an explicit "off" is stored, so the default is on. */
const KEY = 'gursch.v1.keepAwake'

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

function saved(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export const useKeepAwake = create<{ on: boolean }>(() => ({ on: saved() }))

export function setKeepAwake(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, '0')
  } catch {
    // Storage is blocked. The choice lasts until the page is closed.
  }
  useKeepAwake.setState({ on })
}

/**
 * Stops the screen from dimming and locking while `active` is true and the
 * setting is on. The browser drops the lock whenever the page is hidden, so it
 * is taken again each time the page comes back.
 */
export function useWakeLock(active: boolean) {
  const on = useKeepAwake((s) => s.on)
  useEffect(() => {
    if (!active || !on || !wakeLockSupported) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    async function acquire() {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        const taken = await navigator.wakeLock.request('screen')
        if (cancelled) void taken.release()
        else lock = taken
      } catch {
        // Refused, for example in battery saver mode. The screen then behaves as usual.
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [active, on])
}
