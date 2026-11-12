import type { ReactNode } from 'react'

/**
 * Holds a page's main action at the bottom of the screen, within reach of a
 * thumb. It stays in view while the page scrolls. The page's <section> must be
 * `flex flex-1 flex-col` so the bar is pushed down when the page is short.
 */
export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 -mx-4 -mb-5 mt-auto bg-bg px-4 pt-6 pb-4">{children}</div>
}
