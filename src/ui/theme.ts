import { create } from 'zustand'

export type ThemeChoice = 'auto' | 'light' | 'dark'

/** Kept on the device and never synced. index.html reads the same key before the first paint. */
const KEY = 'gursch.v1.theme'

/** Page background per theme, for the browser's own bars. Keep in step with --bg in index.css. */
const BAR = { light: '#f6f5f1', dark: '#17181a' }

function saved(): ThemeChoice {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

/** Automatic leaves the choice to the device's setting, through the media query in index.css. */
function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'auto') delete root.dataset.theme
  else root.dataset.theme = choice
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = BAR[choice === 'auto' ? own : choice]
  })
}

export const useTheme = create<{ choice: ThemeChoice }>(() => ({ choice: saved() }))

apply(useTheme.getState().choice)

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Storage is blocked. The choice lasts until the page is closed.
  }
  useTheme.setState({ choice })
  apply(choice)
}
