import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the service worker and keeps the installed app current. With
 * registerType 'autoUpdate' a new version takes over as soon as it has been
 * downloaded, and the page is then reloaded so the new UI shows straight away
 * instead of on the launch after. Scores entered but not yet saved are lost in
 * that reload; updates are rare enough for that to be acceptable.
 */
export function keepUpToDate() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {})
      }
      // On launch. The browser's own check after a page load can come late or not at all.
      check()
      // A phone keeps the app open in the background for days, so launching is
      // often only a return to view. Look for a new version then as well.
      document.addEventListener('visibilitychange', check)
    },
  })
}
