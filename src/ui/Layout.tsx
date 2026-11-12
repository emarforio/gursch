import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../data/store'
import { useT } from '../i18n'
import { Avatar } from './components/Avatar'
import { ImportBanner } from './components/ImportBanner'

export function Layout() {
  const user = useStore((s) => s.user)
  const loading = useStore((s) => s.loading)
  const t = useT()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const main = useRef<HTMLElement>(null)

  const pages = [
    { to: '/', label: t.nav.game },
    { to: '/history', label: t.nav.history },
    { to: '/stats', label: t.nav.stats },
    { to: '/players', label: t.nav.players },
    { to: '/rules', label: t.nav.rules },
  ]
  const userName = user && (user.name || t.account.signedIn)

  // Close the menu whenever the page changes.
  useEffect(() => setOpen(false), [location])

  // Name the page in the tab title, so tabs and screen readers can tell pages apart.
  const section = [...pages, { to: '/settings', label: t.nav.settings }].find((p) => p.to !== '/' && location.pathname.startsWith(p.to))
  useEffect(() => {
    document.title = section ? `${section.label} · Gursch` : 'Gursch'
  }, [section?.label])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="flex h-full flex-col">
      <a
        href="#main"
        onClick={(e) => {
          // Move focus without changing the address, which the router owns.
          e.preventDefault()
          main.current?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-text"
      >
        {t.nav.skip}
      </a>
      <header className="relative z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-4">
          <NavLink to="/" className="flex-1 text-lg font-bold">
            Gursch
          </NavLink>

          {/* Desktop: links in the header. */}
          <nav className="hidden items-center gap-1 sm:flex">
            {pages.map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                end={p.to === '/'}
                className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-accent' : 'text-muted'}`}
              >
                {p.label}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              aria-label={t.nav.settings}
              className={({ isActive }) => `ml-1 flex items-center px-1 text-sm font-medium ${isActive ? 'text-accent' : 'text-muted'}`}
            >
              {user ? <Avatar name={userName!} avatar={user.photo} size={30} /> : t.nav.settings}
            </NavLink>
          </nav>

          {/* Mobile: one menu button. */}
          <button
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg sm:hidden"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            aria-controls="menu"
            onClick={() => setOpen(!open)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <nav id="menu" className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-lg sm:hidden">
            {[...pages, { to: '/settings', label: t.nav.settings }].map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                end={p.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex h-13 items-center border-t border-line px-4 text-base font-medium ${isActive ? 'text-accent' : ''}`
                }
              >
                {p.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Tapping outside closes the menu. Keyboard users have the menu button and Escape. */}
      {open && <div className="fixed inset-0 z-10 bg-black/30 sm:hidden" aria-hidden onClick={() => setOpen(false)} />}

      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-3xl px-4 py-5">
          {loading ? (
            <p className="text-muted" role="status">
              {t.nav.loading}
            </p>
          ) : (
            <>
              <ImportBanner />
              <Outlet />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
